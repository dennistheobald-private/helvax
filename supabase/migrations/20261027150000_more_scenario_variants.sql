-- More wordings, so no scenario repeats the exact same copy too soon. Covers the scenarios
-- that had only their original version, and the Dutch versions that were missing one.
-- Insert only, same curation as 20261027110000_scenario_variants.sql: fictional identities,
-- Helvax-owned landing domains only, no real payment instructions. Merge tokens
-- ({{date}}, {{due_date}}, {{first_name}}) are filled per send in lib/engine/merge.ts.

insert into public.scenario_variants (scenario_id, locale, subject, sender_name, preview)
select s.id, v.locale, v.subject, v.sender_name, v.preview
from (values
  ('parcel-redelivery', 'en', 'We missed you — reschedule your delivery', 'ParcelPoint', 'We were unable to deliver your parcel today. Choose a new delivery date to receive it.'),
  ('parcel-redelivery', 'de', 'Zustellung verpasst – Lieferung neu planen', 'ParcelPoint', 'Wir konnten Ihr Paket heute nicht zustellen. Wählen Sie einen neuen Liefertermin.'),
  ('parcel-redelivery', 'nl', 'Bezorging gemist – plan uw levering opnieuw', 'ParcelPoint', 'We konden uw pakket vandaag niet bezorgen. Kies een nieuwe bezorgdatum.'),

  ('voicemail', 'en', 'New voicemail from an unknown caller', 'Voice Services', 'A new voicemail is waiting for you. Sign in to listen to it online.'),
  ('voicemail', 'de', 'Neue Sprachnachricht von unbekanntem Anrufer', 'Voice Services', 'Eine neue Sprachnachricht wartet auf Sie. Melden Sie sich an, um sie online abzuhören.'),
  ('voicemail', 'nl', 'Nieuw voicemailbericht van onbekende beller', 'Voice Services', 'Er wacht een nieuw voicemailbericht op u. Log in om het online te beluisteren.')
) as v(slug, locale, subject, sender_name, preview)
join public.scenarios s on s.slug = v.slug
on conflict do nothing;

insert into public.scenario_variants (scenario_id, locale, subject, sender_name, preview)
select s.id, v.locale, v.subject, v.sender_name, v.preview
from (values
  ('parking-permit-qr', 'en', 'Parking permits renew this month — scan to confirm', 'Facility Management', 'All staff parking permits renew by {{due_date}}. Scan the code on the notice to confirm your permit.'),
  ('parking-permit-qr', 'de', 'Parkbewilligungen laufen diesen Monat ab – scannen zum Bestätigen', 'Facility Management', 'Alle Parkbewilligungen werden bis {{due_date}} erneuert. Scannen Sie den Code auf dem Aushang, um Ihre Bewilligung zu bestätigen.'),
  ('parking-permit-qr', 'nl', 'Parkeervergunningen verlopen deze maand – scan om te bevestigen', 'Facilitair Beheer', 'Alle parkeervergunningen worden vóór {{due_date}} verlengd. Scan de code op de mededeling om uw vergunning te bevestigen.'),

  ('mfa-reset-qr', 'en', 'Re-register your authenticator by {{due_date}}', 'IT Security', 'A security update requires everyone to re-register their authenticator app. Scan the code to complete it.'),
  ('mfa-reset-qr', 'de', 'Authenticator bis {{due_date}} neu registrieren', 'IT-Sicherheit', 'Ein Sicherheitsupdate erfordert, dass alle ihre Authenticator-App neu registrieren. Scannen Sie den Code, um dies abzuschliessen.'),
  ('mfa-reset-qr', 'nl', 'Registreer uw authenticator opnieuw vóór {{due_date}}', 'IT-beveiliging', 'Een beveiligingsupdate vereist dat iedereen de authenticator-app opnieuw registreert. Scan de code om dit te voltooien.'),

  ('hr-policy-update', 'en', 'Please confirm the updated handbook by {{due_date}}', 'People & Culture', 'The employee handbook was updated. Please read it and confirm you have seen it before {{due_date}}.'),
  ('hr-policy-update', 'de', 'Bitte bestätigen Sie das aktualisierte Reglement bis {{due_date}}', 'People & Culture', 'Das Personalreglement wurde aktualisiert. Bitte lesen Sie es und bestätigen Sie die Kenntnisnahme bis {{due_date}}.'),
  ('hr-policy-update', 'nl', 'Bevestig het bijgewerkte handboek vóór {{due_date}}', 'People & Culture', 'Het personeelshandboek is bijgewerkt. Lees het en bevestig dat u het hebt gezien vóór {{due_date}}.'),

  ('shared-document', 'en', 'A file is waiting for your review', 'Documents', '{{first_name}}, a document has been shared with you for review. Open it to continue.'),
  ('shared-document', 'de', 'Eine Datei wartet auf Ihre Prüfung', 'Dokumente', '{{first_name}}, ein Dokument wurde zur Prüfung mit Ihnen geteilt. Öffnen Sie es, um fortzufahren.'),
  ('shared-document', 'nl', 'Een bestand wacht op uw beoordeling', 'Documenten', '{{first_name}}, een document is met u gedeeld ter beoordeling. Open het om verder te gaan.')
) as v(slug, locale, subject, sender_name, preview)
join public.scenarios s on s.slug = v.slug
on conflict do nothing;

-- Dutch versions of the payment scenarios, which previously had only one wording each.
insert into public.scenario_variants (scenario_id, locale, subject, sender_name, preview)
select s.id, v.locale, v.subject, v.sender_name, v.preview
from (values
  ('invoice-correction', 'nl', 'Bijgewerkte betaalgegevens voor factuur {{invoice_no}}', 'Nordbau Supplies – Administratie', 'Onze bankgegevens zijn gewijzigd. Gebruik de bijgewerkte gegevens voor factuur {{invoice_no}} ({{amount}}) en alle toekomstige betalingen.'),
  ('overdue-reminder', 'nl', 'Herinnering: factuur {{invoice_no}} ({{amount}}) is vervallen', 'Alpine Office Supply', 'Factuur {{invoice_no}} staat nog open. Betaal {{amount}} vóór {{due_date}} om extra kosten te voorkomen.'),
  ('ceo-urgent-payment', 'nl', 'Heeft u even?', 'Directie', 'Ik zit in een vergadering en kan niet bellen. Kunt u mij vandaag helpen met een vertrouwelijke betaling van {{amount}}?')
) as v(slug, locale, subject, sender_name, preview)
join public.scenarios s on s.slug = v.slug
on conflict do nothing;

insert into public.scenario_variants (scenario_id, locale, subject, sender_name, preview)
select s.id, v.locale, v.subject, v.sender_name, v.preview
from (values
  ('gift-cards', 'en', 'Quick help needed', 'Head of Sales', '{{first_name}}, could you pick up a few gift cards for a client thank-you today and send me the codes? I will sort out the cost afterwards.'),
  ('gift-cards', 'de', 'Kurze Hilfe benötigt', 'Leitung Verkauf', '{{first_name}}, könnten Sie heute ein paar Geschenkkarten für ein Kundengeschenk besorgen und mir die Codes schicken? Die Kosten regle ich danach.'),
  ('gift-cards', 'nl', 'Snelle hulp nodig', 'Hoofd Verkoop', '{{first_name}}, kunt u vandaag een paar cadeaukaarten kopen voor een klantbedankje en mij de codes sturen? De kosten regel ik achteraf.')
) as v(slug, locale, subject, sender_name, preview)
join public.scenarios s on s.slug = v.slug
on conflict do nothing;
