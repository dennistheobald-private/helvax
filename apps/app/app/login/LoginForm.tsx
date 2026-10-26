"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@helvax/ui/react";
import { sendCode, verifyCode, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [sent, send, sending] = useActionState<LoginState, FormData>(sendCode, { step: "email" });
  const [checked, verify, verifying] = useActionState<LoginState, FormData>(verifyCode, { step: "code" });

  if (sent.step === "code") {
    return (
      <form action={verify} className="login__form">
        <p className="login__lead">
          We sent a sign-in link and code to <strong>{sent.email}</strong>. Click the link, or enter the code here.
        </p>
        <input type="hidden" name="email" value={sent.email} />
        <input type="hidden" name="next" value={next} />
        <Field
          label="Code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          error={checked.error}
          className="login__code"
        />
        <Button type="submit" size="lg" block loading={verifying}>Sign in</Button>
        <button type="button" className="hx-link login__back" onClick={() => location.reload()}>Use a different email</button>
      </form>
    );
  }

  return (
    <form action={send} className="login__form">
      <input type="hidden" name="next" value={next} />
      <Field
        label="Work email"
        type="email"
        name="email"
        autoComplete="email"
        required
        autoFocus
        defaultValue={sent.email}
        placeholder="name@company.ch"
        error={sent.error}
      />
      <Button type="submit" size="lg" block loading={sending}>Email me a code</Button>
    </form>
  );
}
