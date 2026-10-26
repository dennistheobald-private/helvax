"use client";

import { useActionState } from "react";
import { Button, Field } from "@helvax/ui/react";
import { inviteMember, updateCompany, updateProfile, type FormState } from "./actions";

function Status({ state }: { state: FormState }) {
  if (state.error) return <p className="form-status form-status--error" role="alert">{state.error}</p>;
  if (state.ok) return <p className="form-status" role="status">{state.ok}</p>;
  return null;
}

const ZONES = ["Europe/Zurich", "Europe/Berlin", "Europe/Vienna", "Europe/Amsterdam", "Europe/Brussels", "Europe/Paris", "Europe/London"];

export function CompanyForm({ name, timezone, disabled }: { name: string; timezone: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(updateCompany, {});
  const zones = ZONES.includes(timezone) ? ZONES : [timezone, ...ZONES];
  return (
    <form action={action} className="settings-form">
      <Field label="Company name" name="name" defaultValue={name} required disabled={disabled} />
      <div className="hx-field">
        <label className="hx-label" htmlFor="timezone">Time zone</label>
        <select id="timezone" name="timezone" className="hx-select" defaultValue={timezone} disabled={disabled}>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>
      {!disabled && <div className="settings-form__actions"><Button type="submit" loading={pending}>Save</Button><Status state={state} /></div>}
    </form>
  );
}

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  return (
    <form action={action} className="settings-form">
      <Field label="Your name" name="full_name" defaultValue={fullName} autoComplete="name" />
      <Field label="Email" defaultValue={email} disabled help="You sign in with this address." />
      <div className="settings-form__actions"><Button type="submit" loading={pending}>Save</Button><Status state={state} /></div>
    </form>
  );
}

export function InviteForm({ canInviteAdmins }: { canInviteAdmins: boolean }) {
  const [state, action, pending] = useActionState(inviteMember, {});
  return (
    <form action={action} className="invite-form">
      <Field label="Email" name="email" type="email" required placeholder="colleague@company.ch" />
      <div className="hx-field">
        <label className="hx-label" htmlFor="invite-role">Role</label>
        <select id="invite-role" name="role" className="hx-select" defaultValue="viewer">
          <option value="viewer">Viewer: can see results and export reports</option>
          {canInviteAdmins && <option value="admin">Admin: manages employees, simulations and settings</option>}
        </select>
      </div>
      <div className="settings-form__actions"><Button type="submit" loading={pending}>Send invitation</Button><Status state={state} /></div>
    </form>
  );
}
