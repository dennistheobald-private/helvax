"use client";

import { useInView } from "./useInView";

const LEVELS = [
  { level: "L0", title: "Sent or delivered", example: "The mail server accepted the message.", reliability: "Delivery evidence only", fails: "No" },
  { level: "L1", title: "Link requested", example: "Someone, or something, opened the tracking link. Scanners do this within seconds.", reliability: "Low", fails: "No" },
  { level: "L2", title: "Deliberate interaction", example: "A person pressed Continue on the landing page.", reliability: "Medium to high", fails: "Only with corroboration" },
  { level: "L3", title: "Completed a risky action", example: "Submitted the safe practice login, or confirmed a fictional bank change.", reliability: "High", fails: "Yes, if human attribution is credible" },
  { level: "L4", title: "Confirmed by multiple signals", example: "One session: the link, the deliberate clicks and the submitted approval, with no automation signs.", reliability: "Very high", fails: "Yes" },
] as const;

export function EvidenceLadder() {
  const [ref, inView] = useInView<HTMLOListElement>();
  return (
    <ol ref={ref} className="ladder" data-in={inView || undefined} aria-label="Evidence levels">
      {LEVELS.map((l, i) => {
        const counts = l.level === "L3" || l.level === "L4";
        return (
          <li key={l.level} className={counts ? "ladder__step ladder__step--counts" : "ladder__step"} style={{ transitionDelay: `${i * 120}ms` }}>
            <span className="ladder__level hx-mono">{l.level}</span>
            <div className="ladder__body">
              <h3>{l.title}</h3>
              <p>{l.example}</p>
            </div>
            <span className="ladder__meter" aria-label={`Reliability: ${l.reliability}`}>
              {Array.from({ length: 5 }, (_, k) => <i key={k} data-on={k <= i || undefined} />)}
            </span>
            <span className={counts ? "ladder__verdict ladder__verdict--yes" : "ladder__verdict"}>{l.fails}</span>
          </li>
        );
      })}
    </ol>
  );
}
