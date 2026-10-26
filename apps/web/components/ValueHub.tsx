"use client";

import { useEffect, useState } from "react";
import { AppIcon, Icon, prefersReducedMotion, useInView, type IconName } from "@helvax/ui/react";

const CARDS: { icon: IconName; title: string; body: string }[] = [
  { icon: "target", title: "Realistic attacks", body: "CEO fraud, supplier fraud and phishing your team will actually see." },
  { icon: "checkc", title: "Verified results", body: "Only confirmed risky actions count. Scanners and stray clicks never do." },
  { icon: "calendar", title: "Unpredictable rhythm", body: "You set how often. Helvax picks the moment, so nobody can prepare." },
  { icon: "report", title: "Proof for the board", body: "A monthly report for management, auditors and insurers." },
];

// One loop through the hub: the attack goes out, the evidence comes back, people learn, the report shows it.
const STEPS = [
  { node: "Attack", chip: "Sent · Tue 10:45" },
  { node: "Evidence", chip: "Scanner filtered" },
  { node: "Training", chip: "2-min lesson done" },
  { node: "Report", chip: "Rate down 1.2 pts" },
];

export function ValueHub() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2200);
    return () => clearInterval(t);
  }, [inView]);

  const card = (c: (typeof CARDS)[number], i: number) => (
    <li key={c.title} className={i === 0 ? "hub__card hub__card--lead" : "hub__card"}>
      <span className="hub__icon"><Icon name={c.icon} /></span>
      <h3>{c.title}</h3>
      <p>{c.body}</p>
    </li>
  );

  return (
    <div className="hub">
      <ul className="hub__cards">{CARDS.slice(0, 2).map(card)}</ul>
      <div ref={ref} className="hub__panel" data-step={step} aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s.node} className={`hub__node hub__node--${i}`} data-active={i === step || undefined}>{s.node}</span>
        ))}
        <svg className="hub__lines" viewBox="0 0 300 300" preserveAspectRatio="none">
          <path d="M80 70 V110 H150 V130" /><path d="M220 70 V110 H150" /><path d="M80 230 V190 H150 V170" /><path d="M220 230 V190 H150" />
        </svg>
        <AppIcon className="hub__app hx-appicon--lg" />
        <span key={step} className={`hub__chip hub__chip--${step}`}><i />{STEPS[step]!.chip}</span>
      </div>
      <ul className="hub__cards">{CARDS.slice(2).map((c, i) => card(c, i + 2))}</ul>
    </div>
  );
}
