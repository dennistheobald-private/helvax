-- Template variants, so the same scenario doesn't always send the same words.
-- Each scenario can have several interchangeable versions per language; the engine picks
-- one at random for every send. Subject, preview and sender name may contain merge tokens
-- like {{invoice_no}} or {{due_date}}, filled per send in lib/engine/merge.ts. Variants are
-- curated like scenarios: fictional identities only, Helvax-owned landing domains only,
-- no attachments, no real credential collection, no real payment instructions.

create table public.scenario_variants (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  locale text not null check (locale in ('en', 'de', 'nl')),
  subject text not null,
  sender_name text not null,
  preview text not null,
  enabled boolean not null default true,
  approval_state public.approval_state not null default 'approved',
  created_at timestamptz not null default now()
);
create index scenario_variants_pick_idx on public.scenario_variants (scenario_id, locale) where enabled and approval_state = 'approved';

alter table public.scenario_variants enable row level security;
create policy "signed-in users read" on public.scenario_variants for select to authenticated using (true);
revoke all on public.scenario_variants from anon;
revoke insert, update, delete on public.scenario_variants from authenticated;

-- The current copy becomes variant one, so a scenario's original wording stays in the pool.
insert into public.scenario_variants (scenario_id, locale, subject, sender_name, preview)
select s.id, 'en', s.subject, s.sender_name, s.preview from public.scenarios s;
insert into public.scenario_variants (scenario_id, locale, subject, sender_name, preview)
select t.scenario_id, t.locale, t.subject, t.sender_name, t.preview from public.scenario_translations t;

-- Extra wordings for the highest-value scenarios, several using merge tokens.
insert into public.scenario_variants (scenario_id, locale, subject, sender_name, preview)
select s.id, v.locale, v.subject, v.sender_name, v.preview
from (values
  ('password-expiry', 'en', 'Your password expires {{due_date}} — action needed', 'IT Service Desk', 'Our records show your account password is due to expire. Re-confirm it to keep access to your mailbox.'),
  ('password-expiry', 'de', 'Ihr Passwort läuft am {{due_date}} ab – Handlung erforderlich', 'IT Service Desk', 'Unsere Unterlagen zeigen, dass Ihr Kontopasswort demnächst abläuft. Bestätigen Sie es erneut, um den Zugriff auf Ihr Postfach zu behalten.'),
  ('password-expiry', 'nl', 'Uw wachtwoord verloopt op {{due_date}} – actie vereist', 'IT Servicedesk', 'Uit onze administratie blijkt dat uw accountwachtwoord binnenkort verloopt. Bevestig het opnieuw om toegang tot uw mailbox te behouden.'),
  ('invoice-correction', 'en', 'Updated payment details for invoice {{invoice_no}}', 'Nordbau Supplies – Accounts', 'Following a change to our banking, please use the corrected details for invoice {{invoice_no}} ({{amount}}) and all future payments.'),
  ('invoice-correction', 'de', 'Aktualisierte Zahlungsdaten für Rechnung {{invoice_no}}', 'Nordbau Supplies – Buchhaltung', 'Aufgrund einer Änderung unserer Bankverbindung verwenden Sie bitte die korrigierten Angaben für Rechnung {{invoice_no}} ({{amount}}) und alle künftigen Zahlungen.'),
  ('overdue-reminder', 'en', 'Reminder: invoice {{invoice_no}} ({{amount}}) is past due', 'Alpine Office Supply', 'Invoice {{invoice_no}} is still unpaid. Please settle {{amount}} by {{due_date}} to avoid a late fee.'),
  ('overdue-reminder', 'de', 'Erinnerung: Rechnung {{invoice_no}} ({{amount}}) ist überfällig', 'Alpine Office Supply', 'Rechnung {{invoice_no}} ist noch offen. Bitte begleichen Sie {{amount}} bis zum {{due_date}}, um eine Mahngebühr zu vermeiden.'),
  ('ceo-urgent-payment', 'en', 'Need your help — are you around?', 'Managing Director', 'I''m in a meeting and can''t call. I need a confidential payment of {{amount}} handled discreetly today. Can you help?'),
  ('ceo-urgent-payment', 'de', 'Brauche Ihre Hilfe – sind Sie erreichbar?', 'Geschäftsführung', 'Ich bin in einer Besprechung und kann nicht telefonieren. Ich brauche heute eine vertrauliche Zahlung von {{amount}}, diskret abgewickelt. Können Sie helfen?'),
  ('shared-document', 'en', 'A document was shared with you', 'DocShare', '{{first_name}}, a file has been shared with you and needs your review before {{due_date}}. Open it to continue.'),
  ('shared-document', 'de', 'Ein Dokument wurde mit Ihnen geteilt', 'DocShare', '{{first_name}}, eine Datei wurde mit Ihnen geteilt und muss bis zum {{due_date}} geprüft werden. Öffnen Sie sie, um fortzufahren.'),
  ('shared-document', 'nl', 'Er is een document met u gedeeld', 'DocShare', '{{first_name}}, een bestand is met u gedeeld en moet vóór {{due_date}} worden beoordeeld. Open het om verder te gaan.'),
  ('webmail-storage', 'en', 'Mailbox storage limit reached', 'Mail Administrator', 'Your mailbox has reached its storage limit and may stop receiving messages. Increase your quota to continue.'),
  ('webmail-storage', 'de', 'Speichergrenze des Postfachs erreicht', 'Mail-Administrator', 'Ihr Postfach hat seine Speichergrenze erreicht und empfängt möglicherweise keine Nachrichten mehr. Erhöhen Sie Ihr Kontingent, um fortzufahren.'),
  ('webmail-storage', 'nl', 'Opslaglimiet van mailbox bereikt', 'Mailbeheerder', 'Uw mailbox heeft de opslaglimiet bereikt en ontvangt mogelijk geen berichten meer. Vergroot uw quotum om door te gaan.')
) as v(slug, locale, subject, sender_name, preview)
join public.scenarios s on s.slug = v.slug
on conflict do nothing;

-- Hands out due simulations in the employee's language, now choosing a random approved
-- variant for that language. Falls back to the scenario's translation, then its English
-- base, exactly as before when a language has no variants.
create or replace function public.engine_claim_due(max_count integer default 50)
returns table (simulation_id uuid, tenant_id uuid, email text, first_name text, last_name text, locale text,
               scenario_slug text, subject text, sender_name text, preview text)
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
         coalesce(vr.preview, tr.preview, sc.preview)
  from claimed c
  join public.employees e on e.id = c.employee_id
  join public.scenarios sc on sc.id = c.scenario_id
  left join public.scenario_translations tr on tr.scenario_id = sc.id and tr.locale = e.locale
  left join lateral (
    select v.subject, v.sender_name, v.preview
    from public.scenario_variants v
    where v.scenario_id = sc.id and v.locale = e.locale and v.enabled and v.approval_state = 'approved'
    order by random() limit 1
  ) vr on true;
end $$;
