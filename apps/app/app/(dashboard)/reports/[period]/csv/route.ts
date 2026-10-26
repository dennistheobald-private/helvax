import { NextResponse } from "next/server";
import type { ReportSnapshot } from "@/lib/database.types";
import { OUTCOME_ORDER, OUTCOMES } from "@/lib/results";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const cell = (v: string | number) => {
  const s = String(v);
  // Quote everything that could break a row or be read as a formula by a spreadsheet.
  return /[",;\n\r]|^[=+\-@\t]/.test(s) ? `"${s.replace(/^([=+\-@\t])/, "'$1").replace(/"/g, '""')}"` : s;
};

// Company totals and group totals for one month, from the frozen snapshot.
export async function GET(_request: Request, { params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return new NextResponse("Not found", { status: 404 });
  const s = await requireSession();
  const supabase = await createClient();
  const { data: report } = await supabase.from("reports").select("id, snapshot, is_demo")
    .eq("tenant_id", s.tenant.id).eq("period", `${period}-01`).maybeSingle();
  if (!report) return new NextResponse("Not found", { status: 404 });

  const snap = report.snapshot as ReportSnapshot;
  const rows: (string | number)[][] = [
    ["Company", s.tenant.name],
    ["Period", period],
    ["Snapshot", report.id],
    ["Rules", snap.rule_version],
    ["Data", report.is_demo ? "sample data" : "real simulations"],
    [],
    ["Metric", "Value"],
    ["Employees tested", snap.employees_targeted],
    ["Simulations sent", snap.simulations_sent],
    ["Eligible simulations", snap.eligible],
    ["Verified risky action rate (%)", snap.eligible ? ((snap.outcomes.verified_risky / snap.eligible) * 100).toFixed(2) : ""],
    ["Verified risky at L3", snap.levels.l3],
    ["Verified risky at L4", snap.levels.l4],
    ["Simulations with a link request", snap.link_requests],
    ...OUTCOME_ORDER.map((k) => [OUTCOMES[k].label, snap.outcomes[k] ?? 0]),
    [],
    ["Group", "Eligible", "Verified risky", "Verified safe", "Rate (%)"],
    ...snap.groups.map((g) => [g.name, g.eligible, g.verified_risky, g.verified_safe, g.eligible ? ((g.verified_risky / g.eligible) * 100).toFixed(2) : ""]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="helvax-report-${period}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
