-- Signing up with a public email address. Runs after 90_rate_limits.sql.
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
  ('00000000-0000-0000-0000-00000000a0f1', 'dana@icloud.com'),
  ('00000000-0000-0000-0000-00000000a0f2', 'eli@firma.example');

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a0f1',
  'role', 'authenticated', 'aal', 'aal1', 'email', 'dana@icloud.com')::text, false);
set role authenticated;
select public.create_tenant('Dana Design') \gset f1_
reset role;
select pg_temp.check(exists (select 1 from public.memberships where tenant_id = :'f1_create_tenant' and role = 'owner'),
  'someone on iCloud can create a company');
select pg_temp.check(not exists (select 1 from public.company_domains where tenant_id = :'f1_create_tenant'),
  'a public email domain is not added as a company domain');
select pg_temp.fails($$insert into public.company_domains (tenant_id, domain) values ('$$ || :'f1_create_tenant' || $$', 'Gmail.com')$$,
  'public providers still cannot be added by hand, in any case');

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a0f2',
  'role', 'authenticated', 'aal', 'aal1', 'email', 'eli@firma.example')::text, false);
set role authenticated;
select public.create_tenant('Firma AG') \gset f2_
reset role;
select pg_temp.check((select domain::text from public.company_domains where tenant_id = :'f2_create_tenant') = 'firma.example',
  'a company email domain is still added');
