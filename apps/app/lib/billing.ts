import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "./supabase/admin";

// Stripe billing, through Stripe's REST API. Nothing here runs until STRIPE_SECRET_KEY and
// the price ids are set. Prices are per employee, configured as Stripe prices: CHF 3 a month
// on monthly billing (the default), or CHF 24 a year on a yearly contract (CHF 2 a month,
// 33% less). EUR equivalents for EU customers.

export type Interval = "month" | "year";
export type BillingCurrency = "chf" | "eur";

const PRICE_ENV: Record<BillingCurrency, Record<Interval, string>> = {
  chf: { month: "STRIPE_PRICE_CHF_MONTH", year: "STRIPE_PRICE_CHF_YEAR" },
  eur: { month: "STRIPE_PRICE_EUR_MONTH", year: "STRIPE_PRICE_EUR_YEAR" },
};

export function priceId(currency: BillingCurrency, interval: Interval): string | null {
  return process.env[PRICE_ENV[currency][interval]] || null;
}

export function billingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && priceId("chf", "month") && priceId("chf", "year"));
}

/** Currencies with both prices set. */
export function availableCurrencies(): BillingCurrency[] {
  return (["chf", "eur"] as const).filter((c) => priceId(c, "month") && priceId(c, "year"));
}

type Params = Record<string, string | number | boolean | undefined>;

/** Calls the Stripe API with form-encoded parameters (nested keys like `line_items[0][price]`). */
export async function stripe<T = Record<string, unknown>>(method: "GET" | "POST", path: string, params: Params = {}, idempotencyKey?: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.append(k, String(v));
  const url = `https://api.stripe.com/v1/${path}${method === "GET" && body.size ? `?${body}` : ""}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2025-09-30.clover",
      ...(idempotencyKey && { "Idempotency-Key": idempotencyKey }),
    },
    body: method === "POST" ? body : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe ${path}: ${json.error?.message ?? res.status}`);
  return json;
}

/** Checks the Stripe-Signature header (v1 scheme, 5-minute tolerance). */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return parts.some(([k, v]) => {
    if (k !== "v1" || !v || v.length !== expected.length * 2) return false;
    return timingSafeEqual(Buffer.from(v, "hex"), expected);
  });
}

export type StripeSubscription = {
  id: string; customer: string; status: string; cancel_at_period_end: boolean; metadata?: Record<string, string>;
  items: { data: { id: string; quantity: number; current_period_end?: number; price: { currency: string; recurring: { interval: Interval } | null } }[] };
};

/** Stores a subscription's current state. Stripe is the source of truth. */
export async function saveSubscription(sub: StripeSubscription, tenantId?: string) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase secret key is not set");
  const item = sub.items.data[0];
  const row = {
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    subscription_item_id: item?.id ?? null,
    status: sub.status,
    interval: item?.price.recurring?.interval ?? null,
    currency: (item?.price.currency ?? null) as BillingCurrency | null,
    quantity: item?.quantity ?? null,
    current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
  const tenant = tenantId ?? sub.metadata?.tenant_id;
  if (tenant) {
    await admin.from("billing_accounts").upsert({ tenant_id: tenant, ...row }, { onConflict: "tenant_id" });
  } else {
    await admin.from("billing_accounts").update(row).eq("stripe_customer_id", sub.customer);
  }
}

/** Keeps each subscription's seat count equal to the company's active employees. */
export async function syncSeats(): Promise<number> {
  const admin = createAdminClient();
  if (!admin || !process.env.STRIPE_SECRET_KEY) return 0;
  const { data: accounts } = await admin.from("billing_accounts").select("tenant_id, subscription_item_id, quantity")
    .in("status", ["active", "trialing", "past_due"]).not("subscription_item_id", "is", null);
  let changed = 0;
  for (const a of accounts ?? []) {
    const { data: seats } = await admin.rpc("billable_employees", { t: a.tenant_id });
    const want = Math.max(1, seats ?? 0);
    if (want === a.quantity) continue;
    // Prorated: added people are charged for the rest of the period, removed people credited.
    await stripe("POST", `subscription_items/${a.subscription_item_id}`, { quantity: want, proration_behavior: "create_prorations" },
      `seats/${a.subscription_item_id}/${want}/${new Date().toISOString().slice(0, 10)}`);
    await admin.from("billing_accounts").update({ quantity: want, updated_at: new Date().toISOString() }).eq("tenant_id", a.tenant_id);
    changed++;
  }
  return changed;
}
