# Simulation engine and safety controls

The engine plans, sends and observes simulations. It is built so that nothing reaches an employee unless several independent people and checks allow it. **Sending is off.** Turning it on is Dennis's decision.

## The switches

Every message needs all of these. Any one of them off means nothing is sent.

| Switch | Who | Where |
| --- | --- | --- |
| Platform sending | Helvax superadmin with MFA | `/admin` (typing SEND to confirm), or `set_platform_sending(true)`; off by default. Turning it off returns queued messages to planned |
| Company approval | Helvax superadmin with MFA, after the safety review | `/admin`, or `approve_tenant_sending(t, true)`. Revoking it also turns the company off and cancels planned simulations |
| Awareness notice | Company owner with MFA | Simulations page, "I confirm employees were informed" |
| Company sending | Owner with MFA turns it on, any admin turns it off | Simulations page. Turning off cancels everything planned |

Then, for every single message, `engine_claim_due` checks again: the employee is active and not excluded, their domain is verified, the address isn't suppressed after a bounce or complaint, the scenario is approved and turned on, and the message is not more than a day late. Sample data is never sent.

## How it runs

`GET /api/engine/cron` (with `Authorization: Bearer $CRON_SECRET`) does four things:

1. Closes observation windows: results still pending 72 hours after sending are decided.
2. Plans the next 30 days for companies that are allowed to send: a random day and time per person (any day, any hour, in the company time zone), at least the cooldown apart, with the scenario they've seen least recently.
3. Sends what is due through Resend, from the simulation domain, with a signed link and a signed reply address. Messages carry the header `X-Helvax-Simulation: 1`, so a company's gateway can recognise them.
4. Builds monthly reports. From the 4th of each month (company time zone), once the last observation windows have closed, `engine_build_reports` freezes last month's report for every company that sent real simulations, replacing a sample report for the same month. `engine_reports_to_send` then lists unsent reports with their owners and admins, who get one email each with company totals only (no names or per-person results) and a link to `/reports/YYYY-MM`. A report is marked sent once at least one person received it; until then it is retried, and Resend idempotency keys prevent duplicates.

No schedule is configured yet. When sending is released, add a Vercel cron for this route (every 15 minutes needs a Pro plan) or call it from Supabase `pg_cron`.

## Variation

The same person should rarely see the same message twice. Three things vary each send:

- **Scenario and timing**: the planner picks a random day and time per person and the scenario they've seen least recently (see "How it runs").
- **Template variants**: a scenario can have several interchangeable versions per language in `scenario_variants`. `engine_claim_due` picks one approved, enabled variant at random for the employee's language, falling back to the scenario's translation and then its English base. The scenario's original wording is kept as one variant, so nothing is lost.
- **Merge tokens**: a variant's subject, preview or sender name may contain placeholders such as `{{invoice_no}}`, `{{due_date}}`, `{{amount}}`, `{{ref}}` or `{{first_name}}`. `lib/engine/merge.ts` fills them per send with plausible generated values, derived from the simulation id so an idempotent resend produces an identical message. Nothing generated is stored or read back; it only shapes what is sent. Unknown placeholders are removed.
- **Sender identities**: each scenario category has a pool of from-addresses in `sender_identities` (e.g. `it-helpdesk`, `accounts`, `office`). `engine_claim_due` picks one at random, so messages don't all share a return address. An identity may also carry its own sending domain for when more than one Helvax-owned sending domain is in use; a null domain (the default, and all that is seeded) means `SIMULATION_FROM_DOMAIN`. Any domain set here must be a Helvax-owned domain verified in Resend.
- **Company branding**: a company can store a logo (`tenants.logo_url`, set via `set_company_logo`, which needs an admin and a verified domain). When it has one, internal-style scenarios (categories `credential_form`, `document_link`, `qr_phishing`) go out with the company's name and logo — the sender shows as e.g. "Acme IT Service Desk" and the email carries the logo. `dispatch.ts` looks the logo and category up per batch; it never sends from or spoofs the company's real domain. Helvax-owned lookalike domains are a planned future improvement, not built yet.

## Languages

Each employee has a language (English, German or Dutch), set when adding them, in the CSV (`language` column: `en`, `de`, `nl`, or the language's name) or later on the Employees page. New people get the company's language. Simulation emails, practice pages and the reveal afterwards use that language; scenario text lives in `scenario_translations` and falls back to English. German uses Swiss spelling.

## Practice pages

Links go to `https://$SIMULATION_HOST/p/<token>`. Once `SIMULATION_HOST` is set, that domain serves only practice pages, and practice pages are served nowhere else. They never read or set Helvax sign-in cookies.

- Opening the link records a link request (L1), labelled scanner, automation or unknown from the user agent, the request method and the time since delivery.
- JavaScript reports pointer and key activity; only then can later steps be attributed to a person.
- Pressing the first button records a deliberate interaction (L2).
- Submitting the practice form records the completed action (L3). **The fields have no names, are cleared on submit and are never read or sent.** Only the fact that the step happened is recorded.
- The page then says it was a simulation from the company, with tips (the training moment).

## Replies and bounces

`POST /api/engine/inbound` receives Resend webhooks, verified with `RESEND_WEBHOOK_SECRET`:

- `email.received` to `r<token>@$SIMULATION_REPLY_DOMAIN`: the reply's own words (quotes and signatures removed) are classified by deterministic rules in English, German and Dutch (`lib/engine/classify.ts`, `rules-v1`). Only a 280-character excerpt is stored. Risky and ambiguous replies wait for review before they can count.
- `email.bounced` and `email.complained`: the simulation is marked undelivered and the address suppressed.

## Environment variables (app.helvax.ch project)

| Name | Value |
| --- | --- |
| `SIMULATION_TOKEN_SECRET` | 32+ random characters, e.g. `openssl rand -hex 32`. Changing it invalidates all links |
| `SIMULATION_HOST` | the simulation domain, e.g. `secure-notice.example`, pointed at the app project |
| `SIMULATION_FROM_DOMAIN` | the sending domain, verified in Resend |
| `SIMULATION_REPLY_DOMAIN` | the domain whose inbound mail Resend forwards to `/api/engine/inbound` |
| `RESEND_WEBHOOK_SECRET` | the signing secret of that webhook (`whsec_…`) |
| `CRON_SECRET` | random secret for the cron route |

## Before the first real send

- Choose and register the simulation domains (separate from helvax.ch), set up SPF, DKIM and DMARC in Resend.
- Run a pilot with Helvax's own addresses, with the platform switch on only for that pilot company.
- Review the practice pages and emails in German and Dutch (phase 7).
- Dennis decides when the platform switch goes on.
