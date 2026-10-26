"use client";

import { useActionState, useState, useTransition } from "react";
import { Alert, Button, Field } from "@helvax/ui/react";
import { startEnroll, verifyFactor, type EnrollState } from "./actions";

function CodeForm({ factorId, submit }: { factorId: string; submit: string }) {
  const [state, action, pending] = useActionState(verifyFactor, {});
  return (
    <form action={action} className="login__form">
      <input type="hidden" name="factorId" value={factorId} />
      <Field label="6-digit code" name="code" inputMode="numeric" autoComplete="one-time-code" autoFocus required maxLength={7} error={state.error} className="login__code" />
      <Button type="submit" size="lg" block loading={pending}>{submit}</Button>
    </form>
  );
}

export function Challenge({ factorId }: { factorId: string }) {
  return <CodeForm factorId={factorId} submit="Verify" />;
}

export function Enroll() {
  const [enroll, setEnroll] = useState<EnrollState | null>(null);
  const [pending, start] = useTransition();

  if (!enroll?.factorId) {
    return (
      <div className="login__form">
        {enroll?.error && <Alert tone="danger" title="Setup failed">{enroll.error}</Alert>}
        <Button size="lg" block loading={pending} onClick={() => start(async () => setEnroll(await startEnroll()))}>
          Set up authenticator app
        </Button>
      </div>
    );
  }

  return (
    <div className="mfa">
      <ol className="mfa__steps">
        <li>Open an authenticator app such as 1Password, Google Authenticator or Microsoft Authenticator.</li>
        <li>Scan this code, or enter the key by hand.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mfa__qr" src={enroll.qr} alt="QR code for your authenticator app" width={180} height={180} />
      <p className="mfa__secret">Key: <code className="hx-mono">{enroll.secret}</code></p>
      <CodeForm factorId={enroll.factorId} submit="Turn on MFA" />
    </div>
  );
}
