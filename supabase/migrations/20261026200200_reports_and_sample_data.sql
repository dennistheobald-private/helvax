-- Monthly report snapshots and the optional sample data that lets a new company
-- explore the dashboard before any real simulation is sent.

-- Report snapshot ---------------------------------------------------------------
-- Aggregates one calendar month (in the tenant's time zone) into a frozen JSON document.
-- The headline KPI is the verified risky action rate: verified risky outcomes divided by
-- eligible (delivered) simulations. Link requests are reported but never count.
create function private.build_report_snapshot(t uuid, period date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tz text;
  from_ts timestamptz;
  to_ts timestamptz;
  prev_from timestamptz;
  snapshot jsonb;
begin
  select timezone into tz from public.tenants where id = t;
  from_ts := (period::timestamp) at time zone tz;
  to_ts := ((period + interval '1 month')::timestamp) at time zone tz;
  prev_from := ((period - interval '1 month')::timestamp) at time zone tz;

  with sims as (
    select s.id, s.employee_id, e.group_id, coalesce(o.result, 'pending') as result, coalesce(o.evidence_level, 0) as level
    from public.simulations s
    join public.employees e on e.id = s.employee_id
    left join public.outcomes o on o.simulation_id = s.id
    where s.tenant_id = t and s.sent_at >= from_ts and s.sent_at < to_ts
  ), prev as (
    select count(*) filter (where o.result not in ('not_delivered', 'pending')) as eligible,
           count(*) filter (where o.result = 'verified_risky') as risky
    from public.simulations s left join public.outcomes o on o.simulation_id = s.id
    where s.tenant_id = t and s.sent_at >= prev_from and s.sent_at < from_ts
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

-- Sample data -------------------------------------------------------------------

create function public.load_sample_data(t uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  first_names text[] := array['Anna','Ben','Clara','David','Elena','Felix','Greta','Hannah','Ivan','Julia','Karim','Lea','Marco','Nina','Oliver','Paula','Quentin','Rosa','Simon','Tara','Urs','Vera','Wim','Yara'];
  last_names text[] := array['Albers','Brunner','Caduff','Dietrich','Egger','Fischer','Graf','Huber','Imhof','Jost','Keller','Lehmann','Meier','Novak','Odermatt','Peters','Roth','Steiner','Tanner','Vogel','Weber','Zollinger'];
  group_names text[] := array['Finance','Sales','Operations','HR','IT','Management'];
  actions jsonb := '{"credential_form":"login","phishing":"login","document_link":"document_access","qr_phishing":"account_verification","supplier_fraud":"bank_change","executive_impersonation":"payment_approval"}';
  demo_domain text;
  g uuid[];
  gid uuid;
  emp record;
  scen record;
  sim_id uuid;
  sess uuid;
  ev_id uuid;
  sent timestamptz;
  i integer;
  k integer;
  age_days numeric;
  p numeric;
  r numeric;
  human boolean;
  reply_cat public.reply_category;
  m date;
begin
  if not private.is_admin(t) then
    raise exception 'Only admins can load sample data.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.employees where tenant_id = t and is_demo) then
    return;
  end if;

  perform setseed(0.42);
  -- Sample people live on a reserved .example domain, which can never receive email.
  demo_domain := 'sample-' || substr(t::text, 1, 8) || '.example';
  insert into public.company_domains (tenant_id, domain, is_demo) values (t, demo_domain, true) on conflict do nothing;

  for i in 1 .. array_length(group_names, 1) loop
    insert into public.employee_groups (tenant_id, name, is_demo) values (t, group_names[i], true)
    on conflict (tenant_id, name) do update set name = excluded.name
    returning id into gid;
    g := g || gid;
  end loop;

  for i in 1 .. 48 loop
    insert into public.employees (tenant_id, email, first_name, last_name, group_id, locale, status, is_demo)
    values (
      t,
      lower(first_names[1 + (i - 1) % 24] || '.' || last_names[1 + (i * 7) % 22]) || '@' || demo_domain,
      first_names[1 + (i - 1) % 24], last_names[1 + (i * 7) % 22],
      g[1 + (i - 1) % 6],
      case when i % 3 = 0 then 'en' else 'de' end,
      case when i = 47 then 'paused'::public.employee_status when i = 48 then 'left'::public.employee_status else 'active'::public.employee_status end,
      true
    ) on conflict (tenant_id, email) do nothing;
  end loop;

  -- About five simulations per person over the last 120 days. People improve over time.
  for emp in select e.id, (select name from public.employee_groups where id = e.group_id) as grp
             from public.employees e where e.tenant_id = t and e.is_demo and e.status <> 'left' loop
    for k in 1 .. 5 loop
      select * into scen from public.scenarios where approval_state = 'approved' order by random() limit 1;
      age_days := 1 + random() * 119;
      sent := date_trunc('day', now() - make_interval(days => age_days::int)) + make_interval(hours => 8 + (random() * 8)::int, mins => (random() * 59)::int);
      insert into public.simulations (tenant_id, employee_id, scenario_id, scheduled_at, sent_at, status, is_demo)
      values (t, emp.id, scen.id, sent, sent, case when random() < 0.022 then 'bounced'::public.simulation_status else 'accepted'::public.simulation_status end, true)
      returning id into sim_id;

      if (select status from public.simulations where id = sim_id) = 'bounced' then
        insert into public.events (tenant_id, simulation_id, type, evidence_level, actor, occurred_at, source, is_demo)
        values (t, sim_id, 'bounced', 0, 'unknown', sent + interval '20 seconds', 'provider', true);
        perform private.decide_outcome(sim_id);
        continue;
      end if;
      insert into public.events (tenant_id, simulation_id, type, evidence_level, actor, occurred_at, source, is_demo)
      values (t, sim_id, 'accepted', 0, 'unknown', sent + interval '4 seconds', 'provider', true);

      -- Mail security scanners request links within seconds, from vendor networks.
      if random() < 0.32 then
        insert into public.landing_sessions (tenant_id, simulation_id, started_at, user_agent_family, network_class, js_executed, pointer_events, is_demo)
        values (t, sim_id, sent + interval '6 seconds', 'Headless Chrome', 'security_vendor', false, 0, true) returning id into sess;
        insert into public.events (tenant_id, simulation_id, session_id, type, evidence_level, actor, occurred_at, source, signals, is_demo)
        values (t, sim_id, sess, 'link_request', 1, 'scanner', sent + make_interval(secs => 3 + (random() * 20)::int), 'landing',
                '{"seconds_after_send": 8, "network": "security_vendor", "js": false}', true);
      end if;

      p := 0.04 + 0.10 * (age_days / 120) + case emp.grp when 'Finance' then 0.05 when 'Sales' then 0.03 when 'IT' then -0.02 else 0 end;
      r := random();

      if scen.category in ('supplier_fraud', 'executive_impersonation') and r < p + 0.10 then
        -- Replies to fraud scenarios, classified by the reply classifier.
        insert into public.events (tenant_id, simulation_id, type, evidence_level, actor, occurred_at, source, signals, is_demo)
        values (t, sim_id, 'reply', 2, 'human_likely', sent + make_interval(mins => 5 + (random() * 240)::int), 'inbound',
                '{"reply_token": "matched", "in_reply_to": "matched"}', true)
        returning id into ev_id;
        r := random();
        reply_cat := case
          when r < 0.28 + case emp.grp when 'Finance' then 0.12 else 0 end then 'risky_intent'
          when r < 0.68 then 'verification'
          when r < 0.80 then 'refusal'
          when r < 0.92 then 'neutral'
          else 'ambiguous' end;
        insert into public.reply_analyses (tenant_id, event_id, category, confidence, rule_hits, marker_found, classifier_version, excerpt, reviewer_status, reviewed_category, reviewed_at, is_demo)
        values (t, ev_id, reply_cat, round((0.62 + random() * 0.36)::numeric, 2),
          case reply_cat when 'risky_intent' then '{agrees_to_request}' when 'verification' then '{asks_to_verify}' when 'refusal' then '{declines_request}' else '{}' end::text[],
          reply_cat = 'risky_intent' and random() < 0.5,
          'rules-v1+llm-2026-10',
          case reply_cat
            when 'risky_intent' then 'Sure, I can update the details today. Which account should I use?'
            when 'verification' then 'I''ll call you on your usual number to confirm before I do anything.'
            when 'refusal' then 'This doesn''t look right, I won''t process it.'
            when 'neutral' then 'Thanks, I''m out of office until Monday.'
            else 'Can you send more details?' end,
          case when reply_cat = 'risky_intent' and random() < 0.6 then 'confirmed'::public.review_status
               when reply_cat in ('risky_intent', 'ambiguous') then 'pending'::public.review_status
               else 'not_needed'::public.review_status end,
          case when reply_cat = 'risky_intent' then reply_cat end,
          case when reply_cat = 'risky_intent' then sent + interval '1 day' end,
          true);
        -- Pending reviews must not carry a reviewed category.
        update public.reply_analyses set reviewed_category = null, reviewed_at = null
        where event_id = ev_id and reviewer_status <> 'confirmed';

      elsif r < p * 2.2 then
        -- A browser session: link request, sometimes a deliberate click, sometimes the completed action.
        human := random() < 0.85;
        insert into public.landing_sessions (tenant_id, simulation_id, started_at, user_agent_family, network_class, js_executed, pointer_events, is_demo)
        values (t, sim_id, sent + make_interval(mins => 2 + (random() * 300)::int),
                case when human then 'Chrome' else 'Unknown' end,
                case when human then (case when random() < 0.7 then 'corporate' else 'residential' end) else 'unknown' end,
                human, case when human then 3 + (random() * 20)::int else 0 end, true)
        returning id into sess;
        insert into public.events (tenant_id, simulation_id, session_id, type, evidence_level, actor, occurred_at, source, signals, is_demo)
        values (t, sim_id, sess, case when scen.category = 'qr_phishing' then 'qr_request'::public.event_type else 'link_request'::public.event_type end,
                1, case when human then 'human_likely'::public.event_actor else 'unknown'::public.event_actor end,
                sent + make_interval(mins => 3 + (random() * 300)::int), 'landing', '{"token": "valid"}', true);
        if random() < 0.55 then
          insert into public.events (tenant_id, simulation_id, session_id, type, evidence_level, actor, occurred_at, source, signals, is_demo)
          values (t, sim_id, sess, 'page_interaction', 2, case when human then 'human_likely'::public.event_actor else 'unknown'::public.event_actor end,
                  sent + make_interval(mins => 6 + (random() * 300)::int), 'landing', '{"control": "continue"}', true);
          if random() < 0.5 then
            insert into public.events (tenant_id, simulation_id, session_id, type, evidence_level, actor, occurred_at, source, action, signals, is_demo)
            values (t, sim_id, sess, 'action_completed', 3, case when human then 'human_likely'::public.event_actor else 'unknown'::public.event_actor end,
                    sent + make_interval(mins => 8 + (random() * 300)::int), 'landing', actions ->> scen.category::text, '{"fields": "synthetic"}', true);
            insert into public.events (tenant_id, simulation_id, session_id, type, evidence_level, actor, occurred_at, source, is_demo)
            values (t, sim_id, sess, 'training_completed', 0, 'human_likely', sent + make_interval(mins => 12 + (random() * 300)::int), 'landing', true);
          end if;
        end if;
      end if;

      perform private.decide_outcome(sim_id);
    end loop;
  end loop;

  -- Snapshots for the last three full months.
  for i in 1 .. 3 loop
    m := (date_trunc('month', now() at time zone (select timezone from public.tenants where id = t)) - make_interval(months => i))::date;
    insert into public.reports (tenant_id, period, snapshot, created_at, sent_at, is_demo)
    values (t, m, private.build_report_snapshot(t, m), m + interval '1 month 6 hours', m + interval '1 month 7 hours', true)
    on conflict (tenant_id, period) do nothing;
  end loop;

  perform private.audit(t, 'sample_data.loaded', null, '{}'::jsonb);
end $$;

create function public.clear_sample_data(t uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin(t) then
    raise exception 'Only admins can remove sample data.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.reports where tenant_id = t and is_demo;
  delete from public.employees where tenant_id = t and is_demo;  -- cascades to simulations, events, analyses
  delete from public.employee_groups where tenant_id = t and is_demo and not exists (
    select 1 from public.employees e where e.group_id = employee_groups.id
  );
  delete from public.company_domains where tenant_id = t and is_demo;
  perform private.audit(t, 'sample_data.cleared', null, '{}'::jsonb);
end $$;

revoke execute on function public.load_sample_data(uuid), public.clear_sample_data(uuid) from public, anon;
grant execute on function public.load_sample_data(uuid), public.clear_sample_data(uuid) to authenticated;
revoke execute on function private.build_report_snapshot(uuid, date) from public, authenticated;
