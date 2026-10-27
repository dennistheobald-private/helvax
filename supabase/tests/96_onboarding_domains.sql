-- Company domains chosen at onboarding. Runs after 95_public_email_signup.sql.
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
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000b0f1', 'max@icloud.com');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000b0f1',
  'role', 'authenticated', 'aal', 'aal1', 'email', 'max@icloud.com')::text, false);
set role authenticated;

select public.create_tenant('Muster AG', 'Europe/Zurich', array[' Muster.ch ', '@muster-group.com', 'muster.ch', '']) \gset m_
reset role;
select pg_temp.check((select array_agg(domain::text order by domain::text collate "C") from public.company_domains where tenant_id = :'m_create_tenant')
  = array['muster-group.com', 'muster.ch'], 'domains are cleaned, deduplicated and all added');
select pg_temp.check((select count(*) from public.company_domains where tenant_id = :'m_create_tenant' and verified_at is not null) = 0,
  'onboarding domains start unverified');

set role authenticated;
select pg_temp.fails($$select public.create_tenant('Nothing AG', 'Europe/Zurich', array[]::text[])$$, 'at least one domain is required');
select pg_temp.fails($$select public.create_tenant('Mail AG', 'Europe/Zurich', array['ok.ch', 'gmail.com'])$$, 'public providers are rejected');
select pg_temp.fails($$select public.create_tenant('Bad AG', 'Europe/Zurich', array['not a domain'])$$, 'invalid domains are rejected');
reset role;
select pg_temp.check((select count(*) from public.tenants where name in ('Nothing AG', 'Mail AG', 'Bad AG')) = 0,
  'a rejected call creates no company');

set role anon;
select pg_temp.fails($$select public.create_tenant('Anon AG', 'Europe/Zurich', array['anon.ch'])$$, 'signed-out callers cannot create companies');
reset role;
