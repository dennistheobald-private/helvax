import type { OutcomeResult } from "@/lib/database.types";
import { OUTCOMES, OUTCOME_ORDER, count } from "@/lib/results";

/** Every outcome as one stacked bar with a legend. Only verified risky actions count as failures. */
export function OutcomeBar({ outcomes, label }: { outcomes: Partial<Record<OutcomeResult, number>>; label: string }) {
  const total = OUTCOME_ORDER.reduce((n, k) => n + (outcomes[k] ?? 0), 0);
  const shown = OUTCOME_ORDER.filter((k) => (outcomes[k] ?? 0) > 0);
  return (
    <figure className="outcome-bar">
      <div className="outcome-bar__track" role="img" aria-label={`${label}: ${shown.map((k) => `${outcomes[k]} ${OUTCOMES[k].label.toLowerCase()}`).join(", ")}`}>
        {shown.map((k) => <span key={k} className={`outcome-bar__seg outcome-bar__seg--${k}`} style={{ flexGrow: outcomes[k] }} />)}
      </div>
      <ul className="outcome-bar__legend">
        {OUTCOME_ORDER.map((k) => (
          <li key={k} title={OUTCOMES[k].help}>
            <span className={`outcome-bar__swatch outcome-bar__seg--${k}`} aria-hidden="true" />
            <span>{OUTCOMES[k].label}</span>
            <strong>{count(outcomes[k] ?? 0)}</strong>
          </li>
        ))}
      </ul>
      <figcaption className="muted">{count(total)} simulations. Only verified risky actions count toward the rate.</figcaption>
    </figure>
  );
}
