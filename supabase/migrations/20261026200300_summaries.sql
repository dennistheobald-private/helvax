-- Read-only summaries for the dashboard. They run with the caller's rights, so row
-- level security limits them to companies the caller belongs to.

-- Outcome counts for simulations sent in [since, until). Eligible = delivered and no
-- longer inside the observation window; the Verified Risky Action Rate divides by it.
create function public.outcome_summary(t uuid, since timestamptz, until timestamptz default now())
returns jsonb language sql stable security invoker set search_path = '' as $$
  with sims as (
    select coalesce(o.result, 'pending') as result
    from public.simulations s left join public.outcomes o on o.simulation_id = s.id
    where s.tenant_id = t and s.sent_at >= since and s.sent_at < until
  )
  select jsonb_build_object(
    'sent', (select count(*) from sims),
    'eligible', (select count(*) from sims where result not in ('not_delivered', 'pending')),
    'outcomes', coalesce((select jsonb_object_agg(result, n) from (select result, count(*) as n from sims group by result) x), '{}'::jsonb)
  )
$$;

-- Per-employee totals across all simulations.
create function public.employee_stats(t uuid)
returns table (employee_id uuid, simulations bigint, verified_risky bigint, verified_safe bigint, last_sent_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select s.employee_id, count(*),
         count(*) filter (where o.result = 'verified_risky'),
         count(*) filter (where o.result = 'verified_safe'),
         max(s.sent_at)
  from public.simulations s left join public.outcomes o on o.simulation_id = s.id
  where s.tenant_id = t
  group by s.employee_id
$$;

revoke execute on function public.outcome_summary(uuid, timestamptz, timestamptz), public.employee_stats(uuid) from public, anon;
grant execute on function public.outcome_summary(uuid, timestamptz, timestamptz), public.employee_stats(uuid) to authenticated;
