"use server";

import { redirect } from "next/navigation";
import { billingConfigured, priceId, stripe, type BillingCurrency, type Interval } from "@/lib/billing";
import { requireSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { appOrigin } from "@/lib/urls";

export interface FormState {
  error?: string;
}

/** Starts a Stripe Checkout for the company's subscription. Owners only. */
export async function startCheckout(_prev: FormState, form: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!s.isOwner) return { error: "Only an owner can set up billing." };
  const admin = createAdminClient();
  if (!billingConfigured() || !admin) return { error: "Billing isn't available yet." };
  const interval: Interval = form.get("interval") === "year" ? "year" : "month";
  const currency: BillingCurrency = form.get("currency") === "eur" ? "eur" : "chf";
  const price = priceId(currency, interval);
  if (!price) return { error: "That currency isn't available yet." };

  const { data: account } = await admin.from("billing_accounts").select("stripe_customer_id, stripe_subscription_id, status").eq("tenant_id", s.tenant.id).maybeSingle();
  if (account?.stripe_subscription_id && account.status !== "canceled") return { error: "This company already has a subscription. Use Manage billing." };

  let url: string;
  try {
    url = await createCheckout(s, admin, price, account?.stripe_customer_id);
  } catch (err) {
    console.error("Checkout failed", err);
    return { error: "Couldn't start the payment. Try again." };
  }
  redirect(url);
}

async function createCheckout(
  s: Awaited<ReturnType<typeof requireSession>>, admin: NonNullable<ReturnType<typeof createAdminClient>>, price: string, existing?: string,
): Promise<string> {
  let customer = existing;
  if (!customer) {
    const c = await stripe<{ id: string }>("POST", "customers", {
      name: s.tenant.name, email: s.email, "metadata[tenant_id]": s.tenant.id,
    }, `customer/${s.tenant.id}`);
    customer = c.id;
    await admin.from("billing_accounts").insert({ tenant_id: s.tenant.id, stripe_customer_id: customer });
  }

  const { data: seats } = await admin.rpc("billable_employees", { t: s.tenant.id });
  const origin = await appOrigin();
  const session = await stripe<{ url: string }>("POST", "checkout/sessions", {
    mode: "subscription",
    customer,
    client_reference_id: s.tenant.id,
    "line_items[0][price]": price,
    "line_items[0][quantity]": Math.max(1, seats ?? 0),
    "subscription_data[metadata][tenant_id]": s.tenant.id,
    billing_address_collection: "required",
    "tax_id_collection[enabled]": true,
    "customer_update[name]": "auto",
    "customer_update[address]": "auto",
    allow_promotion_codes: true,
    success_url: `${origin}/billing?done=1`,
    cancel_url: `${origin}/billing`,
  });
  return session.url;
}

/** Opens Stripe's billing portal: payment method, invoices, plan changes, cancellation. */
export async function openPortal(): Promise<void> {
  const s = await requireSession();
  const admin = createAdminClient();
  if (!s.isOwner || !admin || !process.env.STRIPE_SECRET_KEY) redirect("/billing");
  const { data: account } = await admin.from("billing_accounts").select("stripe_customer_id").eq("tenant_id", s.tenant.id).maybeSingle();
  if (!account) redirect("/billing");
  const portal = await stripe<{ url: string }>("POST", "billing_portal/sessions", {
    customer: account.stripe_customer_id, return_url: `${await appOrigin()}/billing`,
  });
  redirect(portal.url);
}
