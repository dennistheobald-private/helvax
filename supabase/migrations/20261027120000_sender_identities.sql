-- A pool of sender identities, so simulations don't all come from the same address.
-- Each scenario category has several plausible from-addresses (local parts); the engine
-- picks one at random per send. An identity may also carry its own sending domain, for
-- when more than one Helvax-owned sending domain is in play; a null domain means the
-- configured SIMULATION_FROM_DOMAIN is used. Any domain set here must be a Helvax-owned
-- domain verified in Resend, or the send will fail — nothing but the configured domain is
-- seeded here. Identities are fictional and generic; they never impersonate a real party.

create table public.sender_identities (
  id uuid primary key default gen_random_uuid(),
  category public.scenario_category not null,
  local_part text not null check (local_part ~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'),
  domain text,
  enabled boolean not null default true,
  approval_state public.approval_state not null default 'approved',
  created_at timestamptz not null default now()
);
create index sender_identities_pick_idx on public.sender_identities (category) where enabled and approval_state = 'approved';

alter table public.sender_identities enable row level security;
create policy "signed-in users read" on public.sender_identities for select to authenticated using (true);
revoke all on public.sender_identities from anon;
revoke insert, update, delete on public.sender_identities from authenticated;

insert into public.sender_identities (category, local_part) values
  ('phishing', 'no-reply'), ('phishing', 'notifications'), ('phishing', 'service'), ('phishing', 'alerts'),
  ('supplier_fraud', 'accounts'), ('supplier_fraud', 'billing'), ('supplier_fraud', 'invoices'), ('supplier_fraud', 'ar'),
  ('executive_impersonation', 'office'), ('executive_impersonation', 'exec'), ('executive_impersonation', 'md-office'), ('executive_impersonation', 'assistant'),
  ('qr_phishing', 'facilities'), ('qr_phishing', 'security'), ('qr_phishing', 'it-notices'), ('qr_phishing', 'notices'),
  ('document_link', 'docs'), ('document_link', 'share'), ('document_link', 'files'), ('document_link', 'no-reply'),
  ('credential_form', 'it-helpdesk'), ('credential_form', 'it-support'), ('credential_form', 'accounts-security'), ('credential_form', 'helpdesk');

-- engine_claim_due now also returns the chosen sender local part and domain. Its return
-- columns change, so it is dropped and recreated (CREATE OR REPLACE can't change them).
drop function public.engine_claim_due(integer);

create function public.engine_claim_due(max_count integer default 50)
returns table (simulation_id uuid, tenant_id uuid, email text, first_name text, last_name text, locale text,
               scenario_slug text, subject text, sender_name text, preview text, sender_local text, sender_domain text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not (select sending_enabled from public.platform_settings) then
    return;
  end if;
  -- Anything more than a day overdue is dropped rather than sent late.
  update public.simulations set status = 'cancelled' where status = 'planned' and scheduled_at < now() - interval '1 day';

  return query
  with due as (
    select s.id from public.simulations s
    join public.employees e on e.id = s.employee_id
    join public.tenants tn on tn.id = s.tenant_id
    join public.simulation_settings ss on ss.tenant_id = s.tenant_id
    join public.tenant_scenarios ts on ts.tenant_id = s.tenant_id and ts.scenario_id = s.scenario_id
    join public.scenarios sc on sc.id = s.scenario_id
    where s.status = 'planned' and s.scheduled_at <= now() and not s.is_demo
      and ss.sending_enabled and tn.sending_approved_at is not null and tn.awareness_confirmed_at is not null
      and ts.enabled and sc.approval_state = 'approved'
      and e.status = 'active' and e.consent_scope = 'standard' and not e.is_demo
      and exists (select 1 from public.company_domains d where d.tenant_id = s.tenant_id and d.domain = private.email_domain(e.email) and d.verified_at is not null)
      and not exists (select 1 from public.suppressions su where su.tenant_id = s.tenant_id and su.email = e.email)
    order by s.scheduled_at
    limit greatest(1, least(max_count, 500))
    for update of s skip locked
  ), claimed as (
    update public.simulations s set status = 'queued' from due where s.id = due.id returning s.*
  )
  select c.id, c.tenant_id, e.email::text, e.first_name, e.last_name, e.locale, sc.slug,
         coalesce(vr.subject, tr.subject, sc.subject),
         coalesce(vr.sender_name, tr.sender_name, sc.sender_name),
         coalesce(vr.preview, tr.preview, sc.preview),
         coalesce(sid.local_part, sc.slug),
         sid.domain
  from claimed c
  join public.employees e on e.id = c.employee_id
  join public.scenarios sc on sc.id = c.scenario_id
  left join public.scenario_translations tr on tr.scenario_id = sc.id and tr.locale = e.locale
  left join lateral (
    select v.subject, v.sender_name, v.preview
    from public.scenario_variants v
    where v.scenario_id = sc.id and v.locale = e.locale and v.enabled and v.approval_state = 'approved'
    order by random() limit 1
  ) vr on true
  left join lateral (
    select si.local_part, si.domain
    from public.sender_identities si
    where si.category = sc.category and si.enabled and si.approval_state = 'approved'
    order by random() limit 1
  ) sid on true;
end $$;

revoke execute on function public.engine_claim_due(integer) from public, anon, authenticated;
grant execute on function public.engine_claim_due(integer) to service_role;
