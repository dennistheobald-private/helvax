"use client";

import { Badge, LogoMark, useInView, type BadgeTone } from "@helvax/ui/react";

// Three things that can happen to one simulation, and how Helvax judges each. Example data.
const LANES: { signal: string; verdict: string; tone: BadgeTone; counts?: boolean }[] = [
  { signal: "Link opened 3 seconds after delivery", verdict: "Mail scanner", tone: "info" },
  { signal: "Page opened, nothing else", verdict: "Inconclusive", tone: "outline" },
  { signal: "Fake bank change confirmed", verdict: "Verified risky action", tone: "danger", counts: true },
];

export function VerifyFlow() {
  const [ref, inView] = useInView<HTMLOListElement>();
  return (
    <ol ref={ref} className="vflow" data-in={inView || undefined} aria-label="How Helvax judges what happened">
      {LANES.map((l, i) => (
        <li key={l.signal} className="vflow__lane" style={{ ["--i" as string]: i }}>
          <span className="vflow__signal">{l.signal}</span>
          <span className="vflow__wire" aria-hidden="true"><i /></span>
          <span className="vflow__hub" aria-hidden="true"><LogoMark width={18} height={18} /></span>
          <span className="vflow__wire" aria-hidden="true"><i /></span>
          <span className="vflow__verdict">
            <Badge tone={l.tone}>{l.verdict}</Badge>
            <small className={l.counts ? "vflow__counts" : undefined}>{l.counts ? "Counts" : "Not counted"}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}
