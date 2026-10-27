import type { ReactNode } from "react";
import { Logo } from "@helvax/ui/react";

/** Centered card used by login, MFA, onboarding and invitation pages. */
export function AuthCard({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <div className="login">
      {/* The Split mark as a faint backdrop, as on helvax.ch. */}
      <svg className="login__gap" viewBox="-40 -20 180 140" aria-hidden="true" focusable="false">
        <path d="M44 12A44 44 0 0 0 44 100Z" />
        <path d="M56 0A44 44 0 0 1 56 88Z" />
      </svg>
      <main className="login__card hx-card">
        <span className="login__brand"><Logo height={26} /></span>
        <div>
          <h1 className="login__title">{title}</h1>
          {lead && <p className="login__lead">{lead}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
