# Supabase setup

One-time settings in the Supabase dashboard for project `bdslminoysfjsetgljlb`. The database schema itself lives in `supabase/migrations` and is applied by the GitHub integration.

## 1. Connect GitHub (applies migrations)
Project Settings → Integrations → GitHub: connect `dennistheobald-private/helvax`, Supabase directory `supabase`, production branch `main`. Every merge to `main` then runs new migrations.

## 2. URLs
Authentication → URL Configuration:
- Site URL: `https://app.helvax.ch`
- Redirect URLs: `https://app.helvax.ch/auth/confirm`, `http://localhost:3001/auth/confirm`

## 3. Email sign-in
Authentication → Sign In / Providers → Email: enabled. "Confirm email" can stay on.

Authentication → Emails → Templates: in both **Magic Link** and **Confirm signup**, set the subject to `Your Helvax sign-in code` and paste the body of `supabase/templates/sign-in.html`. It contains the 6-digit code (`{{ .Token }}`) and a link to `/auth/confirm`.

## 4. Send auth email through Resend
Authentication → Emails → SMTP Settings → enable custom SMTP:
- Host `smtp.resend.com`, port `465`, user `resend`, password = the **Supabase SMTP** key from Resend
- Sender `hello@mail.helvax.ch`, name `Helvax`

The domain `mail.helvax.ch` must be verified in Resend first. All Resend steps are in [resend-setup.md](resend-setup.md).

## 5. MFA
Authentication → Multi-Factor → enable TOTP (App Authenticator). Owners and admins must use it; the app sends them to set it up after their first sign-in.

## 6. Vercel environment variables
On the **app.helvax.ch** project:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bdslminoysfjsetgljlb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key |
| `NEXT_PUBLIC_APP_URL` | `https://app.helvax.ch` |
| `RESEND_API_KEY` | the **app.helvax.ch** sending key from Resend (invitation emails) |
| `SUPABASE_SECRET_KEY` | the `sb_secret_…` key (Supabase → Project Settings → API keys). Server-only, used to mark a company domain verified after its DNS check. Never prefix it with `NEXT_PUBLIC_`. |

On the **helvax.ch** project: `RESEND_API_KEY`, `DEMO_REQUEST_TO` (the inbox for demo requests) and `NEXT_PUBLIC_APP_URL`.

## Making someone a platform superadmin
Superadmins get a "Helvax admin" page at `/admin` (with MFA): every company's sending readiness, approval after the safety review, and the platform sending switch. The superadmin also needs to belong to at least one company to open the app. Only the service role can set the flag, in the SQL editor:

```sql
update public.profiles set is_superadmin = true where email = 'you@helvax.ch';
```
