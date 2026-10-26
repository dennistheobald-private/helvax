import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Alert, Badge, Card } from "@helvax/ui/react";
import { availableCurrencies, billingConfigured, priceId, stripe, type BillingCurrency } from "@/lib/billing";
import { formatDate } from "@/lib/results";
import { requireSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { openPortal } from "./actions";
import { CheckoutForm, type PriceLabels } from "./forms";

export const metadata: Metadata = { title: "Billing" };

const EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]);

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  active: { label: "Active", tone: "success" },
  trialing: { label: "Trial", tone: "success" },
  past_due: { label: "Payment overdue", tone: "danger" },
  unpaid: { label: "Unpaid", tone: "danger" },
  incomplete: { label: "Waiting for payment", tone: "warning" },
  canceled: { label: "Cancelled", tone: "neutral" },
};

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

/** Price labels straight from the configured Stripe prices, so the page never disagrees with the invoice. */
async function priceLabels(): Promise<Partial<PriceLabels>> {
  const out: Partial<PriceLabels> = {};
  for (const c of availableCurrencies()) {
    const [m, y] = await Promise.all([
      stripe<{ unit_amount: number }>("GET", `prices/${priceId(c, "month")}`),
      stripe<{ unit_amount: number }>("GET", `prices/${priceId(c, "year")}`),
    ]);
    out[c] = {
      month: money(m.unit_amount, c),
      year: money(Math.round(y.unit_amount / 12), c),
      yearTotal: money(y.unit_amount, c),
      save: Math.round((1 - y.unit_amount / (m.unit_amount * 12)) * 100),
    };
  }
  return out;
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const s = await requireSession();
  if (!s.isAdmin) redirect("/overview");
  const { done } = await searchParams;
  const supabase = await createClient();
  const { data: account } = await supabase.from("billing_accounts").select("*").eq("tenant_id", s.tenant.id).maybeSingle();
  const admin = createAdminClient();
  const { data: seats } = admin ? await admin.rpc("billable_employees", { t: s.tenant.id }) : { data: 0 };
  const subscribed = account?.stripe_subscription_id && account.status !== "canceled";
  const status = STATUS[account?.status ?? ""];
  const country = (await headers()).get("x-vercel-ip-country")?.toUpperCase() ?? "";
  const defaultCurrency: BillingCurrency = EU.has(country) ? "eur" : "chf";

  return (
    <div className="page">
      {done && !subscribed && <Alert tone="info" title="Payment received">Your subscription is being set up. Refresh in a moment.</Alert>}
      <Card className="section">
        <header>
          <h2>Billing</h2>
          <p className="muted">One plan, priced per active employee. Paused employees and sample data are never billed.</p>
        </header>

        {subscribed && account ? (
          <div className="billing-current">
            <dl className="hx-report__grid">
              <div className="hx-report__metric"><dt>Status</dt><dd>{status ? <Badge tone={status.tone}>{status.label}</Badge> : account.status}</dd></div>
              <div className="hx-report__metric"><dt>Billed</dt><dd>{account.interval === "year" ? "Yearly" : "Monthly"} · {account.currency?.toUpperCase()}</dd></div>
              <div className="hx-report__metric"><dt>Seats</dt><dd>{account.quantity ?? "–"}</dd></div>
              <div className="hx-report__metric"><dt>{account.cancel_at_period_end ? "Ends on" : "Renews on"}</dt><dd>{account.current_period_end ? formatDate(account.current_period_end, s.tenant.timezone) : "–"}</dd></div>
            </dl>
            {s.isOwner ? (
              <form action={openPortal}><button type="submit" className="hx-btn hx-btn--outline">Manage billing, invoices and payment method</button></form>
            ) : <p className="muted">Owners manage billing.</p>}
          </div>
        ) : !billingConfigured() ? (
          <p className="muted">Billing isn&apos;t switched on yet. You can keep using Helvax in the meantime.</p>
        ) : s.isOwner ? (
          <CheckoutForm prices={await priceLabels()} defaultCurrency={defaultCurrency} seats={seats ?? 0} />
        ) : (
          <p className="muted">An owner can set up billing for {s.tenant.name}.</p>
        )}
      </Card>
    </div>
  );
}
