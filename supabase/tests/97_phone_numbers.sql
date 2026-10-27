-- Phone numbers. Runs after 96_onboarding_domains.sql.
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
  ('00000000-0000-0000-0000-00000000c0f1', 'owner@phone.example'),
  ('00000000-0000-0000-0000-00000000c0f2', 'mia@phone.example');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000c0f1',
  'role', 'authenticated', 'aal', 'aal2', 'email', 'owner@phone.example')::text, false);
set role authenticated;
select public.create_tenant('Phone AG', 'Europe/Zurich', array['phone.example']) \gset p_

insert into public.employees (tenant_id, email, first_name, last_name, phone)
values (:'p_create_tenant', 'lea@phone.example', 'Lea', 'Muster', '+41791234567');
select pg_temp.check((select phone from public.employees where email = 'lea@phone.example') = '+41791234567', 'admins can add an employee with a phone number');
select pg_temp.fails($$update public.employees set phone = '079 123 45 67' where email = 'lea@phone.example'$$, 'phone numbers must be in international format');
update public.employees set phone = null where email = 'lea@phone.example';
select pg_temp.check((select phone from public.employees where email = 'lea@phone.example') is null, 'a phone number can be removed');
update public.profiles set phone = '+41441234567' where id = auth.uid();
select pg_temp.check((select phone from public.profiles where id = auth.uid()) = '+41441234567', 'people can set their own phone number');

insert into public.invitations (tenant_id, email, role, token_hash, phone)
values (:'p_create_tenant', 'mia@phone.example', 'viewer', encode(extensions.digest('phone-token', 'sha256'), 'hex'), '+31612345678');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000c0f2',
  'role', 'authenticated', 'aal', 'aal1', 'email', 'mia@phone.example')::text, false);
set role authenticated;
select public.accept_invitation('phone-token');
select pg_temp.check((select phone from public.profiles where id = auth.uid()) = '+31612345678', 'an invitation passes its phone number to the new member');
update public.profiles set phone = '+41441234567' where id = '00000000-0000-0000-0000-00000000c0f1';
reset role;
select pg_temp.check((select phone from public.profiles where id = '00000000-0000-0000-0000-00000000c0f1') = '+41441234567', 'nobody can change someone else''s phone number');
