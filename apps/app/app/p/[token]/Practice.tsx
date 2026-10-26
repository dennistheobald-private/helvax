"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ScenarioCategory } from "@/lib/database.types";

// A safe practice page. Fields have no name attribute and are never read or sent: the
// page only reports *that* a step happened. After the action it says it was a simulation.

type Step = "landing" | "form" | "done" | "thanks";

const COPY: Record<ScenarioCategory, { heading: string; lead: string; cta: string; formTitle: string; submit: string; fields: { label: string; type: string }[]; tips: string[] }> = {
  phishing: {
    heading: "You have a message waiting", lead: "Continue to view it securely.", cta: "Continue",
    formTitle: "Sign in to continue", submit: "Sign in",
    fields: [{ label: "Email", type: "email" }, { label: "Password", type: "password" }],
    tips: ["Check the sender's address, not just the display name.", "Hover over links to see where they really go.", "When in doubt, open the service yourself instead of using the link."],
  },
  credential_form: {
    heading: "Action required on your account", lead: "Confirm your details to keep access.", cta: "Continue",
    formTitle: "Confirm your password", submit: "Confirm",
    fields: [{ label: "Email", type: "email" }, { label: "Current password", type: "password" }],
    tips: ["IT will never ask for your password by email.", "Urgent deadlines are a common pressure tactic.", "Report messages like this to your IT team."],
  },
  document_link: {
    heading: "A document was shared with you", lead: "Open it to view and comment.", cta: "Open document",
    formTitle: "Verify your email to open the document", submit: "Open",
    fields: [{ label: "Work email", type: "email" }, { label: "Password", type: "password" }],
    tips: ["Unexpected shares are worth a quick check with the sender.", "Real document links don't ask for your password again.", "Look closely at the address bar before signing in."],
  },
  qr_phishing: {
    heading: "Renew your registration", lead: "Confirm your account to finish the renewal.", cta: "Continue",
    formTitle: "Confirm your account", submit: "Confirm",
    fields: [{ label: "Full name", type: "text" }, { label: "Work email", type: "email" }, { label: "Password", type: "password" }],
    tips: ["QR codes hide where they lead. Check the address before entering anything.", "Posters and letters can be faked as easily as emails.", "Use the official app or intranet instead."],
  },
  supplier_fraud: {
    heading: "Updated bank details", lead: "Please confirm the new account for upcoming payments.", cta: "Review details",
    formTitle: "Confirm the new bank details", submit: "Confirm new details",
    fields: [{ label: "Your name", type: "text" }, { label: "Approval note", type: "text" }],
    tips: ["Always confirm bank changes by phone, using a number you already have.", "Changes announced by email are the most common payment fraud.", "Follow the four-eyes rule for any change to payee details."],
  },
  executive_impersonation: {
    heading: "Payment approval needed", lead: "A confidential payment is waiting for your approval.", cta: "Review payment",
    formTitle: "Approve the payment", submit: "Approve payment",
    fields: [{ label: "Your name", type: "text" }, { label: "Reference", type: "text" }],
    tips: ["Unusual requests from executives deserve a call back.", "Secrecy and urgency together are a red flag.", "Never skip the normal approval process, whoever asks."],
  },
};

const DETAILS: Partial<Record<ScenarioCategory, [string, string][]>> = {
  supplier_fraud: [["New IBAN", "CH00 0000 0000 0000 0000 0"], ["Account holder", "Sample Supplies Ltd"], ["Valid from", "Next payment run"]],
  executive_impersonation: [["Amount", "CHF 18,450.00"], ["Payee", "Sample Consulting Ltd"], ["Due", "Today"]],
};

export function Practice({ token, session, category, senderName, company, training }: {
  token: string; session: string; category: ScenarioCategory; senderName: string; company: string; training: boolean;
}) {
  const [step, setStep] = useState<Step>("landing");
  const pointer = useRef(0);
  const sentJs = useRef(false);
  const copy = COPY[category];

  const report = (k: "js" | "interaction" | "action" | "training") =>
    fetch(`/p/${token}/e`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ s: session, k, p: pointer.current }), keepalive: true }).catch(() => {});

  useEffect(() => {
    const bump = () => {
      pointer.current += 1;
      if (!sentJs.current && pointer.current >= 3) {
        sentJs.current = true;
        report("js");
      }
    };
    let last = 0;
    const move = () => { const now = Date.now(); if (now - last > 120) { last = now; bump(); } };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", bump, { passive: true });
    window.addEventListener("keydown", bump);
    window.addEventListener("touchstart", bump, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("touchstart", bump);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onContinue() {
    report("interaction");
    setStep("form");
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Clear what was typed before anything else; it never leaves this page.
    e.currentTarget.reset();
    report("action");
    setStep("done");
  }

  if (step === "done" || step === "thanks") {
    return (
      <main className="practice practice--center">
        <div className="practice__card practice__card--reveal">
          <span className="practice__badge">Security awareness simulation</span>
          <h1>This was a practice exercise from {company}</h1>
          <p>Nothing you entered was sent or stored. This is a safe way to practise spotting messages like this one.</p>
          {training && (
            <>
              <h2>What to look for next time</h2>
              <ul>{copy.tips.map((t) => <li key={t}>{t}</li>)}</ul>
            </>
          )}
          {step === "done" ? (
            <button type="button" className="practice__btn" onClick={() => { report("training"); setStep("thanks"); }}>Got it</button>
          ) : (
            <p className="practice__muted">Thanks. You can close this page.</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="practice">
      <header className="practice__bar"><span className="practice__logo" aria-hidden="true" />{senderName}</header>
      <div className="practice__body">
        {step === "landing" ? (
          <div className="practice__card">
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
            {DETAILS[category] && (
              <dl className="practice__details">{DETAILS[category]!.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            )}
            <button type="button" className="practice__btn" onClick={onContinue}>{copy.cta}</button>
          </div>
        ) : (
          <form className="practice__card" onSubmit={onSubmit} autoComplete="off">
            <h1>{copy.formTitle}</h1>
            {copy.fields.map((f, i) => (
              <label key={f.label} className="practice__field">
                <span>{f.label}</span>
                {/* No name attribute: the browser has nothing to submit, and the page never reads it. */}
                <input type={f.type} autoComplete={f.type === "password" ? "new-password" : "off"} required={i === 0} />
              </label>
            ))}
            <button type="submit" className="practice__btn">{copy.submit}</button>
          </form>
        )}
      </div>
    </main>
  );
}
