"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { Button, Icon } from "@helvax/ui/react";
import { subscribeNewsletter, type NewsletterState } from "@/app/actions";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeNewsletter, { status: "idle" });
  const id = useId();

  if (state.status === "sent") {
    return (
      <p className="newsletter__done" role="status">
        <Icon name="mail" />Check your inbox and confirm your subscription. Nothing is sent until you do.
      </p>
    );
  }

  return (
    <form action={action} className="newsletter__form" noValidate>
      <label className="hx-visually-hidden" htmlFor={id}>Work email</label>
      <div className="newsletter__field">
        <input id={id} name="email" type="email" autoComplete="email" required placeholder="name@company.ch" className="hx-input"
          aria-invalid={state.status === "error" || undefined} aria-describedby={state.message ? `${id}-error` : undefined} />
        <Button type="submit" loading={pending}>{pending ? "Sending…" : "Subscribe"}</Button>
      </div>
      <div className="demo__trap" aria-hidden="true">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {state.message && <p id={`${id}-error`} className="hx-error">{state.message}</p>}
      <p className="newsletter__note">We&apos;ll email you once to confirm. Unsubscribe any time. See our <Link className="hx-link" href="/privacy#newsletter">privacy policy</Link>.</p>
    </form>
  );
}
