-- Deterministic outcome rules, version v1. The same evidence always gives the same
-- result, and each decision is stored with its rule version and explanation.
-- docs/verification.md describes the rules in plain language.

create function private.decide_outcome(sim uuid, observation_hours integer default 72)
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
  where simulation_id = sim and actor in ('scanner', 'automation');

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
    select coalesce(array_agg(id), '{}') into ids from public.events where simulation_id = sim and actor in ('scanner', 'automation');
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

-- Admin review --------------------------------------------------------------------

-- Confirm or correct a reply classification, then re-decide the simulation.
create function public.review_reply(analysis uuid, new_category public.reply_category)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ra public.reply_analyses;
  sim uuid;
begin
  select * into ra from public.reply_analyses where id = analysis;
  if ra.id is null or not private.is_admin(ra.tenant_id) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  update public.reply_analyses
  set reviewer_status = case when new_category = ra.category then 'confirmed'::public.review_status else 'overridden'::public.review_status end,
      reviewed_category = new_category, reviewed_by = auth.uid(), reviewed_at = now()
  where id = analysis;
  select simulation_id into sim from public.events where id = ra.event_id;
  perform private.decide_outcome(sim);
  perform private.audit(ra.tenant_id, 'reply.reviewed', analysis::text, jsonb_build_object('category', new_category));
end $$;

-- Confirm or dismiss a suspected outcome that isn't based on a reply. Recorded as a
-- reviewer decision in the history; the engine's decision stays visible.
create function public.review_outcome(sim uuid, confirm boolean, note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  o public.outcomes;
begin
  select * into o from public.outcomes where simulation_id = sim;
  if o.simulation_id is null or not private.is_admin(o.tenant_id) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  if o.result <> 'suspected' then
    raise exception 'Only suspected results can be reviewed.' using errcode = 'check_violation';
  end if;
  if char_length(coalesce(trim(note), '')) < 5 then
    raise exception 'Add a short reason for the review.' using errcode = 'check_violation';
  end if;
  insert into public.outcome_decisions (tenant_id, simulation_id, result, evidence_level, rule_version, evidence_event_ids, explanation, decided_by, is_demo)
  select o.tenant_id, sim,
         case when confirm then 'verified_risky'::public.outcome_result else 'inconclusive'::public.outcome_result end,
         o.evidence_level, d.rule_version, d.evidence_event_ids,
         (case when confirm then 'Confirmed by a reviewer: ' else 'Dismissed by a reviewer: ' end) || trim(note),
         auth.uid(), o.is_demo
  from public.outcome_decisions d where d.id = o.decision_id;
  perform private.audit(o.tenant_id, case when confirm then 'outcome.confirmed' else 'outcome.dismissed' end, sim::text, '{}'::jsonb);
end $$;

revoke execute on function public.review_reply(uuid, public.reply_category), public.review_outcome(uuid, boolean, text) from public, anon;
grant execute on function public.review_reply(uuid, public.reply_category), public.review_outcome(uuid, boolean, text) to authenticated;
