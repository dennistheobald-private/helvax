import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OutcomeBar } from "@/components/OutcomeBar";
import type { ReportSnapshot } from "@/lib/database.types";
import { count, formatMonth, rate } from "@/lib/results";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Monthly report" };

function lastDay(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate();
}

export default async function ReportPage({ params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) notFound();
  const s = await requireSession();
  const supabase = await createClient();
  const { data: report } = await supabase.from("reports").select("id, period, snapshot, created_at, is_demo")
    .eq("tenant_id", s.tenant.id).eq("period", `${period}-01`).maybeSingle();
  if (!report) notFound();

  const snap = report.snapshot as ReportSnapshot;
  const risky = snap.outcomes.verified_risky;
  const cur = snap.eligible ? risky / snap.eligible : null;
  const prev = snap.previous?.eligible ? snap.previous.verified_risky / snap.previous.eligible : null;
  const diff = cur != null && prev != null ? (cur - prev) * 100 : null;
  const [y, m] = period.split("-");
  const unclear = snap.outcomes.inconclusive + snap.outcomes.suspected;
  const worst = [...snap.groups].filter((g) => g.eligible > 0).sort((a, b) => b.verified_risky / b.eligible - a.verified_risky / a.eligible)[0];

  return (
    <div className="page">
      <Link className="hx-link back-link" href="/reports">← All reports</Link>
      <article className="hx-report report-full">
        <header className="hx-report__cover">
          <span className="hx-eyebrow">Monthly security summary{report.is_demo ? " · sample data" : ""}</span>
          <h2 className="hx-report__title">{s.tenant.name} · {formatMonth(report.period)}</h2>
          <span className="hx-report__period">01.{m}.{y} – {lastDay(period)}.{m}.{y} · {snap.timezone} · rules {snap.rule_version} · snapshot {report.id.slice(0, 8)}</span>
        </header>

        <div className="report-full__kpi">
          <div>
            <span className="hx-eyebrow">Verified risky action rate</span>
            <span className="report-full__rate">{rate(risky, snap.eligible)}</span>
            <span className="muted">
              {count(risky)} verified risky actions ÷ {count(snap.eligible)} eligible simulations
              {diff != null && ` · ${diff <= 0 ? "↓" : "↑"} ${Math.abs(diff).toFixed(1)} pts vs previous month`}
            </span>
          </div>
          <dl className="hx-report__grid">
            <div className="hx-report__metric"><dt>Employees tested</dt><dd>{count(snap.employees_targeted)}</dd></div>
            <div className="hx-report__metric"><dt>Simulations sent</dt><dd>{count(snap.simulations_sent)}</dd></div>
            <div className="hx-report__metric"><dt>Link requests</dt><dd>{count(snap.link_requests)}</dd></div>
            <div className="hx-report__metric"><dt>Verified safe</dt><dd>{count(snap.outcomes.verified_safe)}</dd></div>
          </dl>
        </div>

        <div className="hx-report__body">
          <OutcomeBar outcomes={snap.outcomes} label={`Results for ${formatMonth(report.period)}`} />
          <p className="muted">
            Of the verified risky actions, {count(snap.levels.l4)} were confirmed by several independent signals (L4) and {count(snap.levels.l3)} by a completed action with
            credible signs of a person (L3). {count(snap.link_requests)} simulations had a link request, but link requests alone never count as failures.
            {unclear > 0 && ` ${count(unclear)} results were inconclusive or still suspected, and are not counted.`}
          </p>

          {snap.groups.length > 0 && (
            <div className="hx-table-wrap">
              <table className="hx-table">
                <caption className="hx-visually-hidden">Results by group</caption>
                <thead><tr><th scope="col">Group</th><th scope="col" className="is-num">Eligible</th><th scope="col" className="is-num">Verified risky</th><th scope="col" className="is-num">Rate</th><th scope="col" className="is-num">Verified safe</th></tr></thead>
                <tbody>
                  {snap.groups.map((g) => (
                    <tr key={g.name}><td>{g.name}</td><td className="is-num">{count(g.eligible)}</td><td className="is-num">{count(g.verified_risky)}</td><td className="is-num">{rate(g.verified_risky, g.eligible)}</td><td className="is-num">{count(g.verified_safe)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {worst && worst.verified_risky > 0 && (
            <div className="report-full__recs">
              <strong>Recommendation</strong>
              <ul className="hx-report__recs">
                <li>{worst.name} had the highest verified risky action rate ({rate(worst.verified_risky, worst.eligible)}). Consider a short training moment for this group.</li>
                {snap.outcomes.verified_safe > 0 && <li>{count(snap.outcomes.verified_safe)} people checked before acting. Mention this in your next team update.</li>}
              </ul>
            </div>
          )}

          <p className="hx-help">
            Measured: sends, provider acceptance, bounces, signed-link requests, page interactions, completed practice actions and replies to Helvax mailboxes.
            Not measured: whether an email was read, internal forwarding, or reports to your own IT team.
          </p>
        </div>
      </article>
    </div>
  );
}
