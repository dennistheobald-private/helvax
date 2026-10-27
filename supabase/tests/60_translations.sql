-- Simulations in the employee's language. Runs after 50_admin.sql.
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

select pg_temp.check(not exists (
  select 1 from public.scenarios s cross join (values ('de'), ('nl')) l(locale)
  where s.approval_state = 'approved' and not exists (select 1 from public.scenario_translations t where t.scenario_id = s.id and t.locale = l.locale)
), 'every approved scenario has German and Dutch text');
select pg_temp.check((select bool_and(locales = '{en,de,nl}') from public.scenarios where approval_state = 'approved'), 'the library lists the languages that have text');
select pg_temp.check(not exists (select 1 from public.scenario_translations where locale = 'de' and (subject || sender_name || preview) like '%ß%'), 'German uses Swiss spelling');
select pg_temp.check(not exists (select 1 from public.scenario_variants where locale = 'de' and (subject || sender_name || preview) like '%ß%'), 'German variants use Swiss spelling');
-- Every approved scenario has at least two wordings in each language, so a person rarely
-- sees the exact same copy twice.
select pg_temp.check(not exists (
  select 1 from public.scenarios s cross join (values ('en'), ('de'), ('nl')) l(locale)
  where s.approval_state = 'approved'
    and (select count(*) from public.scenario_variants v where v.scenario_id = s.id and v.locale = l.locale and v.enabled and v.approval_state = 'approved') < 2
), 'every approved scenario has at least two wordings per language');

-- A German-speaking employee gets the German version.
select id as d from public.tenants where name = 'Delta Bau AG' \gset
insert into public.employees (tenant_id, email, first_name, last_name, locale) values (:'d', 'lea.keller@delta-bau.ch', 'Lea', 'Keller', 'de') returning id as lea \gset
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select public.approve_tenant_sending(:'d', true);
select public.set_platform_sending(true);
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select public.set_sending_enabled(:'d', true);
reset role;
insert into public.simulations (tenant_id, employee_id, scenario_id, scheduled_at)
select :'d', :'lea', id, now() - interval '1 minute' from public.scenarios where slug = 'password-expiry';
set role service_role;
create temp table claimed_de as select * from public.engine_claim_due(10);
reset role;
-- A random approved German variant is chosen; it must be one of the scenario's German variants.
select pg_temp.check((
  select c.locale = 'de' and exists (
    select 1 from public.scenario_variants v
    join public.scenarios s on s.id = v.scenario_id and s.slug = 'password-expiry'
    where v.locale = 'de' and v.subject = c.subject and v.sender_name = c.sender_name and v.preview = c.preview
  )
  from claimed_de c where c.email = 'lea.keller@delta-bau.ch'),
  'the simulation goes out in German');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select public.set_platform_sending(false);
reset role;
