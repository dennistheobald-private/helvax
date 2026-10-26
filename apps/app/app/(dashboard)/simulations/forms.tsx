"use client";

import { useActionState, useState } from "react";
import { Button } from "@helvax/ui/react";
import type { SimulationSettings } from "@/lib/database.types";
import { updateSettings } from "./actions";

const DAYS = [[1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [7, "Sun"]] as const;
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

      <fieldset className="hx-fieldset" disabled={disabled}>
        <legend className="hx-label">Days</legend>
        <div className="day-picker">
          {DAYS.map(([d, label]) => (
            <label key={d} className="day-picker__day">
              <input type="checkbox" name="business_days" value={d} defaultChecked={settings.business_days.includes(d)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="schedule-form__row">
        <div className="hx-field">
          <label className="hx-label" htmlFor="window_start">From</label>
          <input id="window_start" name="window_start" type="time" className="hx-input" defaultValue={settings.window_start.slice(0, 5)} disabled={disabled} />
        </div>
        <div className="hx-field">
          <label className="hx-label" htmlFor="window_end">Until</label>
          <input id="window_end" name="window_end" type="time" className="hx-input" defaultValue={settings.window_end.slice(0, 5)} disabled={disabled} />
        </div>
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
      <p className="muted">Times are in {"your company's"} time zone. Each person gets a different, random time inside this window, so nobody can predict the next one.</p>

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
