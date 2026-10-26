import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, StatCard, buttonClass } from "@helvax/ui/react";
import { OutcomeBadge } from "@/components/OutcomeBadge";
import { OutcomeBar } from "@/components/OutcomeBar";
import { SampleDataBanner } from "@/components/SampleDataBanner";
import { hasSampleData } from "@/lib/data";
import type { OutcomeResult, OutcomeSummary } from "@/lib/database.types";
import { CATEGORIES, count, formatDate, rate } from "@/lib/results";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { loadSampleData } from "../actions";

export const metadata: Metadata = { title: "Overview" };

const DAY = 86_400_000;
const EMPTY: OutcomeSummary = { sent: 0, eligible: 0, outcomes: {} };

export default async function OverviewPage() {
  const s = await requireSession();
  const supabase = await createClient();
  // Rounded to the hour so the window doesn't shift between requests.
  const now = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const since = new Date(now - 30 * DAY).toISOString();
  const before = new Date(now - 60 * DAY).toISOString();

  const [{ count: employees }, current, previous, { data: notable }, sample] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("tenant_id", s.tenant.id).eq("status", "active"),
    supabase.rpc("outcome_summary", { t: s.tenant.id, since }),
    supabase.rpc("outcome_summary", { t: s.tenant.id, since: before, until: since }),
    supabase
      .from("outcomes")
      .select("result, evidence_level, decided_at, simulations!inner(id, sent_at, employees(first_name, last_name), scenarios(title, category))")
      .eq("tenant_id", s.tenant.id)
      .in("result", ["verified_risky", "suspected", "verified_safe"])
      .order("decided_at", { ascending: false })
      .limit(6),
    hasSampleData(s.tenant.id),
  ]);

  const cur = current.data ?? EMPTY;
  const prev = previous.data ?? EMPTY;

  if (!employees && !cur.sent) {
    return (
      <EmptyState
        title="Your security overview appears here"
        actions={
          <>
            <Link className={buttonClass({})} href="/employees">Add employees</Link>
            {s.isAdmin && (
              <form action={loadSampleData}><button type="submit" className={buttonClass({ variant: "outline" })}>Explore with sample data</button></form>
            )}
          </>
        }
      >
        Add the people you want to protect. Once simulations run, you&apos;ll see verified results, trends and what needs your review.
        Sample data lets you look around first, without sending anything.
      </EmptyState>
    );
  }

  const o = (k: OutcomeResult, sum = cur) => sum.outcomes[k] ?? 0;
  const curRate = cur.eligible ? o("verified_risky") / cur.eligible : null;
  const prevRate = prev.eligible ? o("verified_risky", prev) / prev.eligible : null;
  const diff = curRate != null && prevRate != null ? (curRate - prevRate) * 100 : null;
  const unclear = o("inconclusive") + o("suspected");
  const delivered = cur.sent - o("not_delivered");

  return (
    <div className="page">
      {sample && <SampleDataBanner canClear={s.isAdmin} />}

      <div className="stats">
        <StatCard
          label="Verified risky action rate"
          value={rate(o("verified_risky"), cur.eligible)}
          delta={diff == null ? undefined : `${diff <= 0 ? "↓" : "↑"} ${Math.abs(diff).toFixed(1)} pts vs previous 30 days`}
          trend={diff == null || Math.abs(diff) < 0.05 ? "flat" : diff < 0 ? "better" : "worse"}
        />
        <StatCard label="Verified risky actions" value={count(o("verified_risky"))} delta={`of ${count(cur.eligible)} eligible simulations`} />
        <StatCard label="Verified safe responses" value={count(o("verified_safe"))} delta="people who checked before acting" />
        <Link href="/activity?result=suspected" className="stat-link">
          <StatCard label="Waiting for review" value={count(o("suspected"))} delta={o("suspected") ? "Review now →" : "Nothing to review"} trend={o("suspected") ? "worse" : "flat"} />
        </Link>
      </div>

      <Card className="section">
        <header className="section__head">
          <div><h2>Last 30 days</h2><p className="muted">Every simulation has exactly one result. Link visits alone never count as a failure.</p></div>
          <Link className="hx-link hx-link--arrow" href="/activity">All activity</Link>
        </header>
        <OutcomeBar outcomes={cur.outcomes} label="Results of the last 30 days" />
        <dl className="coverage">
          <div><dt>Delivered</dt><dd>{cur.sent ? `${Math.round((delivered / cur.sent) * 100)}%` : "–"}</dd><span className="muted">{count(delivered)} of {count(cur.sent)} sent</span></div>
          <div><dt>Clear result</dt><dd>{cur.eligible ? `${Math.round(((cur.eligible - unclear) / cur.eligible) * 100)}%` : "–"}</dd><span className="muted">eligible simulations that aren&apos;t inconclusive or suspected</span></div>
          <div><dt>Active employees</dt><dd>{count(employees ?? 0)}</dd><span className="muted"><Link className="hx-link" href="/employees">Manage employees</Link></span></div>
        </dl>
      </Card>

      <Card className="section">
        <header className="section__head"><div><h2>Recent results that matter</h2><p className="muted">Verified risky actions, suspected ones and verified safe responses.</p></div></header>
        {(notable ?? []).length === 0 ? (
          <p className="muted">Nothing yet. Results appear here as soon as the evidence is clear.</p>
        ) : (
          <ul className="result-list">
            {(notable ?? []).map((n) => {
              const sim = n.simulations as unknown as { id: string; sent_at: string | null; employees: { first_name: string; last_name: string } | null; scenarios: { title: string; category: keyof typeof CATEGORIES } | null };
              return (
                <li key={sim.id}>
                  <Link href={`/activity/${sim.id}`}>
                    <span className="result-list__who">{sim.employees ? `${sim.employees.first_name} ${sim.employees.last_name}` : "Removed employee"}</span>
                    <span className="muted">{sim.scenarios?.title} · {sim.scenarios ? CATEGORIES[sim.scenarios.category].label : ""}</span>
                    <span className="result-list__end"><OutcomeBadge result={n.result} /><span className="muted">{formatDate(n.decided_at, s.tenant.timezone)}</span></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
