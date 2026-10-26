"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ScenarioCategory } from "@/lib/database.types";
import { COPY, DETAILS, UI, type Locale } from "@/lib/engine/practice-copy";

// A safe practice page. Fields have no name attribute and are never read or sent: the
// page only reports *that* a step happened. After the action it says it was a simulation.

type Step = "landing" | "form" | "done" | "thanks";

export function Practice({ token, session, category, senderName, company, training, locale }: {
  token: string; session: string; category: ScenarioCategory; senderName: string; company: string; training: boolean; locale: Locale;
}) {
  const [step, setStep] = useState<Step>("landing");
  const pointer = useRef(0);
  const sentJs = useRef(false);
  const copy = COPY[locale][category];
  const details = DETAILS[locale][category];
  const ui = UI[locale];

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
      <main className="practice practice--center" lang={locale}>
        <div className="practice__card practice__card--reveal">
          <span className="practice__badge">{ui.badge}</span>
          <h1>{ui.revealTitle(company)}</h1>
          <p>{ui.revealLead}</p>
          {training && (
            <>
              <h2>{ui.tipsTitle}</h2>
              <ul>{copy.tips.map((t) => <li key={t}>{t}</li>)}</ul>
            </>
          )}
          {step === "done" ? (
            <button type="button" className="practice__btn" onClick={() => { report("training"); setStep("thanks"); }}>{ui.gotIt}</button>
          ) : (
            <p className="practice__muted">{ui.thanks}</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="practice" lang={locale}>
      <header className="practice__bar"><span className="practice__logo" aria-hidden="true" />{senderName}</header>
      <div className="practice__body">
        {step === "landing" ? (
          <div className="practice__card">
            <h1>{copy.heading}</h1>
            <p>{copy.lead}</p>
            {details && (
              <dl className="practice__details">{details.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
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
