"use client";

import { Icon, LogoMark, useInView } from "@helvax/ui/react";

// Three things that can happen to one simulation, and how Helvax judges each. Example data.
type Outcome = "filtered" | "none" | "risk";
const LANES: { signal: string; outcome: Outcome; verdict: string; reason: string }[] = [
  { signal: "Link opened 3 seconds after delivery", outcome: "filtered", verdict: "Filtered out", reason: "Automated mail scanner" },
  { signal: "Page opened, nothing else", outcome: "none", verdict: "No verdict", reason: "Not enough evidence" },
  { signal: "Fake bank change confirmed", outcome: "risk", verdict: "Counts as a risk", reason: "Confirmed by the employee" },
];

export function VerifyFlow() {
  const [ref, inView] = useInView<HTMLOListElement>();
  return (
    <ol ref={ref} className="vflow" data-in={inView || undefined} aria-label="How Helvax judges what happened">
      {LANES.map((l, i) => (
        <li key={l.signal} className="vflow__lane" data-outcome={l.outcome} style={{ ["--i" as string]: i }}>
          <span className="vflow__signal">{l.signal}</span>
          <span className="vflow__wire" aria-hidden="true"><i /></span>
          <span className="vflow__hub" aria-hidden="true"><LogoMark width={18} height={18} /></span>
          <span className="vflow__wire" aria-hidden="true"><i /></span>
          <span className="vflow__verdict">
            <span className="vflow__icon" aria-hidden="true">
              {l.outcome === "filtered" ? <Icon name="scan" size="sm" /> : l.outcome === "risk" ? <Icon name="warn" size="sm" /> : <i className="vflow__dash" />}
            </span>
            <span className="vflow__text">
              <strong>{l.verdict}</strong>
              <small>{l.reason}</small>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
