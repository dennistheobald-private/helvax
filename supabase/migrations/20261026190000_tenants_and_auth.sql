-- Helvax: tenants, members, invitations, profiles and audit log.
-- Every tenant table is protected by row-level security. Admin writes also
-- require an MFA-verified session (aal2).

create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Helpers live in a schema that the Data API does not expose.
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create type public.member_role as enum ('owner', 'admin', 'viewer');
create type public.tenant_status as enum ('trial', 'active', 'paused', 'closed');

-- Profiles --------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email extensions.citext not null,
  full_name text not null default '' check (char_length(full_name) <= 120),
  locale text not null default 'en' check (locale in ('en', 'de', 'nl')),
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now()
);

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Tenants and members ---------------------------------------------------------

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  timezone text not null default 'Europe/Zurich',
  locale text not null default 'en' check (locale in ('en', 'de', 'nl')),
  status public.tenant_status not null default 'trial',
  created_at timestamptz not null default now()
);

create table public.memberships (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email extensions.citext not null,
  role public.member_role not null check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index invitations_open_email_idx on public.invitations (tenant_id, email) where accepted_at is null;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.tenants (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_tenant_idx on public.audit_logs (tenant_id, created_at desc);

-- Access helpers ----------------------------------------------------------------

create function private.mfa_verified() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

create function private.is_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_superadmin from public.profiles where id = auth.uid()), false)
$$;

create function private.is_member(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships where tenant_id = t and user_id = auth.uid())
$$;

-- Owner or admin of the tenant, in an MFA-verified session.
create function private.is_admin(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.mfa_verified() and exists (
    select 1 from public.memberships
    where tenant_id = t and user_id = auth.uid() and role in ('owner', 'admin')
  )
$$;

create function private.is_owner(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.mfa_verified() and exists (
    select 1 from public.memberships
    where tenant_id = t and user_id = auth.uid() and role = 'owner'
  )
$$;

create function private.shares_tenant(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on a.tenant_id = b.tenant_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

grant execute on all functions in schema private to authenticated;


-- Audit ------------------------------------------------------------------------

create function private.audit(t uuid, act text, tgt text, meta jsonb default '{}'::jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_logs (tenant_id, actor_id, action, target, metadata)
  values (t, auth.uid(), act, tgt, coalesce(meta, '{}'::jsonb))
$$;

-- A tenant always keeps at least one owner.
create function private.keep_an_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if not exists (
      select 1 from public.memberships
      where tenant_id = old.tenant_id and role = 'owner' and user_id <> old.user_id
    ) and exists (select 1 from public.tenants where id = old.tenant_id) then
      raise exception 'A company needs at least one owner.' using errcode = 'check_violation';
    end if;
  end if;
  return coalesce(new, old);
end $$;

revoke execute on function private.audit(uuid, text, text, jsonb) from public, authenticated;

create trigger memberships_keep_owner
  before update or delete on public.memberships
  for each row execute function private.keep_an_owner();

create function private.audit_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.audit(new.tenant_id, 'member.added', new.user_id::text, jsonb_build_object('role', new.role));
  elsif tg_op = 'UPDATE' then
    perform private.audit(new.tenant_id, 'member.role_changed', new.user_id::text, jsonb_build_object('from', old.role, 'to', new.role));
  elsif exists (select 1 from public.tenants where id = old.tenant_id) then
    perform private.audit(old.tenant_id, 'member.removed', old.user_id::text, '{}'::jsonb);
  end if;
  return coalesce(new, old);
end $$;

create trigger memberships_audit
  after insert or update or delete on public.memberships
  for each row execute function private.audit_membership();

-- Row-level security -------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;

create policy "own profile or teammates" on public.profiles for select to authenticated
  using (id = auth.uid() or private.shares_tenant(id) or private.is_superadmin());
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Only these columns are editable; is_superadmin can only be set with the service role.
revoke update on public.profiles from authenticated;
grant update (full_name, locale) on public.profiles to authenticated;

create policy "members read their tenant" on public.tenants for select to authenticated
  using (private.is_member(id) or private.is_superadmin());
create policy "admins update their tenant" on public.tenants for update to authenticated
  using (private.is_admin(id)) with check (private.is_admin(id));
revoke update on public.tenants from authenticated;
grant update (name, timezone, locale) on public.tenants to authenticated;

create policy "members see their team" on public.memberships for select to authenticated
  using (private.is_member(tenant_id) or private.is_superadmin());
create policy "owners change roles" on public.memberships for update to authenticated
  using (private.is_owner(tenant_id)) with check (private.is_owner(tenant_id));
create policy "admins remove members, anyone can leave" on public.memberships for delete to authenticated
  using (
    user_id = auth.uid()
    or (private.is_admin(tenant_id) and (role <> 'owner' or private.is_owner(tenant_id)))
  );
revoke update on public.memberships from authenticated;
grant update (role) on public.memberships to authenticated;

create policy "admins manage invitations" on public.invitations for all to authenticated
  using (private.is_admin(tenant_id))
  with check (private.is_admin(tenant_id) and (role <> 'owner'));

create policy "admins read the audit log" on public.audit_logs for select to authenticated
  using (private.is_admin(tenant_id) or private.is_superadmin());

-- Admins can't grant a role above their own: only owners make admins.
create function private.check_invite_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'admin' and not private.is_owner(new.tenant_id) then
    raise exception 'Only owners can invite admins.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
create trigger invitations_check_role
  before insert or update on public.invitations
  for each row execute function private.check_invite_role();

-- RPCs ------------------------------------------------------------------------

-- Creates a company and makes the caller its owner.
create function public.create_tenant(tenant_name text, tenant_timezone text default 'Europe/Zurich')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.tenants (name, timezone) values (trim(tenant_name), tenant_timezone) returning id into t;
  insert into public.memberships (tenant_id, user_id, role) values (t, auth.uid(), 'owner');
  perform private.audit(t, 'tenant.created', t::text, jsonb_build_object('name', tenant_name));
  return t;
end $$;

-- Accepts an invitation for the signed-in user's email. The token is the
-- random value from the invite link; only its SHA-256 hash is stored.
create function public.accept_invitation(invite_token text)
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
  update public.invitations set accepted_at = now() where id = inv.id;
  return inv.tenant_id;
end $$;

revoke execute on function public.create_tenant(text, text) from public, anon;
revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.create_tenant(text, text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;

grant select, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.tenants, public.profiles to authenticated;
revoke insert, delete on public.tenants, public.profiles from authenticated;
revoke insert on public.memberships, public.audit_logs from authenticated;
revoke all on public.profiles, public.tenants, public.memberships, public.invitations, public.audit_logs from anon;
