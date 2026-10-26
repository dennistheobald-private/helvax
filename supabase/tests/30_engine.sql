-- Safety controls, the planner and the engine API. Runs after 20_verification.sql.
\set QUIET on

create or replace function pg_temp.as_user(uid uuid, aal text default 'aal2') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal,
      'email', (select email from auth.users where id = uid))::text, false);
  set role authenticated;
end $$;
create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;
create or replace function pg_temp.fails(stmt text, what text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then raise notice 'ok - % (%)', what, sqlerrm; return; end;
  raise exception 'FAILED: % (statement succeeded)', what;
end $$;

select id as d from public.tenants where name = 'Delta Bau AG' \gset
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'sam@helvax.example');
update public.profiles set is_superadmin = true where id = '00000000-0000-0000-0000-0000000000f1';
-- A second employee for the planner; one paused employee who must never be planned.
insert into public.employees (tenant_id, email, first_name, last_name) values (:'d', 'tim.huber@delta-bau.ch', 'Tim', 'Huber');
insert into public.employees (tenant_id, email, first_name, last_name, status) values (:'d', 'pia.roth@delta-bau.ch', 'Pia', 'Roth', 'paused');

-- Nothing can be turned on while the controls are missing.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check(public.sending_readiness(:'d') -> 'blockers' ?& array['platform_off', 'not_approved', 'awareness_not_confirmed', 'no_verified_domain'], 'a new company is blocked on every control');
select pg_temp.fails($$select public.set_sending_enabled('$$ || :'d' || $$', true)$$, 'an owner cannot turn sending on while blocked');
select pg_temp.fails($$update public.tenants set sending_approved_at = now() where id = '$$ || :'d' || $$'$$, 'a company cannot approve itself');
select pg_temp.fails($$select public.set_platform_sending(true)$$, 'only Helvax can turn on the platform');
select pg_temp.fails($$select public.approve_tenant_sending('$$ || :'d' || $$', true)$$, 'only Helvax can approve a company');
select pg_temp.fails($$select public.engine_claim_due(10)$$, 'the browser cannot call the engine');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1', 'aal1');
select pg_temp.fails($$select public.confirm_awareness_notice('$$ || :'d' || $$')$$, 'confirming the notice needs MFA');
reset role;

-- The checks pass one by one.
update public.company_domains set verified_at = now() where tenant_id = :'d' and domain = 'delta-bau.ch';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select public.confirm_awareness_notice(:'d');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1', 'aal1');
select pg_temp.fails($$select public.set_platform_sending(true)$$, 'superadmins need MFA too');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select public.approve_tenant_sending(:'d', true);
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check(public.sending_readiness(:'d') -> 'blockers' = '["platform_off"]', 'only the platform switch is left');
select public.load_sample_data(:'d');
select pg_temp.check(public.sending_readiness(:'d') -> 'blockers' ? 'sample_data_loaded', 'sample data blocks real sending');
select public.clear_sample_data(:'d');
select pg_temp.fails($$select public.set_sending_enabled('$$ || :'d' || $$', true)$$, 'sending stays off while the platform is off');
reset role;

-- The planner works without sending, and only for eligible people.
update public.simulation_settings set per_employee_per_month = 2, cooldown_days = 7, business_days = '{1,2,3,4,5}', window_start = '09:00', window_end = '17:00' where tenant_id = :'d';
select private.plan_simulations(:'d', current_date + 1, 30) as planned \gset
select pg_temp.check(:planned = 4, 'two simulations each for the two active employees');
select pg_temp.check(not exists (select 1 from public.simulations s join public.employees e on e.id = s.employee_id where e.email = 'pia.roth@delta-bau.ch'), 'paused employees are never planned');
select pg_temp.check(not exists (
  select 1 from public.simulations where tenant_id = :'d'
  and (extract(isodow from scheduled_at at time zone 'Europe/Zurich') > 5
       or (scheduled_at at time zone 'Europe/Zurich')::time not between '09:00' and '17:00')
), 'planned times fall on business days inside the window');
select pg_temp.check(not exists (
  select 1 from public.simulations a join public.simulations b on a.employee_id = b.employee_id and a.id < b.id
  where a.tenant_id = :'d' and abs(extract(epoch from a.scheduled_at - b.scheduled_at)) < 7 * 86400
), 'simulations for one person are at least the cooldown apart');
select pg_temp.check(private.plan_simulations(:'d', current_date + 1, 30) = 0, 'planning again adds nothing');

-- Kill switch: with the platform off, nothing is claimed even when due.
update public.simulations set scheduled_at = now() - interval '1 minute' where tenant_id = :'d';
set role service_role;
select pg_temp.check((select count(*) from public.engine_claim_due(10)) = 0, 'nothing is claimed while the platform is off');
reset role;

-- Platform on, company on: due simulations are claimed exactly once.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select public.set_platform_sending(true);
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select public.set_sending_enabled(:'d', true);
reset role;
update public.employees set status = 'paused' where email = 'tim.huber@delta-bau.ch';
set role service_role;
create temp table claimed as select * from public.engine_claim_due(10);
reset role;
select pg_temp.check((select count(*) from claimed) = 2 and not exists (select 1 from claimed where email = 'tim.huber@delta-bau.ch'), 'only simulations for active employees are claimed');
set role service_role;
select pg_temp.check((select count(*) from public.engine_claim_due(10)) = 0, 'a claimed simulation is not claimed twice');
reset role;

-- Recording evidence.
select simulation_id as s1 from claimed order by simulation_id limit 1 \gset
select simulation_id as s2 from claimed order by simulation_id desc limit 1 \gset
set role service_role;
select pg_temp.fails($$select public.engine_record('$$ || :'s1' || $$', null, 'link_request', 'human_likely')$$, 'nothing is recorded before a simulation is sent');
select public.engine_mark_sent(:'s1', true, '{"provider_id": "re_1"}');
select public.engine_mark_sent(:'s2', true, '{"provider_id": "re_2"}');
reset role;
select pg_temp.check((select result from public.outcomes where simulation_id = :'s1') = 'pending', 'a sent simulation starts pending');
update public.simulations set sent_at = now() - interval '4 days' where id = :'s1';
set role service_role;
select public.engine_close_windows();
reset role;
select pg_temp.check((select result from public.outcomes where simulation_id = :'s1') = 'no_interaction', 'after the window, no activity means no interaction');
set role service_role;
select public.engine_record(:'s1', null, 'link_request', 'scanner', '{"seconds_after_send": 2}');
reset role;
select pg_temp.check((select result from public.outcomes where simulation_id = :'s1') = 'scanner_only', 'a scanner request alone is labelled scanner only');

set role service_role;
select public.engine_start_session(:'s2', 'hash', 'Firefox', 'corporate') as sess \gset
select public.engine_record(:'s2', :'sess', 'link_request', 'human_likely');
select public.engine_touch_session(:'sess', 14);
select public.engine_record(:'s2', :'sess', 'page_interaction', 'human_likely');
select public.engine_record(:'s2', :'sess', 'action_completed', 'human_likely', '{"fields": "synthetic"}', 'login');
reset role;
select pg_temp.check((select result = 'verified_risky' and evidence_level = 4 from public.outcomes where simulation_id = :'s2'), 'a corroborated action by a person is verified at L4');
select pg_temp.check((select evidence_level from public.events where simulation_id = :'s2' and type = 'action_completed') = 3, 'the event level comes from the type, not the caller');
set role service_role;
select pg_temp.fails($$select public.engine_record('$$ || :'s2' || $$', '$$ || :'sess' || $$'::uuid, 'reply', 'human_likely')$$, 'replies go through the reply function');
select public.engine_record_reply(:'s1', 'ambiguous', 0.55, '{}', false, 'rules-v1', 'Who is this?');
reset role;
select pg_temp.check((select reviewer_status from public.reply_analyses ra join public.events e on e.id = ra.event_id where e.simulation_id = :'s1') = 'pending', 'unclear replies wait for review');

-- A bounce marks the simulation undelivered and suppresses the address.
set role service_role;
select public.engine_mark_bounced('re_1');
reset role;
select pg_temp.check((select result from public.outcomes where simulation_id = :'s1') = 'not_delivered'
  and exists (select 1 from public.suppressions where tenant_id = :'d' and email = 'eva.meier@delta-bau.ch'), 'a bounce is not delivered and the address is suppressed');

-- Turning sending off cancels what was planned.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select public.set_sending_enabled(:'d', false);
reset role;
select pg_temp.check(not exists (select 1 from public.simulations where tenant_id = :'d' and status in ('planned', 'queued')), 'turning sending off cancels planned simulations');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select public.set_platform_sending(false);
reset role;
select pg_temp.check(not (select sending_enabled from public.platform_settings), 'the platform switch is back off');
