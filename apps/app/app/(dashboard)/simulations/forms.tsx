"use client";

import { useActionState, useState } from "react";
import { Button } from "@helvax/ui/react";
import type { SimulationSettings } from "@/lib/database.types";
import { setSending, updateSettings } from "./actions";

const FREQUENCY = [
  { value: 1, label: "Monthly", help: "One simulation per person each month" },
  { value: 2, label: "Twice a month", help: "Two per person, at least the cooldown apart" },
  { value: 4, label: "Weekly", help: "About one per person each week" },
];

export function SettingsForm({ settings, disabled }: { settings: SimulationSettings; disabled: boolean }) {
  const [state, action, pending] = useActionState(updateSettings, {});
  const [training, setTraining] = useState(settings.training_moments);
  return (
    <form action={action} className="schedule-form">
      <fieldset className="hx-fieldset" disabled={disabled}>
        <legend className="hx-label">How often each person is tested</legend>
        <div className="choice-grid">
          {FREQUENCY.map((f) => (
            <label key={f.value} className="choice">
              <input type="radio" name="per_employee_per_month" value={f.value} defaultChecked={settings.per_employee_per_month === f.value} />
              <span><strong>{f.label}</strong><small>{f.help}</small></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="schedule-form__row">
        <div className="hx-field">
          <label className="hx-label" htmlFor="cooldown_days">Days between two simulations</label>
          <input id="cooldown_days" name="cooldown_days" type="number" min={2} max={60} className="hx-input" defaultValue={settings.cooldown_days} disabled={disabled} />
        </div>
        <div className="hx-field">
          <label className="hx-label" htmlFor="max_difficulty">Highest difficulty</label>
          <select id="max_difficulty" name="max_difficulty" className="hx-select" defaultValue={settings.max_difficulty} disabled={disabled}>
            <option value={1}>Easy only</option><option value={2}>Up to medium</option><option value={3}>Up to hard</option>
          </select>
        </div>
      </div>
      <p className="muted">Each person gets a different, random day and time, so nobody can predict the next one.</p>

      <input type="hidden" name="training_moments" value={training ? "on" : "off"} />
      <button className="hx-switch" type="button" role="switch" aria-checked={training} disabled={disabled} onClick={() => setTraining((t) => !t)}>
        <span className="hx-switch__track" aria-hidden="true" />Show a short training moment right after a risky action
      </button>

      {!disabled && (
        <div className="settings-form__actions">
          <Button type="submit" loading={pending}>Save schedule</Button>
          {state.error && <p className="form-status form-status--error" role="alert">{state.error}</p>}
          {state.ok && <p className="form-status" role="status">{state.ok}</p>}
        </div>
      )}
    </form>
  );
}

export function SendingSwitch({ enabled, canTurnOn, canTurnOff }: { enabled: boolean; canTurnOn: boolean; canTurnOff: boolean }) {
  const [state, action, pending] = useActionState(setSending, {});
  const allowed = enabled ? canTurnOff : canTurnOn;
  return (
    <form action={action} className="sending__switch">
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <Button type="submit" variant={enabled ? "destructive" : "primary"} loading={pending} disabled={!allowed}>
        {enabled ? "Stop sending now" : "Turn sending on"}
      </Button>
      {state.error && <p className="form-status form-status--error" role="alert">{state.error}</p>}
      {state.ok && <p className="form-status" role="status">{state.ok}</p>}
    </form>
  );
}
