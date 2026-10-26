-- German and Dutch versions of the scenario library. Employees receive simulations in
-- their own language (employees.locale), falling back to English. German uses Swiss
-- spelling (ss, never ß). Titles and descriptions are for admins and stay in English.

create table public.scenario_translations (
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  locale text not null check (locale in ('de', 'nl')),
  subject text not null,
  sender_name text not null,
  preview text not null,
  primary key (scenario_id, locale)
);
alter table public.scenario_translations enable row level security;
create policy "signed-in users read" on public.scenario_translations for select to authenticated using (true);
revoke all on public.scenario_translations from anon;
revoke insert, update, delete on public.scenario_translations from authenticated;

insert into public.scenario_translations (scenario_id, locale, subject, sender_name, preview)
select s.id, v.locale, v.subject, v.sender_name, v.preview
from (values
  ('parcel-redelivery', 'de', 'Ihr Paket wartet: Wählen Sie einen neuen Zustelltermin', 'ParcelPoint Zustellung', 'Wir konnten Ihr Paket heute nicht zustellen, da niemand anwesend war…'),
  ('parcel-redelivery', 'nl', 'Uw pakket wacht: kies een nieuwe bezorgdatum', 'ParcelPoint Bezorging', 'We hebben vandaag geprobeerd uw pakket te bezorgen, maar er was niemand aanwezig…'),
  ('shared-document', 'de', 'Q4 Budgetplanung.xlsx wurde mit Ihnen geteilt', 'DocShare', 'Lukas hat eine Datei mit Ihnen geteilt. Bitte öffnen Sie sie vor der Sitzung am Freitag.'),
  ('shared-document', 'nl', 'Q4 budgetoverzicht.xlsx is met u gedeeld', 'DocShare', 'Lukas heeft een bestand met u gedeeld. Open het vóór de vergadering van vrijdag.'),
  ('password-expiry', 'de', 'Handlungsbedarf: Ihr Passwort läuft in 24 Stunden ab', 'IT Service Desk', 'Damit Sie weiterhin Zugriff auf Ihr Postfach haben, bestätigen Sie bitte heute Ihr Passwort…'),
  ('password-expiry', 'nl', 'Actie vereist: uw wachtwoord verloopt over 24 uur', 'IT Servicedesk', 'Bevestig vandaag uw wachtwoord om toegang tot uw mailbox te houden…'),
  ('invoice-correction', 'de', 'Korrigierte Rechnung 2026-1184: neue Bankverbindung', 'Nordbau Supplies – Buchhaltung', 'Bitte beachten Sie, dass sich unsere Bankverbindung geändert hat. Verwenden Sie die korrigierten Angaben für diese und alle künftigen Zahlungen…'),
  ('invoice-correction', 'nl', 'Gecorrigeerde factuur 2026-1184: nieuwe bankgegevens', 'Nordbau Supplies – Administratie', 'Let op: onze bankgegevens zijn gewijzigd. Gebruik de gecorrigeerde gegevens voor deze en toekomstige betalingen…'),
  ('overdue-reminder', 'de', 'Zweite Mahnung: Rechnung 88412 ist überfällig', 'Alpine Office Supply', 'Gemäss unseren Unterlagen ist Rechnung 88412 seit 14 Tagen überfällig. Bitte begleichen Sie sie heute, um…'),
  ('overdue-reminder', 'nl', 'Tweede herinnering: factuur 88412 is vervallen', 'Alpine Office Supply', 'Volgens onze administratie staat factuur 88412 al 14 dagen open. Betaal deze vandaag om…'),
  ('ceo-urgent-payment', 'de', 'Sind Sie am Platz?', 'Geschäftsführung', 'Ich brauche Sie heute vor 15 Uhr für eine vertrauliche Zahlung. Bitte antworten Sie, sobald Sie das lesen.'),
  ('ceo-urgent-payment', 'nl', 'Bent u aan uw bureau?', 'Directie', 'Ik heb u vandaag vóór 15.00 uur nodig voor een vertrouwelijke betaling. Antwoord zodra u dit ziet.'),
  ('gift-cards', 'de', 'Kurze Bitte', 'Leitung Verkauf', 'Können Sie heute Nachmittag 5 Geschenkkarten für einen Kundenanlass kaufen? Ich erkläre es Ihnen später.'),
  ('gift-cards', 'nl', 'Klein verzoek', 'Hoofd Verkoop', 'Kunt u vanmiddag 5 cadeaukaarten kopen voor een klantevenement? Ik leg het later uit.'),
  ('parking-permit-qr', 'de', 'Neue Parkbewilligungen: zum Erneuern scannen', 'Facility Management', 'Alle Parkbewilligungen müssen bis Ende Monat erneuert werden. Scannen Sie den QR-Code…'),
  ('parking-permit-qr', 'nl', 'Nieuwe parkeervergunningen: scan om te verlengen', 'Facilitair Beheer', 'Alle parkeervergunningen moeten voor het einde van de maand worden verlengd. Scan de QR-code…'),
  ('mfa-reset-qr', 'de', 'Sicherheitsupdate: Authenticator-App neu registrieren', 'IT-Sicherheit', 'Aufgrund eines Sicherheitsupdates müssen Sie Ihren Authenticator neu registrieren. Scannen Sie dazu…'),
  ('mfa-reset-qr', 'nl', 'Beveiligingsupdate: registreer uw authenticator-app opnieuw', 'IT-beveiliging', 'Door een beveiligingsupdate moet u uw authenticator opnieuw registreren. Scan hiervoor…'),
  ('hr-policy-update', 'de', 'Bitte bestätigen Sie das neue Homeoffice-Reglement', 'People & Culture', 'Das Homeoffice-Reglement wurde aktualisiert. Bitte lesen und bestätigen Sie es bis Freitag…'),
  ('hr-policy-update', 'nl', 'Bevestig het bijgewerkte thuiswerkbeleid', 'People & Culture', 'Het thuiswerkbeleid is bijgewerkt. Lees en bevestig het vóór vrijdag…'),
  ('voicemail', 'de', 'Sie haben eine neue Sprachnachricht (0:42)', 'Voice Services', 'Jemand hat Ihnen eine Nachricht hinterlassen. Hören Sie sie online ab…'),
  ('voicemail', 'nl', 'U heeft een nieuw voicemailbericht (0:42)', 'Voice Services', 'Iemand heeft een bericht voor u achtergelaten. Beluister het online…'),
  ('webmail-storage', 'de', 'Ihr Postfach ist zu 98 % voll', 'Mail-Administrator', 'Sie erhalten bald keine neuen Nachrichten mehr. Erweitern Sie jetzt Ihren Speicherplatz…'),
  ('webmail-storage', 'nl', 'Uw mailbox is voor 98% vol', 'Mailbeheerder', 'U ontvangt binnenkort geen nieuwe berichten meer. Vergroot nu uw opslagruimte…')
) as v(slug, locale, subject, sender_name, preview)
join public.scenarios s on s.slug = v.slug
on conflict do nothing;

-- The library now lists the languages that really have text.
update public.scenarios s set locales = array['en'] || array(
  select t.locale from public.scenario_translations t where t.scenario_id = s.id order by t.locale
);

-- Hands out due simulations in the employee's language (same checks as before).
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
         coalesce(tr.subject, sc.subject), coalesce(tr.sender_name, sc.sender_name), coalesce(tr.preview, sc.preview)
  from claimed c
  join public.employees e on e.id = c.employee_id
  join public.scenarios sc on sc.id = c.scenario_id
  left join public.scenario_translations tr on tr.scenario_id = sc.id and tr.locale = e.locale;
end $$;
