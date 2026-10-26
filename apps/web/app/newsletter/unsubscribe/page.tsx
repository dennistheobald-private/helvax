import type { Metadata } from "next";
import { SubscriptionAction } from "@/components/SubscriptionAction";

export const metadata: Metadata = { title: "Unsubscribe from the newsletter", robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <article className="legal">
      <h1>Unsubscribe from the newsletter</h1>
      <p>Press the button and we won&apos;t send you the newsletter again.</p>
      <SubscriptionAction mode="unsubscribe" token={token} />
    </article>
  );
}
