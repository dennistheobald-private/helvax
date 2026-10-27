-- Engine self-test. Runs after 97_phone_numbers.sql.
\set QUIET on
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

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000d0f1', 'boss@selftest.example'),
  ('00000000-0000-0000-0000-00000000d0f2', 'plain@selftest.example');
update public.profiles set email = 'boss@icloud.com', full_name = 'Dana Boss', is_superadmin = true where id = '00000000-0000-0000-0000-00000000d0f1';
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000d0f1',
  'role', 'authenticated', 'aal', 'aal2', 'email', 'boss@selftest.example')::text, false);
set role authenticated;
select public.create_tenant('Self AG', 'Europe/Zurich', array['selftest.example']) \gset s_
select pg_temp.fails($$select public.engine_self_test('00000000-0000-0000-0000-00000000d0f1')$$, 'signed-in users cannot run a self-test');
select pg_temp.fails($$insert into public.employees (tenant_id, email, first_name, last_name) values ('$$ || :'s_create_tenant' || $$', 'x@icloud.com', 'X', 'Y')$$, 'the domain rule still applies to everyone else');

reset role;
set role service_role;
select pg_temp.fails($$select public.engine_self_test('00000000-0000-0000-0000-00000000d0f2')$$, 'only a superadmin can receive a self-test');
select * from public.engine_self_test('00000000-0000-0000-0000-00000000d0f1') \gset t_
reset role;
select pg_temp.check(:'t_email' = 'boss@icloud.com' and :'t_tenant_id' = :'s_create_tenant', 'the self-test goes to the superadmin''s own email, in their company');
select pg_temp.check((select status = 'queued' from public.simulations where id = :'t_simulation_id'), 'the simulation is queued for sending');
select pg_temp.check((select status = 'paused' and consent_scope = 'excluded' from public.employees where tenant_id = :'s_create_tenant' and email = 'boss@icloud.com'), 'the self-test recipient is never planned or billed');
select pg_temp.check((select count(*) = 1 from public.audit_logs where action = 'engine.self_test' and target = :'t_simulation_id'), 'the self-test is audited');
select pg_temp.check(not (select sending_enabled from public.platform_settings), 'the platform switch stays off');
set role service_role;
select public.engine_mark_sent(:'t_simulation_id', true, '{}'::jsonb);
select count(*) as n from public.engine_self_test('00000000-0000-0000-0000-00000000d0f1') \gset u_
reset role;
select pg_temp.check((select status = 'sent' from public.simulations where id = :'t_simulation_id'), 'a self-test can be marked sent');
select pg_temp.check((select count(*) = 1 from public.employees where email = 'boss@icloud.com'), 'running it again reuses the same recipient');
