"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@helvax/ui/react";
import { createCompany } from "./actions";

const ZONES = ["Europe/Zurich", "Europe/Berlin", "Europe/Vienna", "Europe/Amsterdam", "Europe/Brussels", "Europe/Paris", "Europe/London"];

export function OnboardingForm() {
  const [state, action, pending] = useActionState(createCompany, {});
  return (
    <form action={action} className="login__form">
      {state.error && <Alert tone="danger" title="Something went wrong">{state.error}</Alert>}
      <Field label="Company name" name="name" autoComplete="organization" required autoFocus />
      <div className="hx-field">
        <label className="hx-label" htmlFor="tz">Time zone</label>
        <select id="tz" name="timezone" className="hx-select" defaultValue="Europe/Zurich">
          {ZONES.map((z) => <option key={z} value={z}>{z.replace("_", " ")}</option>)}
        </select>
        <span className="hx-help">Simulations are only sent inside business hours in this time zone.</span>
      </div>
      <Button type="submit" size="lg" block loading={pending}>Create company</Button>
    </form>
  );
}
