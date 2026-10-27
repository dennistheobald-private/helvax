import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState } from "@helvax/ui/react";
import { OutcomeBadge } from "@/components/OutcomeBadge";
import { SampleDataBanner } from "@/components/SampleDataBanner";
import { hasSampleData } from "@/lib/data";
import type { OutcomeResult, ScenarioCategory } from "@/lib/database.types";
import { CATEGORIES, OUTCOMES, OUTCOME_ORDER, count, formatDate } from "@/lib/results";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Activity" };

const PAGE = 50;

type Row = {
  id: string;
  sent_at: string | null;
  scheduled_at: string;
  employees: { first_name: string; last_name: string; email: string } | null;
  scenarios: { title: string; category: ScenarioCategory } | null;
  outcomes: { result: OutcomeResult; evidence_level: number } | null;
};

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ result?: string; page?: string }> }) {
  const s = await requireSession();
  const sp = await searchParams;
  const result = OUTCOME_ORDER.includes(sp.result as OutcomeResult) ? (sp.result as OutcomeResult) : null;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("simulations")
    .select(`id, sent_at, scheduled_at, employees(first_name, last_name, email), scenarios(title, category), outcomes${result ? "!inner" : ""}(result, evidence_level)`, { count: "exact" })
    .eq("tenant_id", s.tenant.id)
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (result) query = query.eq("outcomes.result", result);

  const [{ data, count: total }, sample] = await Promise.all([query, hasSampleData(s.tenant.id)]);
  const rows = (data ?? []) as unknown as Row[];
  const pages = Math.max(1, Math.ceil((total ?? 0) / PAGE));
  const href = (p: number) => `/activity?${new URLSearchParams({ ...(result && { result }), page: String(p) })}`;

  return (
    <div className="page">
      {sample && <SampleDataBanner canClear={s.isAdmin} />}

      <nav className="filter-chips" aria-label="Filter by result">
        <Link className="hx-chip" href="/activity" aria-pressed={!result}>All</Link>
        {OUTCOME_ORDER.map((k) => (
          <Link key={k} className="hx-chip" href={`/activity?result=${k}`} aria-pressed={result === k} title={OUTCOMES[k].help}>{OUTCOMES[k].label}</Link>
        ))}
      </nav>

      <Card className="section section--flush">
        {rows.length === 0 ? (
          <EmptyState icon="activity" title={result ? `No “${OUTCOMES[result].label.toLowerCase()}” results` : "No simulations yet"}>
            {result ? "Nothing with this result right now." : "Every simulation and the evidence behind its result will appear here."}
          </EmptyState>
        ) : (
          <div className="hx-table-wrap table-plain">
            <table className="hx-table">
              <caption className="hx-visually-hidden">Simulations, newest first</caption>
              <thead><tr><th scope="col">Sent</th><th scope="col">Employee</th><th scope="col">Scenario</th><th scope="col">Evidence</th><th scope="col">Result</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="row-link">
                    <td className="nowrap">{formatDate(r.sent_at ?? r.scheduled_at, s.tenant.timezone)}</td>
                    <td>
                      <Link href={`/activity/${r.id}`} className="row-link__target">
                        {r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : "Removed employee"}
                      </Link>
                      {r.employees && <div className="muted">{r.employees.email}</div>}
                    </td>
                    <td>{r.scenarios?.title}<div className="muted">{r.scenarios ? CATEGORIES[r.scenarios.category].label : ""}</div></td>
                    <td className="hx-mono">L{r.outcomes?.evidence_level ?? 0}</td>
                    <td><OutcomeBadge result={r.outcomes?.result} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <nav className="pager" aria-label="Pages">
            {page > 1 ? <Link className="hx-btn hx-btn--outline hx-btn--sm" href={href(page - 1)}>Previous</Link> : <span />}
            <span className="muted">Page {page} of {pages} · {count(total ?? 0)} simulations</span>
            {page < pages ? <Link className="hx-btn hx-btn--outline hx-btn--sm" href={href(page + 1)}>Next</Link> : <span />}
          </nav>
        )}
      </Card>
    </div>
  );
}
