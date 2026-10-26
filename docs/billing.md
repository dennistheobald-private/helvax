# Billing

One plan, priced per active employee:

- **Monthly** (the default): CHF 3 per employee per month.
- **Yearly contract**: CHF 24 per employee per year, which is CHF 2 a month and 33% less.

EU customers can pay in EUR when EUR prices are configured. Paused employees, people who left and sample data are never billed.

## How it works

- Owners open **Billing** in the app and continue to Stripe Checkout. Stripe collects the billing address and a VAT number if there is one. Helvax never sees card details.
- Stripe sends `checkout.session.completed` and `customer.subscription.*` webhooks to `POST /api/billing/webhook`. The signature is checked, and each event is applied only once (`billing_events`). The subscription is read back from Stripe every time, so late or out-of-order events can't store stale state.
- `billing_accounts` holds each company's status, interval, currency, seats and renewal date. Members can read it, and only the server writes it.
- The engine cron keeps the seat count equal to the active employees, with proration.
- Owners manage invoices, payment methods, plan changes and cancellation in Stripe's customer portal.

Nothing is blocked when a company hasn't subscribed yet. Gating features by plan comes later, together with the Free plan (one employee) shown on the website.

## Setup in Stripe

1. Create a product "Helvax" with these recurring prices, billed per unit:
   - CHF 3.00 per month
   - CHF 24.00 per year
   - optionally, EUR prices for both intervals
2. Turn on the customer portal (Settings → Billing → Customer portal). Allow payment method updates, invoice history and cancellation. To let people switch between monthly and yearly, add both prices to the product catalogue there.
3. Add a webhook endpoint `https://app.helvax.ch/api/billing/webhook` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`.
4. In the **helvax** (app) Vercel project, set:

| Variable | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_live_...` (use `sk_test_...` for previews) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from the webhook endpoint |
| `STRIPE_PRICE_CHF_MONTH`, `STRIPE_PRICE_CHF_YEAR` | the CHF price ids (`price_...`) |
| `STRIPE_PRICE_EUR_MONTH`, `STRIPE_PRICE_EUR_YEAR` | optional, the EUR price ids |

The Billing page reads the amounts from these Stripe prices, so the page always matches the invoice.
