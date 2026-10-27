import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@helvax/ui/react";
import { SampleDataBanner } from "@/components/SampleDataBanner";
import { hasSampleData } from "@/lib/data";
import type { ReportSnapshot } from "@/lib/database.types";
import { count, formatMonth, rate } from "@/lib/results";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const s = await requireSession();
  const supabase = await createClient();
  const [{ data: reports }, sample] = await Promise.all([
    supabase.from("reports").select("id, period, snapshot, sent_at, is_demo").eq("tenant_id", s.tenant.id).order("period", { ascending: false }).limit(36),
    hasSampleData(s.tenant.id),
  ]);

  if ((reports ?? []).length === 0) {
    return (
      <EmptyState icon="report" title="Your first monthly report appears here">
        After the first full month of simulations, Helvax freezes the results into a report: the verified risky action rate,
        every outcome category and the breakdown by group. It is emailed to admins on the first working day of the month.
      </EmptyState>
    );
  }

  return (
    <div className="page">
      {sample && <SampleDataBanner canClear={s.isAdmin} />}
      <p className="muted">Each report is a frozen snapshot. A later review never changes a report that was already sent.</p>
      <div className="report-cards">
        {(reports ?? []).map((r) => {
          const snap = r.snapshot as ReportSnapshot;
          return (
            <Link key={r.id} href={`/reports/${r.period.slice(0, 7)}`} className="hx-card hx-card--interactive report-card">
              <span className="hx-eyebrow">{formatMonth(r.period)}{r.is_demo ? " · sample" : ""}</span>
              <span className="report-card__rate">{rate(snap.outcomes.verified_risky, snap.eligible)}</span>
              <span className="muted">verified risky action rate</span>
              <span className="report-card__meta">
                <span>{count(snap.simulations_sent)} sent</span>
                <span>{count(snap.outcomes.verified_risky)} verified risky</span>
                <span>{count(snap.outcomes.verified_safe)} verified safe</span>
              </span>
              {r.sent_at ? <Badge tone="outline">Emailed</Badge> : <Badge>Not emailed</Badge>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
