-- Accounts without a profile get one from the backfill. Runs after 70_billing.sql.
\set QUIET on
create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000e9', 'old.account@helvax.example', '{"full_name": "Old Account"}');
delete from public.profiles where id = '00000000-0000-0000-0000-0000000000e9';
\i migrations/20261026270000_backfill_profiles.sql
select pg_temp.check((select email = 'old.account@helvax.example' and full_name = 'Old Account' and not is_superadmin from public.profiles where id = '00000000-0000-0000-0000-0000000000e9'),
  'a user without a profile gets one, never as superadmin');
\i migrations/20261026270000_backfill_profiles.sql
select pg_temp.check((select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000e9') = 1, 'running the backfill again changes nothing');
