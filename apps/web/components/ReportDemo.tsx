"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion, useInView } from "./useInView";

// Illustrative monthly results (made-up data). The segments add up to the simulations sent.
const SENT = 1240;
const OUTCOMES = [
  { key: "risky", label: "Verified risky action", value: 42, counts: true },
  { key: "suspected", label: "Suspected, pending review", value: 19 },
  { key: "inconclusive", label: "Inconclusive", value: 57 },
  { key: "scanner", label: "Scanner only", value: 131 },
  { key: "safe", label: "Verified safe response", value: 96 },
  { key: "none", label: "No interaction", value: 868 },
  { key: "bounced", label: "Not delivered", value: 27 },
] as const;

function useCountUp(target: number, run: boolean, ms = 1400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (prefersReducedMotion()) return setN(target);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setN(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, ms]);
  return n;
}

const group = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function ReportDemo() {
  const [ref, inView] = useInView<HTMLElement>();
  const sent = useCountUp(SENT, inView);
  const requests = useCountUp(186, inView);
  const risky = useCountUp(42, inView);
  const pending = useCountUp(19, inView);
  const rate = useCountUp((42 / SENT) * 100, inView, 1800);

  return (
    <article ref={ref} className="report-demo hx-report" data-in={inView || undefined} aria-label="Example monthly report with made-up data">
      <header className="hx-report__cover">
        <span className="hx-eyebrow">Monthly security summary · example</span>
        <h3 className="hx-report__title">Alpenbau AG · October 2026</h3>
        <span className="hx-report__period">Evidence-first · 01.10.2026 – 31.10.2026 · Europe/Zurich</span>
      </header>

      <div className="report-demo__kpi">
        <div>
          <span className="report-demo__kpi-label">Verified risky action rate</span>
          <span className="report-demo__kpi-value">{rate.toFixed(1)}<small>%</small></span>
          <span className="report-demo__kpi-note">Verified risky actions ÷ eligible simulations. Clicks alone never count.</span>
        </div>
        <dl className="report-demo__stats">
          <div><dt>Simulations sent</dt><dd>{group(sent)}</dd></div>
          <div><dt>Link requests</dt><dd>{group(requests)}<span className="report-demo__muted"> not counted</span></dd></div>
          <div><dt>Verified risky actions</dt><dd>{group(risky)}</dd></div>
          <div><dt>Pending review</dt><dd>{group(pending)}</dd></div>
        </dl>
      </div>

      <div className="report-demo__bar" aria-hidden="true">
        {OUTCOMES.map((o, i) => (
          <span
            key={o.key}
            className={`report-demo__seg report-demo__seg--${o.key}`}
            style={{ flexGrow: o.value, transitionDelay: `${300 + i * 140}ms` }}
          />
        ))}
      </div>
      <ul className="report-demo__legend">
        {OUTCOMES.map((o, i) => (
          <li key={o.key} style={{ transitionDelay: `${300 + i * 140}ms` }}>
            <i className={`report-demo__dot report-demo__seg--${o.key}`} />
            {o.label} <b>{o.value}</b>
            {"counts" in o && <span className="hx-badge hx-badge--brand">Counts as failure</span>}
          </li>
        ))}
      </ul>
      <p className="hx-help report-demo__foot">Illustrative data. In production the eligible denominator, delivery coverage and verification coverage are reported separately.</p>
    </article>
  );
}
