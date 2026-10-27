-- Optional phone numbers in international (E.164) format, for future voice simulations.
-- Employees get one from the admin or a CSV import; team members set their own, and an
-- invitation can carry one that is copied to the new member's profile.
alter table public.employees add column phone text check (phone ~ '^\+[1-9][0-9]{6,14}$');
alter table public.profiles add column phone text check (phone ~ '^\+[1-9][0-9]{6,14}$');
alter table public.invitations add column phone text check (phone ~ '^\+[1-9][0-9]{6,14}$');

grant insert (phone), update (phone) on public.employees to authenticated;
grant update (phone) on public.profiles to authenticated;

create or replace function public.accept_invitation(invite_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  inv public.invitations;
begin
  select * into inv from public.invitations
  where token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
    and accepted_at is null and expires_at > now()
  for update;
  if inv.id is null then
    raise exception 'This invitation is invalid or has expired.' using errcode = 'no_data_found';
  end if;
  if lower(inv.email::text) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'This invitation was sent to a different email address.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.memberships (tenant_id, user_id, role)
  values (inv.tenant_id, auth.uid(), inv.role)
  on conflict (tenant_id, user_id) do nothing;
  if inv.phone is not null then
    update public.profiles set phone = inv.phone where id = auth.uid() and phone is null;
  end if;
  update public.invitations set accepted_at = now() where id = inv.id;
  return inv.tenant_id;
end $$;
