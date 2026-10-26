import type { Metadata } from "next";
import { SubscriptionAction } from "@/components/SubscriptionAction";

export const metadata: Metadata = { title: "Confirm your subscription", robots: { index: false } };

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <article className="legal">
      <h1>Confirm your subscription</h1>
      <p>One short email a month on new attack patterns and how teams stop them. Press the button to confirm.</p>
      <SubscriptionAction mode="confirm" token={token} />
    </article>
  );
}
