import type { Metadata } from "next";
import { Alert, Button, Field, LogoMark } from "@helvax/ui/react";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="login">
      <div className="login__card hx-card">
        <span className="login__brand"><LogoMark width={28} height={28} />helvax</span>
        <div>
          <h1 className="login__title">Log in</h1>
          <p className="login__lead">We&apos;ll email you a one-time sign-in link. Admins confirm with their authenticator app.</p>
        </div>
        {/* Phase 3 wires this form to Supabase Auth (email OTP + TOTP MFA). */}
        <form className="login__form" action="#">
          <Field label="Work email" type="email" name="email" autoComplete="email" required placeholder="name@company.ch" />
          <Button type="submit" size="lg" block disabled>Email me a link</Button>
        </form>
        <Alert title="Sign-in isn&apos;t connected yet">This preview shows the app layout with sample screens.</Alert>
      </div>
    </div>
  );
}
