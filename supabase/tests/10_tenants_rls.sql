-- Tenant isolation, roles and MFA rules. Each check raises on failure.
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
  if not ok then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;

create or replace function pg_temp.fails(stmt text, what text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'ok - % (%)', what, sqlerrm;
    return;
  end;
  raise exception 'FAILED: % (statement succeeded)', what;
end $$;

-- Two users in two companies, plus an outsider.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@alpenbau.example'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@bergwerk.example'),
  ('00000000-0000-0000-0000-00000000000c', 'clara@alpenbau.example');

select pg_temp.check((select count(*) from public.profiles) = 3, 'a profile is created for each new user');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_tenant('Alpenbau AG') \gset a_
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.create_tenant('Bergwerk GmbH') \gset b_
reset role;

-- Isolation
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from public.tenants) = 1, 'a member sees only their own company');
select pg_temp.check((select count(*) from public.memberships) = 1, 'a member sees only their own team');
select pg_temp.check((select count(*) from public.profiles) = 1, 'a member sees only teammates'' profiles');
update public.tenants set name = 'Hacked' where id = :'b_create_tenant';
reset role;
select pg_temp.check((select name from public.tenants where id = :'b_create_tenant') = 'Bergwerk GmbH', 'cross-tenant update is denied');

-- Direct inserts are blocked; tenants are created through create_tenant only.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.fails($$insert into public.memberships (tenant_id, user_id, role) values ('$$ || :'a_create_tenant' || $$', auth.uid(), 'owner')$$, 'a user cannot add themselves to a company');
select pg_temp.fails($$update public.profiles set is_superadmin = true where id = auth.uid()$$, 'a user cannot make themselves superadmin');
reset role;

-- MFA: an admin session without MFA can't change company settings.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'aal1');
update public.tenants set name = 'No MFA' where id = :'a_create_tenant';
select pg_temp.check((select count(*) from public.tenants where name = 'No MFA') = 0, 'admin writes need an MFA-verified session');
select pg_temp.check((select count(*) from public.tenants) = 1, 'reading works without MFA');
reset role;

-- Invitations: owner invites Clara as viewer; Clara accepts with the token.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.invitations (tenant_id, email, role, token_hash)
values (:'a_create_tenant', 'clara@alpenbau.example', 'viewer', encode(extensions.digest('secret-token', 'sha256'), 'hex'));
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.fails($$select public.accept_invitation('secret-token')$$, 'an invitation cannot be used by another email address');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c', 'aal1');
select pg_temp.check(public.accept_invitation('secret-token') = :'a_create_tenant'::uuid, 'the invited person can accept');
select pg_temp.check((select count(*) from public.memberships) = 2, 'the new viewer sees the team');
select pg_temp.fails($$select public.accept_invitation('secret-token')$$, 'an invitation works only once');
select pg_temp.check((select count(*) from public.invitations) = 0, 'viewers cannot read invitations');
update public.tenants set name = 'Viewer edit' where id = :'a_create_tenant';
reset role;
select pg_temp.check((select name from public.tenants where id = :'a_create_tenant') = 'Alpenbau AG', 'viewers cannot edit the company');

-- Owner rules
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.fails($$delete from public.memberships where user_id = auth.uid()$$, 'the last owner cannot leave');
update public.memberships set role = 'admin' where user_id = '00000000-0000-0000-0000-00000000000c';
select pg_temp.check((select role from public.memberships where user_id = '00000000-0000-0000-0000-00000000000c') = 'admin', 'owners can change roles');
select pg_temp.check((select count(*) from public.audit_logs where action like 'member.%') >= 2, 'membership changes are audited');
reset role;

-- An admin can't invite another admin or remove the owner.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.fails($$insert into public.invitations (tenant_id, email, role, token_hash) values ('$$ || :'a_create_tenant' || $$', 'x@alpenbau.example', 'admin', 'h1')$$, 'admins cannot invite admins');
delete from public.memberships where user_id = '00000000-0000-0000-0000-00000000000a';
reset role;
select pg_temp.check((select count(*) from public.memberships where tenant_id = :'a_create_tenant') = 2, 'admins cannot remove an owner');

-- Deleting a company removes its members cleanly.
delete from public.tenants where id = :'b_create_tenant';
select pg_temp.check((select count(*) from public.memberships where tenant_id = :'b_create_tenant') = 0, 'deleting a company cascades');
