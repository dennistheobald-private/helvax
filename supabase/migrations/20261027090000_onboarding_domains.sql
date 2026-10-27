-- Companies are created with one or more company domains, chosen during onboarding.
-- The two-argument create_tenant stays for older clients; the app now calls this one.
create or replace function public.create_tenant(tenant_name text, tenant_timezone text, tenant_domains text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
  d text;
  clean text[];
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = 'insufficient_privilege';
  end if;
  select coalesce(array_agg(distinct x), '{}') into clean
  from (select lower(trim(trailing '.' from trim(leading '@' from trim(v)))) as x from unnest(tenant_domains) v) s
  where x <> '';
  if cardinality(clean) = 0 then
    raise exception 'Add at least one company domain.' using errcode = 'check_violation';
  end if;
  if cardinality(clean) > 20 then
    raise exception 'Add at most 20 domains.' using errcode = 'check_violation';
  end if;
  foreach d in array clean loop
    if d !~ '^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' then
      raise exception '% is not a valid domain.', d using errcode = 'check_violation';
    end if;
    if private.is_public_email_domain(d) then
      raise exception '% is a public email provider, not a company domain.', d using errcode = 'check_violation';
    end if;
  end loop;

  insert into public.tenants (name, timezone) values (trim(tenant_name), tenant_timezone) returning id into t;
  insert into public.memberships (tenant_id, user_id, role) values (t, auth.uid(), 'owner');
  insert into public.company_domains (tenant_id, domain) select t, x from unnest(clean) x;
  perform private.audit(t, 'tenant.created', t::text, jsonb_build_object('name', tenant_name, 'domains', to_jsonb(clean)));
  return t;
end $$;
revoke execute on function public.create_tenant(text, text, text[]) from public, anon;
grant execute on function public.create_tenant(text, text, text[]) to authenticated;
