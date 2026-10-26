<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="packages/ui/logo/helvax-split-lockup-dark.svg">
    <img src="packages/ui/logo/helvax-split-lockup.svg" alt="Helvax" width="280">
  </picture>
</p>

<p align="center"><strong>Security-awareness simulations that run all year, with no mailbox connection.</strong></p>

Helvax is a multi-tenant SaaS that sends randomized, realistic security-awareness simulations to a company's employees: phishing, supplier fraud, executive impersonation, QR phishing, document links and safe credential forms. It doesn't need access to the customer's Gmail, Outlook or Microsoft 365. An admin uploads the employee roster, chooses templates and how often people are tested, and receives a monthly report with a secure link to the dashboard.

Measurement is honest: automated mail scanners are labelled separately from real human clicks, and Helvax never collects real passwords, MFA codes or banking details. Pricing is CHF 2 per employee per month or CHF 12 per employee per year.

## What's in this repo

| Path | What it is | Deploys to |
| --- | --- | --- |
| `apps/web` | Marketing site: product, pricing, FAQ, demo request | helvax.ch |
| `apps/app` | The app: login, teams, employees, simulations, activity, reports, settings | app.helvax.ch |
| `packages/ui` | Helvax UI: design tokens, CSS components, showcase (`index.html`) and React wrappers (`react/`) | |
| `packages/config` | Shared TypeScript config and Next.js settings (security headers) | |
| `supabase` | Database migrations with row-level security, tests, auth email template | Supabase |

Both apps are Next.js (App Router) with React and TypeScript, managed with pnpm workspaces and Turborepo. Auth and data will run on Supabase, and email on Resend.

## Getting started

Needs Node 22+ and pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm dev          # both apps: web on :3000, app on :3001
pnpm dev:web      # only the marketing site
pnpm dev:app      # only the app
pnpm build        # production build of everything
pnpm typecheck
```

Database tests run on plain Postgres: `DATABASE_URL=postgres://… supabase/tests/run.sh` (CI does this on every PR). Dashboard settings for auth, email and MFA are in [docs/supabase-setup.md](docs/supabase-setup.md).

Copy `.env.example` to `apps/app/.env.local` (and `apps/web/.env.local` if needed) for local settings. Never commit real keys.

## Deploying on Vercel

Create two Vercel projects from this repository:

| Project | Root directory | Domain |
| --- | --- | --- |
| helvax-web | `apps/web` | `helvax.ch`, `www.helvax.ch` |
| helvax-app | `apps/app` | `app.helvax.ch` |

Vercel detects Next.js and pnpm on its own. Functions run in Frankfurt (`fra1`, set in each `vercel.json`). Set the variables from `.env.example` in each project's settings; server-only keys such as `SUPABASE_SERVICE_ROLE_KEY` go there, never in the code.

## Roadmap

1. ✓ Foundation: monorepo, React wrappers, app shells, Vercel
2. ✓ Marketing site with animations and country-based pricing (CHF, or EUR in the EU)
3. ✓ Supabase auth with MFA, tenants, teams and roles, schema with row-level security
4. ✓ Employees, company domains, scenario library, schedule, evidence-based results ([how results are verified](docs/verification.md)) and sample data
5. ✓ Simulation engine with safety controls ([how sending is controlled](docs/engine.md)); sending stays off until released
6. Monthly reports and exports
7. Billing, German and Dutch, admin console, pilot
