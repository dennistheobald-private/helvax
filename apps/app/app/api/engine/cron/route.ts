import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { dispatchDue } from "@/lib/engine/dispatch";
import { runMonthlyReports } from "@/lib/engine/reports";
import { syncSeats } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

// Runs the engine: closes observation windows, plans the next 30 days for companies that
// are allowed to send, sends what is due, then builds and emails last month's reports.
// Also keeps billed seats equal to active employees. Safe to run any time; with sending
// off at any level nothing is sent to employees.
export async function GET(request: NextRequest) {
  if (!authorized(request)) return new NextResponse("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const [{ data: closed }, { data: planned }] = await Promise.all([
    admin.rpc("engine_close_windows"),
    admin.rpc("engine_plan_all"),
  ]);
  const dispatched = await dispatchDue();
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const reports = await runMonthlyReports(origin);
  const seatsUpdated = await syncSeats().catch((e) => { console.error("Seat sync failed", e); return -1; });
  return NextResponse.json({ closed, planned, ...dispatched, reports, seatsUpdated });
}
