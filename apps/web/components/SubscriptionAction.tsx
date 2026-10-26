"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button } from "@helvax/ui/react";
import { updateSubscription, type TokenState } from "@/app/actions";

const copy = {
  confirm: { button: "Confirm subscription", done: "You're subscribed. The next issue lands in your inbox at the start of the month." },
  unsubscribe: { button: "Unsubscribe", done: "You're unsubscribed. You won't get the newsletter any more." },
};

/** One button, so a mail scanner opening the link doesn't confirm or cancel anything. */
export function SubscriptionAction({ mode, token }: { mode: keyof typeof copy; token: string }) {
  const [state, action, pending] = useActionState<TokenState, FormData>(updateSubscription, { status: "idle" });
  if (state.status === "done") return <Alert tone="success" title="Done">{copy[mode].done} <Link className="hx-link" href="/">Back to helvax.ch</Link></Alert>;
  return (
    <form action={action} className="legal__form">
      {state.status === "invalid" && <Alert tone="warning" title="This link isn't valid any more">It may have expired or already been used. You can sign up again on the home page.</Alert>}
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="mode" value={mode} />
      <Button type="submit" size="lg" variant={mode === "unsubscribe" ? "secondary" : undefined} loading={pending}>{copy[mode].button}</Button>
    </form>
  );
}
