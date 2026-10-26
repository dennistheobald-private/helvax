-- Phase 6: monthly reports are built by the engine, frozen, and emailed once.

-- Real and sample data never mix in one report: a month with real simulations
-- reports only those; a month with none reports sample data (if loaded).
create or replace function private.build_report_snapshot(t uuid, period date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tz text;
  from_ts timestamptz;
  to_ts timestamptz;
  prev_from timestamptz;
  demo boolean;
  snapshot jsonb;
begin
  select timezone into tz from public.tenants where id = t;
  from_ts := (period::timestamp) at time zone tz;
  to_ts := ((period + interval '1 month')::timestamp) at time zone tz;
  prev_from := ((period - interval '1 month')::timestamp) at time zone tz;
  demo := not exists (
    select 1 from public.simulations
    where tenant_id = t and not is_demo and sent_at >= from_ts and sent_at < to_ts
  );

  with sims as (
    select s.id, s.employee_id, e.group_id, coalesce(o.result, 'pending') as result, coalesce(o.evidence_level, 0) as level
    from public.simulations s
    join public.employees e on e.id = s.employee_id
    left join public.outcomes o on o.simulation_id = s.id
    where s.tenant_id = t and s.is_demo = demo and s.sent_at >= from_ts and s.sent_at < to_ts
  ), prev as (
    select count(*) filter (where o.result not in ('not_delivered', 'pending')) as eligible,
           count(*) filter (where o.result = 'verified_risky') as risky
    from public.simulations s left join public.outcomes o on o.simulation_id = s.id
    where s.tenant_id = t and s.is_demo = demo and s.sent_at >= prev_from and s.sent_at < from_ts
  ), groups as (
    select coalesce(g.name, 'No group') as name,
           count(*) filter (where sims.result not in ('not_delivered', 'pending')) as eligible,
           count(*) filter (where sims.result = 'verified_risky') as risky,
           count(*) filter (where sims.result = 'verified_safe') as safe
    from sims left join public.employee_groups g on g.id = sims.group_id
    group by g.name
  )
  select jsonb_build_object(
    'period', to_char(period, 'YYYY-MM'),
    'timezone', tz,
    'rule_version', 'v1',
    'sample_data', demo,
    'employees_targeted', (select count(distinct employee_id) from sims),
    'simulations_sent', (select count(*) from sims),
    'eligible', (select count(*) from sims where result not in ('not_delivered', 'pending')),
    'link_requests', (select count(distinct ev.simulation_id) from public.events ev join sims on sims.id = ev.simulation_id where ev.type in ('link_request', 'qr_request')),
    'outcomes', jsonb_build_object(
      'verified_risky', (select count(*) from sims where result = 'verified_risky'),
      'suspected', (select count(*) from sims where result = 'suspected'),
      'inconclusive', (select count(*) from sims where result = 'inconclusive'),
      'scanner_only', (select count(*) from sims where result = 'scanner_only'),
      'verified_safe', (select count(*) from sims where result = 'verified_safe'),
      'no_interaction', (select count(*) from sims where result = 'no_interaction'),
      'pending', (select count(*) from sims where result = 'pending'),
      'not_delivered', (select count(*) from sims where result = 'not_delivered')
    ),
    'levels', jsonb_build_object(
      'l3', (select count(*) from sims where result = 'verified_risky' and level = 3),
      'l4', (select count(*) from sims where result = 'verified_risky' and level = 4)
    ),
    'previous', (select jsonb_build_object('eligible', eligible, 'verified_risky', risky) from prev),
    'groups', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'eligible', eligible, 'verified_risky', risky, 'verified_safe', safe) order by name) from groups), '[]'::jsonb)
  ) into snapshot;
  return snapshot;
end $$;

-- A sent report is a record: its contents never change, and it is sent only once.
create function private.freeze_report() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.tenant_id <> old.tenant_id or new.period <> old.period or new.snapshot <> old.snapshot
     or new.is_demo <> old.is_demo or new.created_at <> old.created_at
     or (old.sent_at is not null and new.sent_at is distinct from old.sent_at) then
    raise exception 'Reports are frozen once created.' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger reports_frozen before update on public.reports
  for each row execute function private.freeze_report();

-- Builds last month's report for each company that sent real simulations in it.
-- Waits until the 4th of the month (local time) so the 72-hour observation window
-- of the last simulations has closed. A sample report for the same month is replaced.
create function public.engine_build_reports(as_of timestamptz default now()) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  t record;
  local_now timestamp;
  m date;
  n integer := 0;
begin
  for t in select id, timezone from public.tenants where status <> 'closed' loop
    local_now := as_of at time zone t.timezone;
    if extract(day from local_now) < 4 then
      continue;
    end if;
    m := (date_trunc('month', local_now) - interval '1 month')::date;
    if exists (select 1 from public.reports where tenant_id = t.id and period = m and not is_demo) then
      continue;
    end if;
    if not exists (
      select 1 from public.simulations
      where tenant_id = t.id and not is_demo
        and sent_at >= (m::timestamp) at time zone t.timezone
        and sent_at < ((m + interval '1 month')::timestamp) at time zone t.timezone
    ) then
      continue;
    end if;
    delete from public.reports where tenant_id = t.id and period = m and is_demo;
    insert into public.reports (tenant_id, period, snapshot)
    values (t.id, m, private.build_report_snapshot(t.id, m));
    perform private.audit(t.id, 'report.created', to_char(m, 'YYYY-MM'), '{}'::jsonb);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Real reports from the last 30 days that haven't been emailed, with the owners and
-- admins who receive them.
create function public.engine_reports_to_send()
returns table (report_id uuid, tenant_id uuid, tenant_name text, period date, snapshot jsonb, recipients text[])
language sql stable security definer set search_path = '' as $$
  select r.id, r.tenant_id, tn.name, r.period, r.snapshot,
         array(select p.email::text from public.memberships m join public.profiles p on p.id = m.user_id
               where m.tenant_id = r.tenant_id and m.role in ('owner', 'admin') order by p.email)
  from public.reports r join public.tenants tn on tn.id = r.tenant_id
  where not r.is_demo and r.sent_at is null and r.created_at > now() - interval '30 days'
  order by r.created_at
$$;

create function public.engine_mark_report_sent(report uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare t uuid;
begin
  update public.reports set sent_at = now() where id = report and sent_at is null and not is_demo
  returning tenant_id into t;
  if t is not null then
    perform private.audit(t, 'report.sent', report::text, '{}'::jsonb);
  end if;
end $$;

revoke execute on function public.engine_build_reports(timestamptz), public.engine_reports_to_send(), public.engine_mark_report_sent(uuid)
  from public, anon, authenticated;
grant execute on function public.engine_build_reports(timestamptz), public.engine_reports_to_send(), public.engine_mark_report_sent(uuid)
  to service_role;
