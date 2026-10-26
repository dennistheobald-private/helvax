-- Dennis decided (2026-10-26) that business hours and holidays aren't needed: the planner
-- now picks any day and any time in the company's time zone. The old window and day
-- columns stay in simulation_settings for existing data but are no longer used.

-- Plans simulations for [from_date, from_date + days) for every eligible employee. Each
-- person gets their own random day and time, at least cooldown_days apart, with the
-- scenario they've seen least recently. Returns how many were planned.
create or replace function private.plan_simulations(t uuid, from_date date, days integer default 30)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  cfg public.simulation_settings;
  tz text;
  emp record;
  want integer;
  have integer;
  n integer := 0;
  attempt integer;
  day date;
  at timestamptz;
  scen uuid;
begin
  select * into cfg from public.simulation_settings where tenant_id = t;
  select timezone into tz from public.tenants where id = t;
  want := greatest(1, round(cfg.per_employee_per_month * days / 30.0))::int;

  for emp in
    select e.* from public.employees e
    join public.company_domains d on d.tenant_id = e.tenant_id and d.domain = private.email_domain(e.email) and d.verified_at is not null
    where e.tenant_id = t and e.status = 'active' and e.consent_scope = 'standard' and not e.is_demo
  loop
    select count(*) into have from public.simulations
    where employee_id = emp.id and status not in ('cancelled')
      and scheduled_at >= (from_date::timestamp at time zone tz) and scheduled_at < ((from_date + days)::timestamp at time zone tz);

    while have < want loop
      at := null;
      for attempt in 1 .. 20 loop
        day := from_date + floor(random() * days)::int;
        at := (day + make_interval(secs => floor(random() * 86400))) at time zone tz;
        exit when at > now() and not exists (
          select 1 from public.simulations
          where employee_id = emp.id and status <> 'cancelled'
            and scheduled_at > at - make_interval(days => cfg.cooldown_days) and scheduled_at < at + make_interval(days => cfg.cooldown_days)
        );
        at := null;
      end loop;
      exit when at is null; -- no free slot in this period

      select s.id into scen
      from public.tenant_scenarios ts join public.scenarios s on s.id = ts.scenario_id
      left join lateral (
        select max(scheduled_at) as last_at from public.simulations x where x.employee_id = emp.id and x.scenario_id = s.id
      ) seen on true
      where ts.tenant_id = t and ts.enabled and s.approval_state = 'approved' and s.difficulty <= cfg.max_difficulty
      order by (emp.locale = any (s.locales)) desc, seen.last_at nulls first, random()
      limit 1;
      exit when scen is null;

      insert into public.simulations (tenant_id, employee_id, scenario_id, scheduled_at) values (t, emp.id, scen, at);
      have := have + 1;
      n := n + 1;
    end loop;
  end loop;
  return n;
end $$;
