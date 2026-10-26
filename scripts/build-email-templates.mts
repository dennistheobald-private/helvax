// Builds the Supabase Auth email templates in supabase/templates/ from the shared
// Helvax email layout. Run after changing packages/ui/email.ts:
//   node --experimental-strip-types scripts/build-email-templates.mts
// Then paste each file into Supabase → Authentication → Emails, with the subject below
// (supabase/config.toml points local dev at the same files).
// {{ ... }} are Supabase's Go template variables and must stay as they are.

import { writeFileSync } from "node:fs";
import { emailLayout, p, strong } from "../packages/ui/email.ts";

const confirm = (type: string) => `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=${type}`;
const notMe = "If this wasn't you, tell your company's Helvax admin right away.";

const templates: Record<string, { subject: string; html: string }> = {
  // Magic Link and Confirm signup both send the passwordless sign-in code.
  "sign-in": {
    subject: "Your Helvax sign-in code",
    html: emailLayout({
      preheader: "Your one-time code is inside. It works once and expires in 1 hour.",
      title: "Your sign-in code",
      body: p("Enter this code on the Helvax login page to sign in."),
      code: "{{ .Token }}",
      button: { label: "Or sign in with one click", url: confirm("email") },
      note: "The code and link work once and expire in 1 hour. If you didn't try to sign in, you can ignore this email.",
    }),
  },
  invite: {
    subject: "You've been invited to Helvax",
    html: emailLayout({
      preheader: "Accept your invitation to Helvax.",
      title: "You've been invited to Helvax",
      body: p(`You've been invited to Helvax with ${strong("{{ .Email }}")}. Accept the invitation to set up your account.`),
      button: { label: "Accept invitation", url: confirm("invite") },
      note: "The link works once. If you weren't expecting this invitation, you can ignore this email.",
    }),
  },
  "email-change": {
    subject: "Confirm your new email address",
    html: emailLayout({
      preheader: "Confirm the change to your Helvax sign-in email.",
      title: "Confirm your new email address",
      body: p(`You asked to change your Helvax sign-in email from ${strong("{{ .Email }}")} to ${strong("{{ .NewEmail }}")}.`),
      code: "{{ .Token }}",
      button: { label: "Confirm new address", url: confirm("email_change") },
      note: `The code and link expire in 1 hour. ${notMe}`,
    }),
  },
  recovery: {
    subject: "Reset your Helvax access",
    html: emailLayout({
      preheader: "Use this code or link to get back into Helvax.",
      title: "Get back into your account",
      body: p(`We received a request to recover access for ${strong("{{ .Email }}")}.`),
      code: "{{ .Token }}",
      button: { label: "Recover access", url: confirm("recovery") },
      note: "The code and link work once and expire in 1 hour. If you didn't ask for this, you can ignore this email.",
    }),
  },
  reauthentication: {
    subject: "Confirm it's you",
    html: emailLayout({
      preheader: "Your confirmation code for a sensitive change in Helvax.",
      title: "Confirm it's you",
      body: p("Enter this code in Helvax to confirm a sensitive change to your account."),
      code: "{{ .Token }}",
      note: `The code expires in 1 hour. ${notMe}`,
    }),
  },
  // Security notifications (Authentication → Emails → Security notifications).
  "email-changed-notification": {
    subject: "Your Helvax email address was changed",
    html: emailLayout({
      preheader: "The sign-in email on your Helvax account was changed.",
      title: "Your email address was changed",
      body: p(`The sign-in email for your Helvax account changed from ${strong("{{ .OldEmail }}")} to ${strong("{{ .Email }}")}.`),
      note: notMe,
    }),
  },
  "mfa-enrolled-notification": {
    subject: "Two-factor authentication turned on",
    html: emailLayout({
      preheader: "A new sign-in factor was added to your Helvax account.",
      title: "Two-factor authentication is on",
      body: p(`A new ${strong("{{ .FactorType }}")} sign-in factor was added to ${strong("{{ .Email }}")}. From now on you'll confirm each sign-in with it.`),
      note: notMe,
    }),
  },
  "mfa-unenrolled-notification": {
    subject: "A sign-in factor was removed",
    html: emailLayout({
      preheader: "A sign-in factor was removed from your Helvax account.",
      title: "A sign-in factor was removed",
      body: p(`A ${strong("{{ .FactorType }}")} sign-in factor was removed from ${strong("{{ .Email }}")}.`),
      note: notMe,
    }),
  },
};

for (const [name, t] of Object.entries(templates)) {
  writeFileSync(new URL(`../supabase/templates/${name}.html`, import.meta.url), t.html);
  console.log(`${name}.html  ·  subject: ${t.subject}`);
}
