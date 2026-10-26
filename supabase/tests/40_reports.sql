-- Monthly reports: built by the engine, never mixing real and sample data, frozen, sent once.
-- Runs after 30_engine.sql.
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
select (date_trunc('month', now() at time zone 'Europe/Zurich') - interval '1 month')::date as last_month \gset
-- The two real simulations from the engine test were sent in the middle of last month.
update public.simulations set sent_at = :'last_month'::timestamp + interval '10 days 9 hours'
where tenant_id = :'d' and not is_demo and sent_at is not null;

-- Sample data brings sample reports, including one for last month.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
\o /dev/null
select public.load_sample_data(:'d');
\o
select pg_temp.fails($$select public.engine_build_reports()$$, 'the browser cannot build reports');
select pg_temp.fails($$select * from public.engine_reports_to_send()$$, 'the browser cannot list reports to send');
reset role;
select pg_temp.check((select is_demo from public.reports where tenant_id = :'d' and period = :'last_month'), 'last month starts with a sample report');

set role service_role;
select pg_temp.check(public.engine_build_reports((:'last_month'::date + interval '1 month 2 days')::timestamp at time zone 'Europe/Zurich') = 0,
  'no report before the observation window has closed');
select pg_temp.check(public.engine_build_reports((:'last_month'::date + interval '1 month 4 days 6 hours')::timestamp at time zone 'Europe/Zurich') = 1,
  'one report for the one company with real simulations');
select pg_temp.check(public.engine_build_reports((:'last_month'::date + interval '1 month 5 days')::timestamp at time zone 'Europe/Zurich') = 0,
  'building again adds nothing');
reset role;

select pg_temp.check((
  select not is_demo and sent_at is null and not (snapshot ->> 'sample_data')::boolean
     and (snapshot ->> 'simulations_sent')::int = 2 and (snapshot -> 'outcomes' ->> 'verified_risky')::int = 1
     and (snapshot -> 'outcomes' ->> 'not_delivered')::int = 1 and (snapshot ->> 'eligible')::int = 1
  from public.reports where tenant_id = :'d' and period = :'last_month'
), 'the real report replaces the sample one and counts only real simulations');
select pg_temp.check((select bool_and(is_demo and (snapshot ->> 'sample_data')::boolean) from public.reports where tenant_id = :'d' and period <> :'last_month'),
  'months without real simulations keep their sample reports');
select pg_temp.check(not exists (
  select 1 from jsonb_array_elements((select snapshot -> 'groups' from public.reports where tenant_id = :'d' and period = :'last_month')) g
  where g ->> 'name' in ('Finance', 'Sales', 'Operations', 'HR', 'IT', 'Management')
), 'sample groups do not appear in the real report');

-- Sending: the owners and admins receive it once.
set role service_role;
create temp table outbox as select * from public.engine_reports_to_send();
reset role;
select pg_temp.check((select count(*) from outbox) = 1 and (select recipients from outbox) @> array[(select email::text from auth.users where id = '00000000-0000-0000-0000-0000000000d1')],
  'the real report is queued for the owner, and sample reports are never sent');
select report_id as r from outbox \gset

select pg_temp.fails($$update public.reports set snapshot = '{}' where id = '$$ || :'r' || $$'$$, 'a report''s contents cannot change');
set role service_role;
select public.engine_mark_report_sent(:'r');
reset role;
select pg_temp.fails($$update public.reports set sent_at = now() + interval '1 day' where id = '$$ || :'r' || $$'$$, 'a sent report cannot be sent again');
set role service_role;
select pg_temp.check((select count(*) from public.engine_reports_to_send()) = 0, 'a sent report leaves the queue');
reset role;
select pg_temp.check(exists (select 1 from public.audit_logs where tenant_id = :'d' and action = 'report.sent' and target = :'r'), 'sending is in the audit log');

-- Members can read reports but never write them.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.fails($$delete from public.reports where id = '$$ || :'r' || $$'$$, 'members cannot delete reports');
\o /dev/null
select public.clear_sample_data(:'d');
\o
reset role;
select pg_temp.check((select count(*) from public.reports where tenant_id = :'d') = 1, 'clearing sample data keeps the real report');
