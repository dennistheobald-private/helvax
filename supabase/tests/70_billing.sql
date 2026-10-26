-- Billing data is written by the server only. Runs after 60_translations.sql.
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
set role service_role;
insert into public.billing_accounts (tenant_id, stripe_customer_id, status, interval, currency, quantity)
values (:'d', 'cus_test', 'active', 'year', 'chf', 2);
select pg_temp.check(public.billable_employees(:'d') = (select count(*) from public.employees where tenant_id = :'d' and status = 'active' and not is_demo),
  'billable seats are active real employees');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.check((select status from public.billing_accounts where tenant_id = :'d') = 'active', 'members can see their billing status');
select pg_temp.fails($$update public.billing_accounts set status = 'active', quantity = 1 where tenant_id = '$$ || :'d' || $$'$$, 'members cannot change billing');
select pg_temp.fails($$insert into public.billing_events (id, type) values ('evt_x', 'x')$$, 'members cannot record webhook events');
select pg_temp.fails($$select public.billable_employees('$$ || :'d' || $$')$$, 'the browser cannot call billing functions');
reset role;
-- Another company's members see nothing.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check(not exists (select 1 from public.billing_accounts where tenant_id = :'d'), 'other companies cannot see the billing data');
reset role;
