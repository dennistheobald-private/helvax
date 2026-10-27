-- Self-test: a platform superadmin can send one real simulation to their own account
-- email, to check delivery, the practice link and event logging end to end. Only the
-- service role can call it (the app's bearer-protected backend route), and only for a
-- superadmin's own address. It bypasses the sending switches and the verified-domain gate
-- for that one recipient; it never changes a switch. Additive only.

-- The employee-domain rule gets one narrow exception, set transaction-locally by the
-- function below. Clients can't set it: PostgREST only exposes the public schema.
create or replace function private.check_employee_domain() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('helvax.self_test', true) = 'on' then
    return new;
  end if;
  if not exists (
    select 1 from public.company_domains
    where tenant_id = new.tenant_id and domain = private.email_domain(new.email)
  ) then
    raise exception 'Only addresses on your company domain can be added (%).', private.email_domain(new.email)
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create function public.engine_self_test(superadmin uuid, slug text default null)
returns table (simulation_id uuid, tenant_id uuid, email text, first_name text, last_name text, locale text,
               scenario_slug text, subject text, sender_name text, preview text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  p public.profiles;
  t uuid;
  sc public.scenarios;
  emp uuid;
  sim uuid;
  first text;
  last text;
begin
  select * into p from public.profiles where id = superadmin and is_superadmin;
  if p.id is null then
    raise exception 'Self-tests are only for a platform superadmin.' using errcode = 'insufficient_privilege';
  end if;
  -- The superadmin's own company, so the result shows in their dashboard.
  select m.tenant_id into t from public.memberships m
  where m.user_id = p.id and m.role in ('owner', 'admin') order by m.created_at limit 1;
  if t is null then
    raise exception 'The superadmin has no company to log the self-test in.' using errcode = 'check_violation';
  end if;
  select * into sc from public.scenarios s
  where s.approval_state = 'approved' and (engine_self_test.slug is null or s.slug = engine_self_test.slug)
  order by case when engine_self_test.slug is null then random() else 0 end limit 1;
  if sc.id is null then
    raise exception 'No approved scenario %.', coalesce(engine_self_test.slug, '') using errcode = 'check_violation';
  end if;

  first := coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'Self');
  last := coalesce(nullif(trim(substr(trim(p.full_name), length(split_part(trim(p.full_name), ' ', 1)) + 1)), ''), 'Test');
  -- Paused and excluded, so the planner never schedules it and it's never billed.
  perform set_config('helvax.self_test', 'on', true);
  insert into public.employees (tenant_id, email, first_name, last_name, status, consent_scope)
  values (t, p.email, left(first, 80), left(last, 80), 'paused', 'excluded')
  on conflict (tenant_id, email) do nothing;
  perform set_config('helvax.self_test', 'off', true);
  select e.id into emp from public.employees e where e.tenant_id = t and e.email = p.email;

  insert into public.simulations (tenant_id, employee_id, scenario_id, scheduled_at, status)
  values (t, emp, sc.id, now(), 'queued') returning id into sim;
  insert into public.audit_logs (tenant_id, actor_id, action, target, metadata)
  values (t, p.id, 'engine.self_test', sim::text, jsonb_build_object('scenario', sc.slug));

  return query
  select sim, t, p.email::text, e.first_name, e.last_name, e.locale, sc.slug, sc.subject, sc.sender_name, sc.preview
  from public.employees e where e.id = emp;
end $$;
revoke execute on function public.engine_self_test(uuid, text) from public, anon, authenticated;
grant execute on function public.engine_self_test(uuid, text) to service_role;
