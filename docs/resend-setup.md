# Resend setup

Resend sends Helvax's login codes, team invitations and demo requests, from `mail.helvax.ch`. It is **not** used for simulation emails; those stay off until the safety controls exist.

| Email | Sent by | How |
| --- | --- | --- |
| Sign-in code (magic link / confirm signup) | Supabase Auth | Custom SMTP through Resend |
| Team invitation | app.helvax.ch | Resend API (`apps/app/lib/email.ts`) |
| Demo request | helvax.ch | Resend API (`apps/web/app/actions.ts`) |

## 1. Add the domain
Resend → Domains → Add domain:
- Name `mail.helvax.ch` (a subdomain keeps app email reputation separate from `helvax.ch`)
- Region **EU (Ireland, eu-west-1)**. Region and return path can't be changed later.
- Leave receiving off.

## 2. DNS
Add the records Resend shows at the DNS host for `helvax.ch` (`dig +short NS helvax.ch` tells you which one). They are usually:
- `TXT resend._domainkey.mail` (DKIM)
- `MX send.mail` and `TXT send.mail` (SPF on the return path)

If `helvax.ch` has no DMARC record yet, add one in the same change:

```
_dmarc.helvax.ch  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@helvax.ch"
```

Raise `p=none` to `quarantine` once reports look clean. Then press **Verify** in Resend and wait for "Verified".

## 3. API keys
Resend → API Keys. Create three keys, each with **Sending access** only and restricted to `mail.helvax.ch`:

| Key name | Goes into |
| --- | --- |
| Supabase SMTP | Supabase → Authentication → Emails → SMTP Settings, as the password ([supabase-setup.md](supabase-setup.md) step 4) |
| app.helvax.ch | Vercel, app.helvax.ch project, `RESEND_API_KEY` |
| helvax.ch | Vercel, helvax.ch project, `RESEND_API_KEY` |

Separate keys mean one can be revoked without breaking the others. Never put a key in the repo or in chat. If one leaks, revoke it in Resend and make a new one.

Optional Vercel variables: `EMAIL_FROM` (app) and `DEMO_REQUEST_FROM` (site) override the default sender `Helvax <hello@mail.helvax.ch>`. Redeploy both projects after changing variables.

## 4. Supabase sending limit
With custom SMTP on, Supabase caps auth emails at a low hourly rate. Authentication → Rate Limits → "Rate limit for sending emails": raise it to about 100 per hour.

## 5. Test
1. Sign in at app.helvax.ch with your own address. The code email should come from `hello@mail.helvax.ch`.
2. Invite a second address of yours from Settings → Team.
3. Send a demo request from helvax.ch.
4. In Resend → Emails, each one should show **Delivered**. The Insights tab flags deliverability problems.

If a send fails, check in this order: the domain is verified, the sender is on `mail.helvax.ch`, the key is the right one for that project.

## How the app sends
`sendEmail` retries network errors, `429` (honouring `retry-after`) and `5xx` up to three times, and never retries other `4xx`. Invitations pass an `Idempotency-Key` built from the invitation, so a retry can't send the same invitation twice.
