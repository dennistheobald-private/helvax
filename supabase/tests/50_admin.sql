-- The Helvax admin console. Runs after 40_reports.sql.
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

-- Company owners can't see the console.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.fails($$select * from public.admin_tenants()$$, 'company owners cannot open the admin console');
select pg_temp.fails($$select * from public.admin_platform_log()$$, 'company owners cannot read the platform log');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1', 'aal1');
select pg_temp.fails($$select * from public.admin_tenants()$$, 'superadmins need MFA for the console');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.check((select count(*) from public.admin_tenants()) = (select count(*) from public.tenants), 'superadmins see every company');
select pg_temp.check((select approved_at is not null and 'delta-bau.ch' = any(verified_domains) and blockers @> array['platform_off'] and not has_sample_data
  from public.admin_tenants() where id = :'d'), 'the console shows readiness and blockers');
select pg_temp.check((select count(*) from public.admin_platform_log() where action like 'platform.sending_%' and actor = 'sam@helvax.example') = 2,
  'platform switch changes are logged with who made them');
select public.approve_tenant_sending(:'d', false);
select pg_temp.check((select approved_at is null and blockers @> array['not_approved'] from public.admin_tenants() where id = :'d'), 'revoking approval shows as a blocker');
reset role;
