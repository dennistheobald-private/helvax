-- Company logo for branded simulations. Runs after 30_engine.sql, which created the
-- "Delta Bau AG" company (owner d1) with a verified domain.
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
create or replace function pg_temp.fails(sql text, what text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'ok - %', what; return; end;
  raise exception 'FAILED (no error): %', what;
end $$;

select id as d from public.tenants where name = 'Delta Bau AG' \gset

-- Someone who isn't an admin of the company can't set its logo.
select pg_temp.as_user('00000000-0000-0000-0000-00000000beef');
select pg_temp.fails($$select public.set_company_logo('$$ || :'d' || $$', 'https://logo.example/a.png')$$, 'non-admins cannot set a company logo');
reset role;

-- The owner can, but only with an https URL.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.fails($$select public.set_company_logo('$$ || :'d' || $$', 'http://logo.example/a.png')$$, 'a logo must be an https URL');
select public.set_company_logo(:'d', 'https://logo.example/acme.png');
reset role;
select pg_temp.check((select logo_url from public.tenants where id = :'d') = 'https://logo.example/acme.png', 'the company logo is stored');

-- The client has no direct update grant on the column.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.fails($$update public.tenants set logo_url = 'https://evil.example/x.png' where id = '$$ || :'d' || $$'$$, 'the logo cannot be set by a direct update');
select public.set_company_logo(:'d', null);
reset role;
select pg_temp.check((select logo_url from public.tenants where id = :'d') is null, 'the company logo can be cleared');
