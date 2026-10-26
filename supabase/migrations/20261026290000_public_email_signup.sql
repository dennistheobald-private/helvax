-- People who sign up with a public email address (Gmail, iCloud, ...) can create a company.
-- Their own domain is simply not added as a company domain; they add one later.
create or replace function private.is_public_email_domain(domain text) returns boolean
language sql immutable set search_path = '' as $$
  select lower(domain) = any (array[
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'icloud.com',
    'me.com', 'mac.com', 'aol.com', 'gmx.ch', 'gmx.de', 'gmx.net', 'web.de', 'bluewin.ch', 'proton.me', 'protonmail.com',
    't-online.de', 'hey.com'
  ])
$$;

create or replace function private.check_company_domain() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.is_public_email_domain(new.domain::text) then
    raise exception '% is a public email provider, not a company domain.', new.domain using errcode = 'check_violation';
  end if;
  return new;
end $$;

create or replace function public.create_tenant(tenant_name text, tenant_timezone text default 'Europe/Zurich')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
  d text := private.email_domain(auth.jwt() ->> 'email');
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.tenants (name, timezone) values (trim(tenant_name), tenant_timezone) returning id into t;
  insert into public.memberships (tenant_id, user_id, role) values (t, auth.uid(), 'owner');
  if d ~ '^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' and not private.is_public_email_domain(d) then
    insert into public.company_domains (tenant_id, domain) values (t, d);
  end if;
  perform private.audit(t, 'tenant.created', t::text, jsonb_build_object('name', tenant_name));
  return t;
end $$;
