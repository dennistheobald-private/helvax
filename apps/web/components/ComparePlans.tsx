import { Badge, Icon } from "@helvax/ui/react";
import { FREE_EMPLOYEES } from "@/lib/pricing";

// ✓ = included, — = not included, text = a limit or note. Columns: Free, Helvax, Pro, Enterprise.
type Cell = boolean | string;
const ALL: Cell[] = [true, true, true, true];
const PLANS = ["Free", "Helvax", "Pro", "Enterprise"];
const RECOMMENDED = "Helvax";

const GROUPS: { title: string; rows: [string, Cell[]][] }[] = [
  { title: "Simulations", rows: [
    ["Employees", [String(FREE_EMPLOYEES), "Unlimited", "Unlimited", "Unlimited"]],
    ["Phishing and CEO fraud emails", ALL],
    ["Supplier and payment fraud", ALL],
    ["QR code and document scenarios", ALL],
    ["Scenario library that keeps changing", ALL],
    ["Deepfake voice simulations", [false, false, "Soon", "Soon"]],
  ] },
  { title: "Verified results", rows: [
    ["Verified Risky Action Rate", ALL],
    ["Mail scanners and bots filtered out", ALL],
    ["Inconclusive results instead of guesses", ALL],
    ["Evidence trail for every result", ALL],
  ] },
  { title: "Rhythm and training", rows: [
    ["You set how often, Helvax picks the moment", ALL],
    ["Two-minute training moment", ALL],
  ] },
  { title: "Reporting", rows: [
    ["Monthly report", ALL],
    ["Trends by team", [false, true, true, true]],
    ["PDF and CSV export", [false, true, true, true]],
  ] },
  { title: "Security and support", rows: [
    ["MFA for admins, EU data hosting", ALL],
    ["Admin and viewer roles", [false, true, true, true]],
    ["Email support", ALL],
    ["Kick-off call on request", [false, false, true, true]],
    ["Dedicated Slack channel", [false, false, false, true]],
  ] },
];

function Mark({ cell }: { cell: Cell }) {
  if (cell === true) return <span className="compare__yes"><Icon name="check" size="sm" label="Included" /></span>;
  if (cell === false) return <span className="compare__no" aria-label="Not included">—</span>;
  if (cell === "Soon") return <Badge tone="brand">Soon</Badge>;
  return <span className="compare__text">{cell}</span>;
}

export function ComparePlans() {
  return (
    <section className="compare" aria-labelledby="compare-title">
      <div className="compare__head">
        <div>
          <span className="hx-eyebrow">Compare plans</span>
          <h2 id="compare-title" className="hx-title">Find the right plan.</h2>
        </div>
        {PLANS.map((p) => (
          <span key={p} className="compare__plan" data-plan={p} aria-hidden="true">
            {p === RECOMMENDED && <span className="hx-badge hx-badge--brand">Recommended</span>}
            {p}
          </span>
        ))}
      </div>
      {GROUPS.map((g, i) => (
        <details key={g.title} className="compare__group" open={i < 2}>
          <summary>{g.title}<Icon name="plus" /></summary>
          <table className="compare__table">
            <caption className="hx-visually-hidden">{g.title}</caption>
            <thead className="hx-visually-hidden"><tr><th scope="col">Feature</th>{PLANS.map((p) => <th key={p} scope="col">{p}</th>)}</tr></thead>
            <tbody>
              {g.rows.map(([label, cells]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {cells.map((c, i) => <td key={PLANS[i]} data-plan={PLANS[i]}><Mark cell={c} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </section>
  );
}
