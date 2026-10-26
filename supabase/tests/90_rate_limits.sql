-- Shared rate limits. Runs after 80_profiles.sql.
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

set role service_role;
select pg_temp.check(public.rate_limit_hit('t:a', 3, 600) and public.rate_limit_hit('t:a', 3, 600) and public.rate_limit_hit('t:a', 3, 600), 'hits up to the limit are allowed');
select pg_temp.check(not public.rate_limit_hit('t:a', 3, 600), 'the next hit is refused');
select pg_temp.check(public.rate_limit_hit('t:b', 3, 600), 'other keys are counted separately');
select pg_temp.fails($$select public.rate_limit_hit('t:c', 0, 600)$$, 'invalid limits are rejected');
reset role;
set role authenticated;
select pg_temp.fails($$select public.rate_limit_hit('t:a', 100, 600)$$, 'the browser cannot touch rate limits');
reset role;
set role anon;
select pg_temp.fails($$select * from private.rate_limits$$, 'nobody else can read the counters');
reset role;
