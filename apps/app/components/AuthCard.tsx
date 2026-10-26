import type { ReactNode } from "react";
import { LogoMark } from "@helvax/ui/react";

/** Centered card used by login, MFA, onboarding and invitation pages. */
export function AuthCard({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <div className="login">
      <main className="login__card hx-card">
        <span className="login__brand"><LogoMark width={28} height={28} />helvax</span>
        <div>
          <h1 className="login__title">{title}</h1>
          {lead && <p className="login__lead">{lead}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
