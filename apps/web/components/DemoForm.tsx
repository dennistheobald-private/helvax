"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@helvax/ui/react";
import { requestDemo, type DemoState } from "@/app/actions";

export function DemoForm() {
  const [state, action, pending] = useActionState<DemoState, FormData>(requestDemo, { status: "idle" });

  if (state.status === "sent") {
    return (
      <Alert tone="success" title="Thanks, we've got your request">
        We'll reply within one working day to find a time for a 30-minute demo.
      </Alert>
    );
  }

  const f = state.fields ?? {};
  return (
    <form action={action} className="demo__form" noValidate>
      {state.message && <Alert tone="danger" title="Something went wrong">{state.message}</Alert>}
      <div className="demo__row">
        <Field label="Name" name="name" autoComplete="name" required error={f.name} />
        <Field label="Work email" name="email" type="email" autoComplete="email" required error={f.email} />
      </div>
      <div className="demo__row">
        <Field label="Company" name="company" autoComplete="organization" required error={f.company} />
        <Field label="Number of employees" name="employees" inputMode="numeric" help="Optional" />
      </div>
      <div className="hx-field">
        <label className="hx-label" htmlFor="demo-message">What would you like to see? <span className="hx-optional">Optional</span></label>
        <textarea id="demo-message" name="message" className="hx-input" rows={3} />
      </div>
      <div className="demo__trap" aria-hidden="true">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Button type="submit" size="lg" loading={pending}>{pending ? "Sending…" : "Request a demo"}</Button>
    </form>
  );
}
