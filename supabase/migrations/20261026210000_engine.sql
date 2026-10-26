-- Simulation engine and safety controls. Nothing is sent unless every switch is on:
--   1. the platform switch (Helvax superadmins, off by default),
--   2. Helvax's approval of the company after the safety review,
--   3. the company owner's confirmation that employees were informed,
--   4. the company's own switch (owner with MFA turns it on; any admin can turn it off),
-- and, for each message, an active employee on a verified domain who isn't suppressed,
-- with an approved scenario the company has turned on.
-- The engine runs on the server with the service role; engine_* functions are not
-- callable from the browser.


-- Rules v1 fix: the provider's delivery events are automated too, but they are not
-- activity on the link. Only link and page events count as scanner activity.
create or replace function private.decide_outcome(sim uuid, observation_hours integer default 72)
returns public.outcome_decisions
language plpgsql security definer set search_path = '' as $$
declare
  s public.simulations;
  rule_version constant text := 'v1';
  result public.outcome_result;
  level smallint := 0;
  why text;
  ids uuid[] := '{}';
  -- evidence
  human_action record;
  unknown_action record;
  human_click record;
  reply record;
  any_activity boolean;
  scanner_count integer;
  current public.outcomes;
  d public.outcome_decisions;
begin
  select * into s from public.simulations where id = sim;
  if s.id is null then
    raise exception 'Unknown simulation %', sim;
  end if;

  select count(*) into scanner_count from public.events
  where simulation_id = sim and actor in ('scanner', 'automation')
    and type in ('link_request', 'qr_request', 'page_interaction', 'action_completed');

  -- L3 by a likely human in a corroborated session (JavaScript ran, pointer input, not a
  -- datacenter or security-vendor network).
  select e.id, e.session_id, e.action into human_action
  from public.events e join public.landing_sessions ls on ls.id = e.session_id
  where e.simulation_id = sim and e.type = 'action_completed' and e.actor = 'human_likely'
    and ls.js_executed and ls.pointer_events > 0
    and coalesce(ls.network_class, 'unknown') not in ('datacenter', 'security_vendor')
  order by e.occurred_at limit 1;

  -- L3 that we can't attribute to a person with confidence.
  select e.id, e.action into unknown_action
  from public.events e
  where e.simulation_id = sim and e.type = 'action_completed' and e.actor in ('human_likely', 'unknown')
    and e.id is distinct from human_action.id
  order by e.occurred_at limit 1;

  -- L2 deliberate interaction in the same session as the action (independent corroboration).
  if human_action.id is not null then
    select e.id into human_click from public.events e
    where e.simulation_id = sim and e.session_id = human_action.session_id
      and e.type = 'page_interaction' and e.actor = 'human_likely'
    limit 1;
  end if;

  -- The reply analysis, using a reviewer's decision when there is one.
  select e.id as event_id, ra.marker_found, ra.confidence,
         case when ra.reviewer_status in ('confirmed', 'overridden') then coalesce(ra.reviewed_category, ra.category) else ra.category end as category,
         ra.reviewer_status in ('confirmed', 'overridden') as reviewed
  into reply
  from public.events e join public.reply_analyses ra on ra.event_id = e.id
  where e.simulation_id = sim and e.type = 'reply'
  order by e.occurred_at desc limit 1;

  select exists (
    select 1 from public.events
    where simulation_id = sim and actor in ('human_likely', 'unknown')
      and type in ('link_request', 'qr_request', 'page_interaction', 'action_completed', 'reply')
  ) into any_activity;

  if s.status in ('bounced', 'failed') then
    result := 'not_delivered'; level := 0;
    why := 'The message was not delivered.';

  elsif reply.event_id is not null and reply.category = 'risky_intent' and reply.reviewed then
    result := 'verified_risky';
    level := case when reply.marker_found or human_action.id is not null then 4 else 3 end;
    ids := array[reply.event_id] || coalesce(array[human_action.id], '{}');
    why := 'A reply agreed to the risky request and a reviewer confirmed it'
      || case when reply.marker_found then ', and it contained the synthetic test marker.' else '.' end;

  elsif human_action.id is not null then
    result := 'verified_risky';
    level := case when human_click.id is not null then 4 else 3 end;
    ids := array[human_action.id] || coalesce(array[human_click.id], '{}');
    why := format('Completed the simulated %s in one browser session with signs of a real person (JavaScript, pointer input, regular network)%s.',
      coalesce(replace(human_action.action, '_', ' '), 'action'),
      case when human_click.id is not null then ', after a deliberate click in the same session' else '' end);

  elsif reply.event_id is not null and reply.category = 'risky_intent' then
    result := 'suspected'; level := 3;
    ids := array[reply.event_id];
    why := format('A reply looks like it agreed to the risky request (confidence %s). It waits for review before it counts.', reply.confidence);

  elsif unknown_action.id is not null then
    result := 'suspected'; level := 3;
    ids := array[unknown_action.id];
    why := 'The simulated action was completed, but the session lacks enough signs of a real person to verify it.';

  elsif reply.event_id is not null and reply.category in ('verification', 'refusal') and (reply.reviewed or reply.confidence >= 0.8) then
    result := 'verified_safe'; level := 0;
    ids := array[reply.event_id];
    why := case reply.category when 'verification' then 'Replied to verify the request through another channel.' else 'Replied refusing the request.' end;

  elsif any_activity or (reply.event_id is not null and reply.category = 'ambiguous') then
    result := 'inconclusive';
    select coalesce(max(evidence_level), 1), coalesce(array_agg(id), '{}') into level, ids from public.events
    where simulation_id = sim and actor in ('human_likely', 'unknown') and type in ('link_request', 'qr_request', 'page_interaction', 'reply');
    level := least(level, 2);
    why := 'There was some activity, such as a link request or a click, but no completed risky action. The evidence is not enough to call it either way.';

  elsif scanner_count > 0 then
    result := 'scanner_only'; level := 1;
    select coalesce(array_agg(id), '{}') into ids from public.events where simulation_id = sim and actor in ('scanner', 'automation')
      and type in ('link_request', 'qr_request', 'page_interaction', 'action_completed');
    why := format('Only automated activity was seen (%s request%s from mail scanners or automated browsers).', scanner_count, case when scanner_count = 1 then '' else 's' end);

  elsif s.sent_at is not null and s.sent_at > now() - make_interval(hours => observation_hours) then
    result := 'pending'; level := 0;
    why := 'Still inside the observation window.';

  else
    result := 'no_interaction'; level := 0;
    why := 'Delivered, with no activity seen. This is not proof of safe behaviour.';
  end if;

  -- Only record a new decision when something changed.
  select * into current from public.outcomes where simulation_id = sim;
  if current.simulation_id is not null and current.result = result and current.evidence_level = level then
    select * into d from public.outcome_decisions where id = current.decision_id;
    return d;
  end if;

  insert into public.outcome_decisions (tenant_id, simulation_id, result, evidence_level, rule_version, evidence_event_ids, explanation, is_demo)
  values (s.tenant_id, sim, result, level, rule_version, ids, why, s.is_demo)
  returning * into d;
  return d;
end $$;
revoke execute on function private.decide_outcome(uuid, integer) from public, authenticated;

-- Switches -------------------------------------------------------------------------

create table public.platform_settings (
  id boolean primary key default true check (id),
  sending_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.platform_settings default values;
alter table public.platform_settings enable row level security;
create policy "signed-in users read" on public.platform_settings for select to authenticated using (true);
revoke all on public.platform_settings from anon;
revoke insert, update, delete on public.platform_settings from authenticated;

-- Only server-side functions set these; the client's column grants on tenants don't include them.
alter table public.tenants
  add column awareness_confirmed_at timestamptz,
  add column sending_approved_at timestamptz;

-- Why a company can't send yet. Empty means ready.
create function private.sending_blockers(t uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select array_remove(array[
    case when not (select sending_enabled from public.platform_settings) then 'platform_off' end,
    case when (select sending_approved_at from public.tenants where id = t) is null then 'not_approved' end,
    case when (select awareness_confirmed_at from public.tenants where id = t) is null then 'awareness_not_confirmed' end,
    case when not exists (select 1 from public.company_domains where tenant_id = t and verified_at is not null and not is_demo) then 'no_verified_domain' end,
    case when not exists (
      select 1 from public.tenant_scenarios ts join public.scenarios s on s.id = ts.scenario_id
      where ts.tenant_id = t and ts.enabled and s.approval_state = 'approved'
    ) then 'no_scenarios' end,
    case when not exists (
      select 1 from public.employees e
      join public.company_domains d on d.tenant_id = e.tenant_id and d.domain = private.email_domain(e.email) and d.verified_at is not null
      where e.tenant_id = t and e.status = 'active' and e.consent_scope = 'standard' and not e.is_demo
    ) then 'no_eligible_employees' end,
    -- Real results and sample data must never mix.
    case when exists (select 1 from public.employees where tenant_id = t and is_demo) then 'sample_data_loaded' end
  ], null)
$$;
revoke execute on function private.sending_blockers(uuid) from public;

create function public.sending_readiness(t uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (private.is_member(t) or private.is_superadmin()) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'sending_enabled', (select sending_enabled from public.simulation_settings where tenant_id = t),
    'platform_enabled', (select sending_enabled from public.platform_settings),
    'approved_at', (select sending_approved_at from public.tenants where id = t),
    'awareness_confirmed_at', (select awareness_confirmed_at from public.tenants where id = t),
    'blockers', to_jsonb(private.sending_blockers(t)),
    'planned', (select count(*) from public.simulations where tenant_id = t and status = 'planned' and not is_demo)
  );
end $$;

-- The owner confirms employees were told about awareness simulations.
create function public.confirm_awareness_notice(t uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_owner(t) then
    raise exception 'Only an owner with MFA can confirm this.' using errcode = 'insufficient_privilege';
  end if;
  update public.tenants set awareness_confirmed_at = now() where id = t;
  perform private.audit(t, 'sending.awareness_confirmed', null, '{}'::jsonb);
end $$;

create function public.set_sending_enabled(t uuid, enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  blockers text[];
begin
  if enabled then
    if not private.is_owner(t) then
      raise exception 'Only an owner with MFA can turn sending on.' using errcode = 'insufficient_privilege';
    end if;
    blockers := private.sending_blockers(t);
    if cardinality(blockers) > 0 then
      raise exception 'Sending can''t be turned on yet: %.', array_to_string(blockers, ', ') using errcode = 'check_violation';
    end if;
  elsif not private.is_admin(t) then
    raise exception 'Only admins can turn sending off.' using errcode = 'insufficient_privilege';
  end if;
  update public.simulation_settings set sending_enabled = enabled where tenant_id = t;
  -- Turning off also drops what was planned, so nothing goes out later by surprise.
  if not enabled then
    update public.simulations set status = 'cancelled' where tenant_id = t and status in ('planned', 'queued');
  end if;
  perform private.audit(t, case when enabled then 'sending.enabled' else 'sending.disabled' end, null, '{}'::jsonb);
end $$;

-- Platform controls (Helvax superadmins with MFA).
create function public.set_platform_sending(enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (private.is_superadmin() and private.mfa_verified()) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  update public.platform_settings set sending_enabled = enabled, updated_at = now(), updated_by = auth.uid();
  if not enabled then
    update public.simulations set status = 'planned' where status = 'queued';
  end if;
  perform private.audit(null, case when enabled then 'platform.sending_enabled' else 'platform.sending_disabled' end, null, '{}'::jsonb);
end $$;

create function public.approve_tenant_sending(t uuid, approved boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (private.is_superadmin() and private.mfa_verified()) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  update public.tenants set sending_approved_at = case when approved then now() end where id = t;
  if not approved then
    update public.simulation_settings set sending_enabled = false where tenant_id = t;
    update public.simulations set status = 'cancelled' where tenant_id = t and status in ('planned', 'queued');
  end if;
  perform private.audit(t, case when approved then 'sending.approved' else 'sending.approval_revoked' end, null, '{}'::jsonb);
end $$;

revoke execute on function public.sending_readiness(uuid), public.confirm_awareness_notice(uuid),
  public.set_sending_enabled(uuid, boolean), public.set_platform_sending(boolean), public.approve_tenant_sending(uuid, boolean) from public, anon;
grant execute on function public.sending_readiness(uuid), public.confirm_awareness_notice(uuid),
  public.set_sending_enabled(uuid, boolean), public.set_platform_sending(boolean), public.approve_tenant_sending(uuid, boolean) to authenticated;

-- Planner ----------------------------------------------------------------------------

-- Plans simulations for [from_date, from_date + days) for every eligible employee. Each
-- person gets their own random day and time inside the schedule, at least cooldown_days
-- apart, with the scenario they've seen least recently. Returns how many were planned.
create function private.plan_simulations(t uuid, from_date date, days integer default 30)
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
        continue when not (extract(isodow from day)::smallint = any (cfg.business_days));
        at := (day + cfg.window_start + make_interval(secs => floor(random() * extract(epoch from cfg.window_end - cfg.window_start)))) at time zone tz;
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
revoke execute on function private.plan_simulations(uuid, date, integer) from public, authenticated;

-- Engine API (service role only) ------------------------------------------------------

-- Plans the next 30 days for every company that is allowed to send.
create function public.engine_plan_all() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
  n integer := 0;
begin
  for t in
    select s.tenant_id from public.simulation_settings s
    where s.sending_enabled and cardinality(private.sending_blockers(s.tenant_id)) = 0
  loop
    n := n + private.plan_simulations(t, (now() at time zone (select timezone from public.tenants where id = t))::date, 30);
  end loop;
  return n;
end $$;

-- Claims simulations that are due and still pass every check, marking them queued.
create function public.engine_claim_due(max_count integer default 50)
returns table (simulation_id uuid, tenant_id uuid, email text, first_name text, last_name text, locale text,
               scenario_slug text, subject text, sender_name text, preview text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not (select sending_enabled from public.platform_settings) then
    return;
  end if;
  -- Anything more than a day overdue is dropped rather than sent late.
  update public.simulations set status = 'cancelled' where status = 'planned' and scheduled_at < now() - interval '1 day';

  return query
  with due as (
    select s.id from public.simulations s
    join public.employees e on e.id = s.employee_id
    join public.tenants tn on tn.id = s.tenant_id
    join public.simulation_settings ss on ss.tenant_id = s.tenant_id
    join public.tenant_scenarios ts on ts.tenant_id = s.tenant_id and ts.scenario_id = s.scenario_id
    join public.scenarios sc on sc.id = s.scenario_id
    where s.status = 'planned' and s.scheduled_at <= now() and not s.is_demo
      and ss.sending_enabled and tn.sending_approved_at is not null and tn.awareness_confirmed_at is not null
      and ts.enabled and sc.approval_state = 'approved'
      and e.status = 'active' and e.consent_scope = 'standard' and not e.is_demo
      and exists (select 1 from public.company_domains d where d.tenant_id = s.tenant_id and d.domain = private.email_domain(e.email) and d.verified_at is not null)
      and not exists (select 1 from public.suppressions su where su.tenant_id = s.tenant_id and su.email = e.email)
    order by s.scheduled_at
    limit greatest(1, least(max_count, 500))
    for update of s skip locked
  ), claimed as (
    update public.simulations s set status = 'queued' from due where s.id = due.id returning s.*
  )
  select c.id, c.tenant_id, e.email::text, e.first_name, e.last_name, e.locale, sc.slug, sc.subject, sc.sender_name, sc.preview
  from claimed c join public.employees e on e.id = c.employee_id join public.scenarios sc on sc.id = c.scenario_id;
end $$;

-- Records the provider's answer for a queued simulation.
create function public.engine_mark_sent(sim uuid, accepted boolean, provider_signals jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.simulations;
begin
  select * into s from public.simulations where id = sim for update;
  if s.id is null or s.status <> 'queued' then
    raise exception 'Simulation % is not queued.', sim;
  end if;
  update public.simulations set status = (case when accepted then 'sent' else 'failed' end)::public.simulation_status, sent_at = case when accepted then now() end where id = sim;
  insert into public.events (tenant_id, simulation_id, type, evidence_level, actor, source, signals)
  values (s.tenant_id, sim, case when accepted then 'accepted'::public.event_type else 'failed'::public.event_type end, 0, 'automation', 'provider', coalesce(provider_signals, '{}'::jsonb));
  perform private.decide_outcome(sim);
end $$;

-- A browser opened the landing page with a valid token.
create function public.engine_start_session(sim uuid, ip_hash text, user_agent_family text, network_class text)
returns uuid language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  s public.simulations;
  id uuid;
begin
  select * into s from public.simulations where simulations.id = sim;
  if s.id is null or s.sent_at is null or s.status not in ('sent', 'accepted') then
    raise exception 'Simulation % was not sent.', sim;
  end if;
  insert into public.landing_sessions (tenant_id, simulation_id, ip_hash, user_agent_family, network_class)
  values (s.tenant_id, sim, left(ip_hash, 128), left(user_agent_family, 64), coalesce(network_class, 'unknown'))
  returning landing_sessions.id into id;
  return id;
end $$;

-- JavaScript ran in the session, with this many pointer or key events so far.
create function public.engine_touch_session(session uuid, pointer_events integer)
returns void language sql security definer set search_path = '' as $$
  update public.landing_sessions
  set js_executed = true, pointer_events = greatest(landing_sessions.pointer_events, least(coalesce(engine_touch_session.pointer_events, 0), 10000))
  where id = session
$$;

-- Records one observation and decides the outcome again. The evidence level follows the
-- event type (docs/verification.md), never the caller.
create function public.engine_record(sim uuid, session uuid, kind public.event_type, who public.event_actor,
                                     detection jsonb default '{}'::jsonb, simulated_action text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  s public.simulations;
  id uuid;
begin
  if kind not in ('link_request', 'qr_request', 'page_interaction', 'action_completed', 'training_completed') then
    raise exception 'Use engine_mark_sent or engine_record_reply for %.', kind;
  end if;
  select * into s from public.simulations where simulations.id = sim;
  if s.id is null or s.sent_at is null then
    raise exception 'Simulation % was not sent.', sim;
  end if;
  if session is not null and not exists (select 1 from public.landing_sessions where landing_sessions.id = session and simulation_id = sim) then
    raise exception 'Session does not belong to simulation %.', sim;
  end if;
  insert into public.events (tenant_id, simulation_id, session_id, type, evidence_level, actor, source, signals, action)
  values (s.tenant_id, sim, session, kind,
          case kind when 'link_request' then 1 when 'qr_request' then 1 when 'page_interaction' then 2 when 'action_completed' then 3 else 0 end,
          who, 'landing', coalesce(detection, '{}'::jsonb), left(simulated_action, 40))
  returning events.id into id;
  perform private.decide_outcome(sim);
  return id;
end $$;

-- A reply arrived in a Helvax mailbox. Anything that could count goes to review.
create function public.engine_record_reply(sim uuid, category public.reply_category, confidence numeric, rule_hits text[],
                                           marker_found boolean, classifier_version text, excerpt text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  s public.simulations;
  ev uuid;
begin
  select * into s from public.simulations where simulations.id = sim;
  if s.id is null or s.sent_at is null then
    raise exception 'Simulation % was not sent.', sim;
  end if;
  insert into public.events (tenant_id, simulation_id, type, evidence_level, actor, source, signals)
  values (s.tenant_id, sim, 'reply', case when category = 'risky_intent' then 3 else 0 end, 'human_likely', 'inbound', jsonb_build_object('rules', rule_hits))
  returning id into ev;
  insert into public.reply_analyses (tenant_id, event_id, category, confidence, rule_hits, marker_found, classifier_version, excerpt, reviewer_status)
  values (s.tenant_id, ev, category, least(greatest(confidence, 0), 1), coalesce(rule_hits, '{}'), coalesce(marker_found, false),
          classifier_version, left(coalesce(excerpt, ''), 500),
          case when category in ('risky_intent', 'ambiguous') then 'pending'::public.review_status else 'not_needed'::public.review_status end);
  perform private.decide_outcome(sim);
  return ev;
end $$;

-- Closes the observation window: pending results older than 72 hours are decided again.
create function public.engine_close_windows() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  sim uuid;
  n integer := 0;
begin
  for sim in
    select o.simulation_id from public.outcomes o join public.simulations s on s.id = o.simulation_id
    where o.result = 'pending' and s.sent_at < now() - interval '72 hours' and not s.is_demo
  loop
    perform private.decide_outcome(sim);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Bounces and complaints stop future simulations to that address.
create function public.engine_suppress(t uuid, address text, why text) returns void
language sql security definer set search_path = '' as $$
  insert into public.suppressions (tenant_id, email, reason) values (t, lower(address), why) on conflict do nothing
$$;

-- The provider reported a bounce or a spam complaint for a message it had accepted.
-- The address is suppressed so it never gets another simulation.
create function public.engine_mark_bounced(provider_id text, complaint boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.simulations;
  addr text;
begin
  select sim.* into s from public.events e join public.simulations sim on sim.id = e.simulation_id
  where e.type = 'accepted' and e.signals ->> 'provider_id' = provider_id limit 1;
  if s.id is null then
    return;
  end if;
  select email into addr from public.employees where id = s.employee_id;
  if not complaint then
    update public.simulations set status = 'bounced' where id = s.id;
    insert into public.events (tenant_id, simulation_id, type, evidence_level, actor, source, signals)
    values (s.tenant_id, s.id, 'bounced', 0, 'automation', 'provider', jsonb_build_object('provider_id', provider_id));
  end if;
  insert into public.suppressions (tenant_id, email, reason) values (s.tenant_id, addr, case when complaint then 'complaint' else 'bounce' end)
  on conflict do nothing;
  perform private.decide_outcome(s.id);
end $$;
create index events_provider_idx on public.events ((signals ->> 'provider_id')) where type = 'accepted';

revoke execute on function public.engine_plan_all(), public.engine_claim_due(integer), public.engine_mark_sent(uuid, boolean, jsonb),
  public.engine_start_session(uuid, text, text, text), public.engine_touch_session(uuid, integer),
  public.engine_record(uuid, uuid, public.event_type, public.event_actor, jsonb, text),
  public.engine_record_reply(uuid, public.reply_category, numeric, text[], boolean, text, text),
  public.engine_close_windows(), public.engine_suppress(uuid, text, text), public.engine_mark_bounced(text, boolean)
  from public, anon, authenticated;
grant execute on function public.engine_plan_all(), public.engine_claim_due(integer), public.engine_mark_sent(uuid, boolean, jsonb),
  public.engine_start_session(uuid, text, text, text), public.engine_touch_session(uuid, integer),
  public.engine_record(uuid, uuid, public.event_type, public.event_actor, jsonb, text),
  public.engine_record_reply(uuid, public.reply_category, numeric, text[], boolean, text, text),
  public.engine_close_windows(), public.engine_suppress(uuid, text, text), public.engine_mark_bounced(text, boolean)
  to service_role;
