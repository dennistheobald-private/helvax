import type { ScenarioCategory } from "../database.types";

// Text for practice pages and simulation emails in the employee's language.
// German follows Swiss spelling (ss, never ß).

export type Locale = "en" | "de" | "nl";
export const LANGUAGE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "English" }, { value: "de", label: "Deutsch" }, { value: "nl", label: "Nederlands" },
];

export const toLocale = (l: string | null | undefined): Locale => (l === "de" || l === "nl" ? l : "en");

type Field = { label: string; type: string };
type Copy = { heading: string; lead: string; cta: string; formTitle: string; submit: string; fields: Field[]; tips: string[] };

const f = (label: string, type: string): Field => ({ label, type });

export const COPY: Record<Locale, Record<ScenarioCategory, Copy>> = {
  en: {
    phishing: {
      heading: "You have a message waiting", lead: "Continue to view it securely.", cta: "Continue",
      formTitle: "Sign in to continue", submit: "Sign in",
      fields: [f("Email", "email"), f("Password", "password")],
      tips: ["Check the sender's address, not just the display name.", "Hover over links to see where they really go.", "When in doubt, open the service yourself instead of using the link."],
    },
    credential_form: {
      heading: "Action required on your account", lead: "Confirm your details to keep access.", cta: "Continue",
      formTitle: "Confirm your password", submit: "Confirm",
      fields: [f("Email", "email"), f("Current password", "password")],
      tips: ["IT will never ask for your password by email.", "Urgent deadlines are a common pressure tactic.", "Report messages like this to your IT team."],
    },
    document_link: {
      heading: "A document was shared with you", lead: "Open it to view and comment.", cta: "Open document",
      formTitle: "Verify your email to open the document", submit: "Open",
      fields: [f("Work email", "email"), f("Password", "password")],
      tips: ["Unexpected shares are worth a quick check with the sender.", "Real document links don't ask for your password again.", "Look closely at the address bar before signing in."],
    },
    qr_phishing: {
      heading: "Renew your registration", lead: "Confirm your account to finish the renewal.", cta: "Continue",
      formTitle: "Confirm your account", submit: "Confirm",
      fields: [f("Full name", "text"), f("Work email", "email"), f("Password", "password")],
      tips: ["QR codes hide where they lead. Check the address before entering anything.", "Posters and letters can be faked as easily as emails.", "Use the official app or intranet instead."],
    },
    supplier_fraud: {
      heading: "Updated bank details", lead: "Please confirm the new account for upcoming payments.", cta: "Review details",
      formTitle: "Confirm the new bank details", submit: "Confirm new details",
      fields: [f("Your name", "text"), f("Approval note", "text")],
      tips: ["Always confirm bank changes by phone, using a number you already have.", "Changes announced by email are the most common payment fraud.", "Follow the four-eyes rule for any change to payee details."],
    },
    executive_impersonation: {
      heading: "Payment approval needed", lead: "A confidential payment is waiting for your approval.", cta: "Review payment",
      formTitle: "Approve the payment", submit: "Approve payment",
      fields: [f("Your name", "text"), f("Reference", "text")],
      tips: ["Unusual requests from executives deserve a call back.", "Secrecy and urgency together are a red flag.", "Never skip the normal approval process, whoever asks."],
    },
  },
  de: {
    phishing: {
      heading: "Eine Nachricht wartet auf Sie", lead: "Fahren Sie fort, um sie sicher anzuzeigen.", cta: "Weiter",
      formTitle: "Melden Sie sich an, um fortzufahren", submit: "Anmelden",
      fields: [f("E-Mail", "email"), f("Passwort", "password")],
      tips: ["Prüfen Sie die Absenderadresse, nicht nur den angezeigten Namen.", "Fahren Sie mit der Maus über Links, um zu sehen, wohin sie wirklich führen.", "Öffnen Sie im Zweifel den Dienst selbst, statt den Link zu verwenden."],
    },
    credential_form: {
      heading: "Handlungsbedarf bei Ihrem Konto", lead: "Bestätigen Sie Ihre Angaben, um den Zugang zu behalten.", cta: "Weiter",
      formTitle: "Passwort bestätigen", submit: "Bestätigen",
      fields: [f("E-Mail", "email"), f("Aktuelles Passwort", "password")],
      tips: ["Die IT fragt nie per E-Mail nach Ihrem Passwort.", "Knappe Fristen sind ein typisches Druckmittel.", "Melden Sie solche Nachrichten Ihrem IT-Team."],
    },
    document_link: {
      heading: "Ein Dokument wurde mit Ihnen geteilt", lead: "Öffnen Sie es, um es anzusehen und zu kommentieren.", cta: "Dokument öffnen",
      formTitle: "Bestätigen Sie Ihre E-Mail, um das Dokument zu öffnen", submit: "Öffnen",
      fields: [f("Geschäftliche E-Mail", "email"), f("Passwort", "password")],
      tips: ["Bei unerwarteten Freigaben lohnt sich eine kurze Rückfrage beim Absender.", "Echte Dokumentlinks verlangen Ihr Passwort nicht noch einmal.", "Schauen Sie vor dem Anmelden genau auf die Adresszeile."],
    },
    qr_phishing: {
      heading: "Registrierung erneuern", lead: "Bestätigen Sie Ihr Konto, um die Erneuerung abzuschliessen.", cta: "Weiter",
      formTitle: "Konto bestätigen", submit: "Bestätigen",
      fields: [f("Vor- und Nachname", "text"), f("Geschäftliche E-Mail", "email"), f("Passwort", "password")],
      tips: ["QR-Codes verbergen ihr Ziel. Prüfen Sie die Adresse, bevor Sie etwas eingeben.", "Plakate und Briefe lassen sich so leicht fälschen wie E-Mails.", "Nutzen Sie stattdessen die offizielle App oder das Intranet."],
    },
    supplier_fraud: {
      heading: "Neue Bankverbindung", lead: "Bitte bestätigen Sie das neue Konto für kommende Zahlungen.", cta: "Angaben prüfen",
      formTitle: "Neue Bankverbindung bestätigen", submit: "Neue Angaben bestätigen",
      fields: [f("Ihr Name", "text"), f("Freigabevermerk", "text")],
      tips: ["Bestätigen Sie Änderungen der Bankverbindung immer telefonisch, mit einer Nummer, die Sie bereits haben.", "Per E-Mail angekündigte Änderungen sind der häufigste Zahlungsbetrug.", "Wenden Sie bei jeder Änderung von Zahlungsdaten das Vier-Augen-Prinzip an."],
    },
    executive_impersonation: {
      heading: "Zahlungsfreigabe erforderlich", lead: "Eine vertrauliche Zahlung wartet auf Ihre Freigabe.", cta: "Zahlung prüfen",
      formTitle: "Zahlung freigeben", submit: "Zahlung freigeben",
      fields: [f("Ihr Name", "text"), f("Referenz", "text")],
      tips: ["Ungewöhnliche Anfragen der Geschäftsleitung verdienen einen Rückruf.", "Geheimhaltung und Zeitdruck zusammen sind ein Warnsignal.", "Überspringen Sie nie den normalen Freigabeprozess, egal wer fragt."],
    },
  },
  nl: {
    phishing: {
      heading: "Er staat een bericht voor u klaar", lead: "Ga verder om het veilig te bekijken.", cta: "Doorgaan",
      formTitle: "Log in om verder te gaan", submit: "Inloggen",
      fields: [f("E-mail", "email"), f("Wachtwoord", "password")],
      tips: ["Controleer het adres van de afzender, niet alleen de weergavenaam.", "Beweeg over links om te zien waar ze echt naartoe gaan.", "Open bij twijfel de dienst zelf in plaats van de link te gebruiken."],
    },
    credential_form: {
      heading: "Actie vereist voor uw account", lead: "Bevestig uw gegevens om toegang te houden.", cta: "Doorgaan",
      formTitle: "Bevestig uw wachtwoord", submit: "Bevestigen",
      fields: [f("E-mail", "email"), f("Huidig wachtwoord", "password")],
      tips: ["IT vraagt nooit per e-mail om uw wachtwoord.", "Korte deadlines zijn een veelgebruikt drukmiddel.", "Meld zulke berichten bij uw IT-team."],
    },
    document_link: {
      heading: "Er is een document met u gedeeld", lead: "Open het om het te bekijken en te reageren.", cta: "Document openen",
      formTitle: "Bevestig uw e-mail om het document te openen", submit: "Openen",
      fields: [f("Zakelijk e-mailadres", "email"), f("Wachtwoord", "password")],
      tips: ["Bij een onverwachte deling is een korte check bij de afzender de moeite waard.", "Echte documentlinks vragen niet opnieuw om uw wachtwoord.", "Kijk goed naar de adresbalk voordat u inlogt."],
    },
    qr_phishing: {
      heading: "Registratie vernieuwen", lead: "Bevestig uw account om de vernieuwing af te ronden.", cta: "Doorgaan",
      formTitle: "Bevestig uw account", submit: "Bevestigen",
      fields: [f("Volledige naam", "text"), f("Zakelijk e-mailadres", "email"), f("Wachtwoord", "password")],
      tips: ["QR-codes verbergen waar ze naartoe leiden. Controleer het adres voordat u iets invult.", "Posters en brieven zijn net zo makkelijk na te maken als e-mails.", "Gebruik in plaats daarvan de officiële app of het intranet."],
    },
    supplier_fraud: {
      heading: "Gewijzigde bankgegevens", lead: "Bevestig de nieuwe rekening voor komende betalingen.", cta: "Gegevens bekijken",
      formTitle: "Bevestig de nieuwe bankgegevens", submit: "Nieuwe gegevens bevestigen",
      fields: [f("Uw naam", "text"), f("Goedkeuringsnotitie", "text")],
      tips: ["Bevestig wijzigingen van bankgegevens altijd telefonisch, via een nummer dat u al heeft.", "Wijzigingen die per e-mail worden aangekondigd, zijn de meest voorkomende betalingsfraude.", "Pas het vier-ogenprincipe toe bij elke wijziging van betaalgegevens."],
    },
    executive_impersonation: {
      heading: "Goedkeuring voor betaling nodig", lead: "Een vertrouwelijke betaling wacht op uw goedkeuring.", cta: "Betaling bekijken",
      formTitle: "Betaling goedkeuren", submit: "Betaling goedkeuren",
      fields: [f("Uw naam", "text"), f("Referentie", "text")],
      tips: ["Ongebruikelijke verzoeken van de directie verdienen een terugbelletje.", "Geheimhouding en haast samen zijn een waarschuwingssignaal.", "Sla het normale goedkeuringsproces nooit over, wie het ook vraagt."],
    },
  },
};

export const DETAILS: Record<Locale, Partial<Record<ScenarioCategory, [string, string][]>>> = {
  en: {
    supplier_fraud: [["New IBAN", "CH00 0000 0000 0000 0000 0"], ["Account holder", "Sample Supplies Ltd"], ["Valid from", "Next payment run"]],
    executive_impersonation: [["Amount", "CHF 18,450.00"], ["Payee", "Sample Consulting Ltd"], ["Due", "Today"]],
  },
  de: {
    supplier_fraud: [["Neue IBAN", "CH00 0000 0000 0000 0000 0"], ["Kontoinhaber", "Muster Handels AG"], ["Gültig ab", "Nächster Zahlungslauf"]],
    executive_impersonation: [["Betrag", "CHF 18’450.00"], ["Empfänger", "Muster Consulting AG"], ["Fällig", "Heute"]],
  },
  nl: {
    supplier_fraud: [["Nieuwe IBAN", "CH00 0000 0000 0000 0000 0"], ["Rekeninghouder", "Voorbeeld Leveringen BV"], ["Geldig vanaf", "Volgende betaalrun"]],
    executive_impersonation: [["Bedrag", "CHF 18.450,00"], ["Begunstigde", "Voorbeeld Consulting BV"], ["Vervalt", "Vandaag"]],
  },
};

export const UI: Record<Locale, {
  badge: string; revealTitle: (company: string) => string; revealLead: string; tipsTitle: string; gotIt: string; thanks: string;
  unavailableTitle: string; unavailableLead: string; greeting: (name: string) => string; viewDetails: string;
}> = {
  en: {
    badge: "Security awareness simulation",
    revealTitle: (c) => `This was a practice exercise from ${c}`,
    revealLead: "Nothing you entered was sent or stored. This is a safe way to practise spotting messages like this one.",
    tipsTitle: "What to look for next time", gotIt: "Got it", thanks: "Thanks. You can close this page.",
    unavailableTitle: "This link is no longer available", unavailableLead: "It may have expired. You can close this page.",
    greeting: (n) => `Hello ${n},`, viewDetails: "View details",
  },
  de: {
    badge: "Simulation zur Sicherheitssensibilisierung",
    revealTitle: (c) => `Dies war eine Übung von ${c}`,
    revealLead: "Nichts von dem, was Sie eingegeben haben, wurde gesendet oder gespeichert. So üben Sie gefahrlos, solche Nachrichten zu erkennen.",
    tipsTitle: "Worauf Sie nächstes Mal achten können", gotIt: "Verstanden", thanks: "Danke. Sie können diese Seite schliessen.",
    unavailableTitle: "Dieser Link ist nicht mehr verfügbar", unavailableLead: "Er ist möglicherweise abgelaufen. Sie können diese Seite schliessen.",
    greeting: (n) => `Hallo ${n},`, viewDetails: "Details ansehen",
  },
  nl: {
    badge: "Simulatie voor beveiligingsbewustzijn",
    revealTitle: (c) => `Dit was een oefening van ${c}`,
    revealLead: "Niets van wat u invulde is verzonden of opgeslagen. Zo oefent u veilig om berichten als dit te herkennen.",
    tipsTitle: "Waar u de volgende keer op kunt letten", gotIt: "Begrepen", thanks: "Bedankt. U kunt deze pagina sluiten.",
    unavailableTitle: "Deze link is niet meer beschikbaar", unavailableLead: "Hij is mogelijk verlopen. U kunt deze pagina sluiten.",
    greeting: (n) => `Beste ${n},`, viewDetails: "Details bekijken",
  },
};

// When a company has a logo, internal-style mail goes out under the company's own name.
// The variant's sender name (e.g. "DocShare", "People & Culture") is replaced by a plain
// internal-team label per category, so the from line reads as e.g. "Acme AG Documents"
// rather than pairing the company with an unrelated product name.
export const BRANDED_SENDER: Record<Locale, Partial<Record<ScenarioCategory, string>>> = {
  en: { credential_form: "IT Service Desk", document_link: "Documents", qr_phishing: "IT Security" },
  de: { credential_form: "IT-Service-Desk", document_link: "Dokumente", qr_phishing: "IT-Sicherheit" },
  nl: { credential_form: "IT-servicedesk", document_link: "Documenten", qr_phishing: "IT-beveiliging" },
};
