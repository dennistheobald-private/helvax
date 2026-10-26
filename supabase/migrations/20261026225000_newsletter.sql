-- Helvax: newsletter sign-ups from helvax.ch with double opt-in.
-- Only the website's server (service role) can read or write this table, and
-- only through the functions below. Unconfirmed sign-ups expire after 7 days.

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null unique check (char_length(email) <= 254),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  -- SHA-256 of the token in the confirmation email; the token itself is never stored.
  token_hash text not null,
  sent_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;

-- Records a sign-up and returns what the caller should do:
-- 'send' (email a confirmation link), 'wait' (one was sent in the last 10 minutes)
-- or 'confirmed' (already subscribed, send nothing).
create function public.newsletter_request(p_email text, p_token_hash text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  sub public.newsletter_subscribers;
begin
  delete from public.newsletter_subscribers where status = 'pending' and created_at < now() - interval '7 days';

  select * into sub from public.newsletter_subscribers where email = lower(trim(p_email))::extensions.citext for update;
  if found and sub.status = 'confirmed' then return 'confirmed'; end if;
  if found and sub.sent_at > now() - interval '10 minutes' then return 'wait'; end if;

  insert into public.newsletter_subscribers (email, token_hash)
  values (lower(trim(p_email)), p_token_hash)
  on conflict (email) do update
    set status = 'pending', token_hash = excluded.token_hash, sent_at = now(),
        created_at = now(), confirmed_at = null, unsubscribed_at = null;
  return 'send';
end $$;

-- Confirms the sign-up whose link was opened and the button pressed. True if it matched.
create function public.newsletter_confirm(p_token_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.newsletter_subscribers
     set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now())
   where token_hash = p_token_hash and status in ('pending', 'confirmed')
     and (status = 'confirmed' or created_at > now() - interval '7 days');
  return found;
end $$;

-- Unsubscribes with the same token. The row stays, marked unsubscribed, so no
-- newsletter goes out; a later sign-up starts a fresh double opt-in.
create function public.newsletter_unsubscribe(p_token_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.newsletter_subscribers
     set status = 'unsubscribed', unsubscribed_at = now()
   where token_hash = p_token_hash and status <> 'unsubscribed';
  return found;
end $$;

revoke all on function public.newsletter_request(text, text) from public, anon, authenticated;
revoke all on function public.newsletter_confirm(text) from public, anon, authenticated;
revoke all on function public.newsletter_unsubscribe(text) from public, anon, authenticated;
grant execute on function public.newsletter_request(text, text) to service_role;
grant execute on function public.newsletter_confirm(text) to service_role;
grant execute on function public.newsletter_unsubscribe(text) to service_role;
