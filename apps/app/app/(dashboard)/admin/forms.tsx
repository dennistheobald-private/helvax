"use client";

import { useActionState } from "react";
import { Button, Field } from "@helvax/ui/react";
import { approveTenant, setPlatformSending, type FormState } from "./actions";

function Status({ state }: { state: FormState }) {
  if (state.error) return <p className="form-status form-status--error" role="alert">{state.error}</p>;
  if (state.ok) return <p className="form-status" role="status">{state.ok}</p>;
  return null;
}

export function PlatformSwitch({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(setPlatformSending, {});
  return (
    <form action={action} className="admin-switch">
      <input type="hidden" name="enabled" value={String(!enabled)} />
      {!enabled && <Field label="Type SEND to turn on real sending for every approved company" name="confirm" autoComplete="off" required />}
      <Button type="submit" variant={enabled ? "destructive" : "primary"} loading={pending}>
        {enabled ? "Stop all sending now" : "Turn platform sending on"}
      </Button>
      <Status state={state} />
    </form>
  );
}

export function ApproveButton({ tenant, approved }: { tenant: string; approved: boolean }) {
  const [state, action, pending] = useActionState(approveTenant, {});
  return (
    <form action={action} className="admin-approve">
      <input type="hidden" name="tenant" value={tenant} />
      <input type="hidden" name="approved" value={String(!approved)} />
      <Button type="submit" size="sm" variant={approved ? "outline" : "primary"} loading={pending}>{approved ? "Withdraw approval" : "Approve sending"}</Button>
      <Status state={state} />
    </form>
  );
}
