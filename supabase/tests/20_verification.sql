-- Employees, domains, sample data and the outcome rules. Runs after 10_tenants_rls.sql.
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

select id as t from public.tenants where name = 'Alpenbau AG' \gset

-- Domains: create_tenant registered the owner's domain for new companies.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'dora@delta-bau.ch'),
  ('00000000-0000-0000-0000-0000000000d2', 'gus@gmail.com');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select public.create_tenant('Delta Bau AG') as d \gset
select pg_temp.check((select domain::text from public.company_domains where tenant_id = :'d') = 'delta-bau.ch', 'a new company gets the owner''s email domain');
insert into public.employees (tenant_id, email, first_name, last_name) values (:'d', 'eva.meier@delta-bau.ch', 'Eva', 'Meier');
select pg_temp.check((select count(*) from public.employees where tenant_id = :'d') = 1, 'an employee on the company domain can be added');
select pg_temp.fails($$insert into public.employees (tenant_id, email, first_name, last_name) values ('$$ || :'d' || $$', 'eva@other.ch', 'Eva', 'Other')$$, 'an employee on another domain is rejected');
select pg_temp.fails($$insert into public.employees (tenant_id, email, first_name, last_name) values ('$$ || :'d' || $$', 'x@delta-bau.ch', '', 'X')$$, 'first name is required');
select pg_temp.fails($$update public.company_domains set verified_at = now() where tenant_id = '$$ || :'d' || $$'$$, 'admins cannot mark a domain verified themselves');
select pg_temp.fails($$insert into public.company_domains (tenant_id, domain, verified_at) values ('$$ || :'d' || $$', 'delta-group.ch', now())$$, 'admins cannot add a domain as already verified');
insert into public.company_domains (tenant_id, domain) values (:'d', 'delta-group.ch');
select pg_temp.check((select verified_at is null from public.company_domains where domain = 'delta-group.ch'), 'an added domain starts unverified');
select pg_temp.fails($$insert into public.employees (tenant_id, email, first_name, last_name, is_demo) values ('$$ || :'d' || $$', 'demo@delta-bau.ch', 'D', 'D', true)$$, 'admins cannot create sample employees directly');
select pg_temp.fails($$update public.simulation_settings set sending_enabled = true where tenant_id = '$$ || :'d' || $$'$$, 'the sending switch cannot be flipped directly');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select public.create_tenant('Gmail Fans') \gset g_
reset role;
select pg_temp.check(not exists (select 1 from public.company_domains where tenant_id = :'g_create_tenant'), 'a public email provider is never added as a company domain');
reset role;

-- Sample data
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'aal1');
select pg_temp.fails($$select public.load_sample_data('$$ || :'t' || $$')$$, 'loading sample data needs an admin with MFA');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.load_sample_data(:'t');
select pg_temp.check((select count(*) from public.employees where tenant_id = :'t' and is_demo) = 48, 'sample data adds 48 employees');
select pg_temp.check((select count(*) from public.simulations where tenant_id = :'t') = (select count(*) from public.outcomes where tenant_id = :'t'), 'every simulation has an outcome');
select pg_temp.check((select count(*) from public.reports where tenant_id = :'t') = 3, 'three monthly snapshots');
select pg_temp.check((select count(distinct result) from public.outcomes where tenant_id = :'t') >= 6, 'sample data covers most outcome types');
reset role;

-- Outcome rules
select pg_temp.check(not exists (
  select 1 from public.outcomes where result = 'verified_risky' and evidence_level < 3
), 'verified risky outcomes are always level 3 or 4');
select pg_temp.check(not exists (
  select 1 from public.outcomes o where o.result in ('verified_risky', 'suspected')
  and not exists (select 1 from public.events e where e.simulation_id = o.simulation_id and e.type in ('action_completed', 'reply'))
), 'a link request alone never makes a risky or suspected outcome');
select pg_temp.check(not exists (
  select 1 from public.outcomes o where o.result = 'verified_risky'
  and exists (select 1 from public.events e where e.simulation_id = o.simulation_id and e.type = 'action_completed')
  and not exists (
    select 1 from public.events e join public.landing_sessions s on s.id = e.session_id
    where e.simulation_id = o.simulation_id and e.type = 'action_completed' and e.actor = 'human_likely' and s.js_executed
  )
  and not exists (select 1 from public.reply_analyses ra join public.events e on e.id = ra.event_id
    where e.simulation_id = o.simulation_id and ra.reviewer_status in ('confirmed', 'overridden'))
), 'an action without signs of a person is never verified');
select pg_temp.check(not exists (
  select 1 from public.outcomes o where o.result <> 'scanner_only'
  and not exists (select 1 from public.events e where e.simulation_id = o.simulation_id and e.actor not in ('scanner', 'automation') and e.type not in ('accepted', 'bounced', 'failed'))
  and exists (select 1 from public.events e where e.simulation_id = o.simulation_id and e.actor = 'scanner')
  and o.result not in ('pending', 'not_delivered')
), 'scanner-only activity is labelled scanner_only');

-- Reproducibility: deciding again with the same evidence adds no new decision.
select count(*) as before from public.outcome_decisions where tenant_id = :'t' \gset
\o /dev/null
select private.decide_outcome(simulation_id) from public.outcomes where tenant_id = :'t';
\o
select pg_temp.check((select count(*) from public.outcome_decisions where tenant_id = :'t') = :before, 're-running the rules on the same evidence gives the same results');

-- History is append-only and results are read-only for members.
select pg_temp.fails($$update public.outcome_decisions set explanation = 'x'$$, 'decision history cannot be edited');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.fails($$insert into public.events (tenant_id, simulation_id, type, evidence_level, source) select tenant_id, id, 'action_completed', 3, 'landing' from public.simulations limit 1$$, 'members cannot write events');
select pg_temp.fails($$update public.outcomes set result = 'no_interaction'$$, 'members cannot change outcomes');
reset role;

-- Review: confirming a suspected reply turns it into a verified risky action.
select ra.id as ra, e.simulation_id as rsim from public.reply_analyses ra join public.events e on e.id = ra.event_id
join public.outcomes o on o.simulation_id = e.simulation_id
where ra.tenant_id = :'t' and o.result = 'suspected' and ra.category = 'risky_intent' limit 1 \gset
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.review_reply(:'ra', 'risky_intent');
select pg_temp.check((select result from public.outcomes where simulation_id = :'rsim') = 'verified_risky', 'a confirmed risky reply becomes verified');
select pg_temp.check((select count(*) from public.outcome_decisions where simulation_id = :'rsim') = 2, 'the earlier decision stays in the history');
reset role;

-- Isolation: Delta Bau sees none of Alpenbau's results.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check((select count(*) from public.outcomes) = 0 and (select count(*) from public.events) = 0, 'another company sees none of the results');
select pg_temp.check((public.outcome_summary(:'t', now() - interval '1 year') ->> 'sent')::int = 0
  and not exists (select 1 from public.employee_stats(:'t')), 'summaries show nothing from another company');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((public.outcome_summary(:'t', now() - interval '1 year') ->> 'sent')::int > 0
  and (public.outcome_summary(:'t', now() - interval '1 year') ->> 'eligible')::int <= (public.outcome_summary(:'t', now() - interval '1 year') ->> 'sent')::int
  and exists (select 1 from public.employee_stats(:'t')), 'members see their company''s summaries');
reset role;

-- Clearing sample data removes it all.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.clear_sample_data(:'t');
reset role;
select pg_temp.check((select count(*) from public.simulations where tenant_id = :'t') = 0 and (select count(*) from public.employees where tenant_id = :'t') = 0, 'clearing sample data removes it');

-- Every table the API can reach has row level security switched on.
select pg_temp.check(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
), 'every public table has row level security');
