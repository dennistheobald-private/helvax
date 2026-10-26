-- Newsletter sign-ups: double opt-in, cooldown and no public access.
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

set role anon;
select pg_temp.fails($$select * from public.newsletter_subscribers$$, 'visitors cannot read sign-ups');
select pg_temp.fails($$select public.newsletter_request('a@b.ch', 'x')$$, 'visitors cannot call the sign-up function directly');
select pg_temp.fails($$select public.newsletter_confirm('x')$$, 'visitors cannot confirm directly');
reset role;
set role authenticated;
select pg_temp.fails($$select * from public.newsletter_subscribers$$, 'signed-in app users cannot read sign-ups');
reset role;

set role service_role;
select pg_temp.check(public.newsletter_request('Nora@Example.ch', 'h1') = 'send', 'a new sign-up asks for a confirmation email');
select pg_temp.check((select status from public.newsletter_subscribers where email = 'nora@example.ch') = 'pending', 'a new sign-up starts pending');
select pg_temp.check(public.newsletter_request('nora@example.ch', 'h2') = 'wait', 'a repeat sign-up within 10 minutes sends nothing');
select pg_temp.check(not public.newsletter_confirm('wrong'), 'an unknown token confirms nothing');
select pg_temp.check(public.newsletter_confirm('h1'), 'the emailed token confirms the sign-up');
select pg_temp.check((select status from public.newsletter_subscribers where email = 'nora@example.ch') = 'confirmed', 'the sign-up is confirmed');
select pg_temp.check(public.newsletter_request('nora@example.ch', 'h3') = 'confirmed', 'signing up again when confirmed sends nothing');
select pg_temp.check(public.newsletter_unsubscribe('h1'), 'the same token unsubscribes');
select pg_temp.check(not public.newsletter_confirm('h1'), 'an unsubscribed token cannot confirm again');
update public.newsletter_subscribers set sent_at = now() - interval '1 hour' where email = 'nora@example.ch';
select pg_temp.check(public.newsletter_request('nora@example.ch', 'h4') = 'send', 'signing up again after unsubscribing starts a new opt-in');
select pg_temp.check((select status from public.newsletter_subscribers where email = 'nora@example.ch') = 'pending', 'the new sign-up is pending again');

select public.newsletter_request('old@example.ch', 'h5');
update public.newsletter_subscribers set created_at = now() - interval '8 days', sent_at = now() - interval '8 days' where email = 'old@example.ch';
select pg_temp.check(not public.newsletter_confirm('h5'), 'a confirmation link expires after 7 days');
select public.newsletter_request('new@example.ch', 'h6');
select pg_temp.check(not exists (select 1 from public.newsletter_subscribers where email = 'old@example.ch'), 'expired pending sign-ups are deleted');
reset role;
