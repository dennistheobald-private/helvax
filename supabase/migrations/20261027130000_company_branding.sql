-- Company branding for internal-style simulations. A company can store its logo; the
-- engine then renders internal-style scenarios (IT, document, QR) with the company's
-- name and logo, so they look like genuine internal mail. Only a company with a verified
-- domain can set a logo, the same gate as sending. Additive only — no function is dropped,
-- so this applies without a destructive-SQL confirmation.

alter table public.tenants add column logo_url text check (logo_url is null or logo_url ~ '^https://');

-- An admin sets or clears the company logo. The client has no update grant on this column,
-- so this function is the only writer.
create function public.set_company_logo(t uuid, url text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin(t) then
    raise exception 'Only an admin can set the company logo.' using errcode = 'insufficient_privilege';
  end if;
  if url is not null then
    if url !~ '^https://' or length(url) > 2048 then
      raise exception 'A logo must be an https URL.' using errcode = 'check_violation';
    end if;
    if not exists (select 1 from public.company_domains d where d.tenant_id = t and d.verified_at is not null and not d.is_demo) then
      raise exception 'Verify a company domain before adding a logo.' using errcode = 'check_violation';
    end if;
  end if;
  update public.tenants set logo_url = url where id = t;
  perform private.audit(t, case when url is null then 'branding.logo_cleared' else 'branding.logo_set' end, null, '{}'::jsonb);
end $$;
revoke execute on function public.set_company_logo(uuid, text) from public, anon;
grant execute on function public.set_company_logo(uuid, text) to authenticated;
