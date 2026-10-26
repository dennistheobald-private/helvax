# How Helvax verifies results

Helvax measures what people actually did, not what a mail scanner did. Every simulation ends with exactly one result, decided by fixed rules from recorded evidence. Only verified risky actions count as failures.

## Evidence levels

Every observed event gets an evidence level.

| Level | Meaning | Counts as failure? |
| --- | --- | --- |
| L0 | Sent and accepted by the mail provider, or bounced | No |
| L1 | The signed link or QR link was requested. Mail scanners do this too | No |
| L2 | A deliberate interaction on the page, such as pressing Continue | No, it only corroborates |
| L3 | A completed simulated security-sensitive action: a practice sign-in, a fictional bank-detail change, a payment approval, a reply agreeing to the request | Yes, if a person is credibly behind it |
| L4 | A risky action confirmed by several independent signals | Yes |

Every event also records who most likely caused it (`actor`): `human_likely`, `unknown`, `scanner` or `automation`, plus the detection signals behind that call.

## Results

| Result | When |
| --- | --- |
| `verified_risky` | L3 by a likely person in a corroborated session, or a reply agreeing to the request that a reviewer confirmed. L4 when there is a second independent signal (a deliberate click in the same session, or the synthetic test marker in the reply) |
| `suspected` | An L3 action without enough signs of a person, or an unreviewed reply that looks like agreement. It waits for review and does not count |
| `inconclusive` | Some activity (link request, click, unclear reply) but not enough evidence either way. Never counted as a failure |
| `scanner_only` | Only scanners or automated browsers touched the link |
| `verified_safe` | A reply that verifies the request through another channel or refuses it (reviewed, or confidence at least 0.8) |
| `no_interaction` | Delivered and nothing seen. This is not proof of safe behaviour |
| `pending` | Still inside the 72-hour observation window |
| `not_delivered` | Bounced or failed |

**Verified Risky Action Rate** = `verified_risky` ÷ eligible simulations. Eligible means delivered and no longer pending. Delivery and the share of clear results are reported next to it, so a low rate can't hide poor coverage.

## Rules v1

`private.decide_outcome()` in `supabase/migrations/20261026200150_verification_rules.sql` applies these checks in order. The first match wins.

1. Bounced or failed → `not_delivered`.
2. A reviewed reply agreeing to the request → `verified_risky` (L4 with the test marker or a completed action, otherwise L3).
3. A completed action by a likely person, in a session where JavaScript ran, there was pointer input and the network isn't a data centre or security vendor → `verified_risky` (L4 with a deliberate click in the same session, otherwise L3).
4. An unreviewed reply that looks like agreement → `suspected`.
5. A completed action without credible signs of a person → `suspected`.
6. A verification or refusal reply → `verified_safe`.
7. Any activity by a person or an unknown actor, or an ambiguous reply → `inconclusive`.
8. Only scanner or automation events → `scanner_only`.
9. Sent within the observation window → `pending`.
10. Otherwise → `no_interaction`.

A link request alone can never lead to `suspected` or `verified_risky`.

## Integrity and reproducibility

- Events and decisions are append-only. Database triggers reject updates.
- Each decision stores the rule version, the event ids it used and a plain-language explanation. The current result points to the latest decision; earlier ones stay visible in the app.
- Running the rules again on the same evidence gives the same result and adds no new decision.
- Reviewer decisions are new decisions with the reviewer's name and reason. The engine's decision is kept.
- Monthly reports are frozen snapshots. A database trigger rejects any change to a report's contents, so a later review never changes a report that was already created. A report counts either real simulations or sample data, never both. Reports can be downloaded as CSV (company and group totals) or printed and saved as a PDF.
- Results tables are written only by the engine. Members can read their own company's results; nobody can write them from the browser.

## Techniques

- Signed, expiring tokens per simulation and recipient.
- Landing-page sessions that correlate the link request, interactions and the completed action.
- Scanner and automation detection: timing after delivery, known security-vendor and data-centre networks, missing JavaScript or pointer input.
- Reply intake through Helvax mailboxes with reply tokens and headers, classified by deterministic rules plus an AI classifier, with human review for anything that would count.
- Practice pages only ever show dummy fields. Nothing typed is stored, and real passwords, MFA codes or bank details are never collected.

## Quality targets

These are engineering targets to validate in pilots. They are not claims.

- Fewer than 0.5% of `verified_risky` results are false positives, measured by reviewing a sample against employee feedback.
- Scanner traffic from Microsoft Safe Links, Google and common mail gateways is labelled `scanner_only` and never counts.
- No employee fails because of a link visit alone (covered by a database test).
- Ambiguous replies always go to review before they count.
- Every result can be explained from its stored evidence and rule version (covered by a database test).
- Each result category is reported separately.

The database tests in `supabase/tests/20_verification.sql` and `40_reports.sql` check the rules that can be checked automatically.
