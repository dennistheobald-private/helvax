-- Phase 7: the Helvax admin console. Superadmins with MFA see every company's
-- sending readiness and release it; nobody else can call these functions.

create function public.admin_tenants()
returns table (id uuid, name text, status public.tenant_status, created_at timestamptz, owners text[],
               members integer, employees integer, verified_domains text[], sending_enabled boolean,
               approved_at timestamptz, awareness_confirmed_at timestamptz, blockers text[],
               sent_30d integer, has_sample_data boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not (private.is_superadmin() and private.mfa_verified()) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  return query
  select t.id, t.name, t.status, t.created_at,
    array(select p.email::text from public.memberships m join public.profiles p on p.id = m.user_id
          where m.tenant_id = t.id and m.role = 'owner' order by p.email),
    (select count(*)::int from public.memberships m where m.tenant_id = t.id),
    (select count(*)::int from public.employees e where e.tenant_id = t.id and not e.is_demo and e.status = 'active'),
    array(select d.domain::text from public.company_domains d where d.tenant_id = t.id and d.verified_at is not null and not d.is_demo order by d.domain),
    coalesce((select s.sending_enabled from public.simulation_settings s where s.tenant_id = t.id), false),
    t.sending_approved_at, t.awareness_confirmed_at,
    private.sending_blockers(t.id),
    (select count(*)::int from public.simulations s where s.tenant_id = t.id and not s.is_demo and s.sent_at > now() - interval '30 days'),
    exists (select 1 from public.employees e where e.tenant_id = t.id and e.is_demo)
  from public.tenants t
  order by t.created_at desc;
end $$;

-- Platform-wide events (no company): who turned the platform switch on or off, and when.
create function public.admin_platform_log(max_rows integer default 50)
returns table (created_at timestamptz, action text, actor text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not (private.is_superadmin() and private.mfa_verified()) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  return query
  select a.created_at, a.action, coalesce(p.email::text, 'system')
  from public.audit_logs a left join public.profiles p on p.id = a.actor_id
  where a.tenant_id is null
  order by a.created_at desc
  limit least(greatest(max_rows, 1), 500);
end $$;

revoke execute on function public.admin_tenants(), public.admin_platform_log(integer) from public, anon;
grant execute on function public.admin_tenants(), public.admin_platform_log(integer) to authenticated;
