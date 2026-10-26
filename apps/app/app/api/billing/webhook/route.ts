import { NextResponse, type NextRequest } from "next/server";
import { saveSubscription, stripe, verifyStripeSignature, type StripeSubscription } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };

// Stripe tells us about checkouts and subscription changes here. Every change is read
// back from Stripe, so events arriving late or out of order can't store stale state.
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const admin = createAdminClient();
  if (!secret || !admin || !process.env.STRIPE_SECRET_KEY) return new NextResponse("Not configured", { status: 503 });

  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return new NextResponse("Invalid signature", { status: 400 });
  }
  const event = JSON.parse(payload) as StripeEvent;
  const { data: seen } = await admin.from("billing_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  const obj = event.data.object;
  if (event.type === "checkout.session.completed" && obj.mode === "subscription" && typeof obj.subscription === "string") {
    const sub = await stripe<StripeSubscription>("GET", `subscriptions/${obj.subscription}`);
    await saveSubscription(sub, (obj.client_reference_id as string | null) ?? undefined);
  } else if (event.type.startsWith("customer.subscription.") && typeof obj.id === "string") {
    const sub = await stripe<StripeSubscription>("GET", `subscriptions/${obj.id}`);
    await saveSubscription(sub);
  }

  await admin.from("billing_events").insert({ id: event.id, type: event.type });
  return NextResponse.json({ received: true });
}
