import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { dispatchDue } from "@/lib/engine/dispatch";
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
// are allowed to send, then sends what is due. Safe to run any time; with sending off
// at any level it only closes windows.
export async function GET(request: NextRequest) {
  if (!authorized(request)) return new NextResponse("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const [{ data: closed }, { data: planned }] = await Promise.all([
    admin.rpc("engine_close_windows"),
    admin.rpc("engine_plan_all"),
  ]);
  const dispatched = await dispatchDue();
  return NextResponse.json({ closed, planned, ...dispatched });
}
