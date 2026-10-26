import "server-only";
import type { ReportSnapshot } from "../database.types";
import { escapeHtml, sendEmail } from "../email";
import { createAdminClient } from "../supabase/admin";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pct(n: number, d: number) {
  return d ? `${((n / d) * 100).toFixed(1)}%` : "–";
}

/** The email holds company totals only. Names and per-person results stay in the app. */
export function reportEmail(company: string, period: string, snap: ReportSnapshot, url: string) {
  const [y, m] = period.split("-");
  const month = `${MONTHS[Number(m) - 1]} ${y}`;
  const o = snap.outcomes;
  const prev = snap.previous?.eligible ? pct(snap.previous.verified_risky, snap.previous.eligible) : null;
  const lines: [string, string][] = [
    ["Verified risky action rate", `${pct(o.verified_risky, snap.eligible)}${prev ? ` (previous month ${prev})` : ""}`],
    ["Employees tested", String(snap.employees_targeted)],
    ["Simulations sent", String(snap.simulations_sent)],
    ["Verified risky actions", String(o.verified_risky)],
    ["Verified safe (checked or refused)", String(o.verified_safe)],
    ["Suspected or inconclusive, not counted", String(o.suspected + o.inconclusive)],
    ["Only touched by mail scanners", String(o.scanner_only)],
  ];
  const subject = `${company}: security summary for ${month}`;
  const text = [
    `Your Helvax summary for ${month} is ready.`, "",
    ...lines.map(([k, v]) => `${k}: ${v}`), "",
    "Only actions verified by evidence count. Link visits alone never do.", "",
    `Open the full report: ${url}`,
  ].join("\n");
  const rows = lines.map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#555">${escapeHtml(k)}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(v)}</td></tr>`).join("");
  const html = `<p>Your Helvax summary for <strong>${escapeHtml(month)}</strong> is ready.</p>`
    + `<table style="border-collapse:collapse;font-size:14px">${rows}</table>`
    + `<p style="color:#555;font-size:13px">Only actions verified by evidence count. Link visits alone never do.</p>`
    + `<p><a href="${escapeHtml(url)}">Open the full report</a></p>`;
  return { subject, text, html };
}

/** Builds last month's reports once their window has closed, then emails each one once. */
export async function runMonthlyReports(appOrigin: string): Promise<{ built: number; emailed: number }> {
  const admin = createAdminClient();
  if (!admin) return { built: 0, emailed: 0 };
  const { data: built, error } = await admin.rpc("engine_build_reports", {});
  if (error) throw new Error(`engine_build_reports failed: ${error.message}`);
  if (!process.env.RESEND_API_KEY) return { built: built ?? 0, emailed: 0 };

  const { data: outbox } = await admin.rpc("engine_reports_to_send");
  let emailed = 0;
  for (const r of outbox ?? []) {
    const period = r.period.slice(0, 7);
    const mail = reportEmail(r.tenant_name, period, r.snapshot, `${appOrigin}/reports/${period}`);
    let delivered = 0;
    for (const to of r.recipients) {
      if (await sendEmail({ to, ...mail, idempotencyKey: `report/${r.report_id}/${to}` })) delivered++;
    }
    // Retried on the next run if nobody could be reached; the keys stop duplicates.
    if (delivered > 0) {
      await admin.rpc("engine_mark_report_sent", { report: r.report_id });
      emailed++;
    }
  }
  return { built: built ?? 0, emailed };
}
