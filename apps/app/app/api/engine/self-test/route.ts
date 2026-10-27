import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { deliver } from "@/lib/engine/dispatch";
import { allow } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.ENGINE_SELF_TEST_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return Boolean(secret && secret.length >= 32) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

// Backend-only self-test: sends one real simulation to a platform superadmin's own account
// email, to check delivery, the practice link and event logging. Not linked from any page.
// It skips the sending switches and the verified-domain gate for that one recipient and
// never changes a switch.
//
//   curl -X POST https://app.helvax.ch/api/engine/self-test \
//     -H "Authorization: Bearer $ENGINE_SELF_TEST_SECRET" \
//     -H "Content-Type: application/json" -d '{"email":"you@example.com","scenario":"webmail-storage"}'
export async function POST(request: NextRequest) {
  if (!authorized(request)) return new NextResponse("Not found", { status: 404 });
  const admin = createAdminClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const fromDomain = process.env.SIMULATION_FROM_DOMAIN;
  const key = process.env.SIMULATION_RESEND_API_KEY || process.env.RESEND_API_KEY;
  if (!admin || !origin?.startsWith("https://") || !fromDomain || !key || (process.env.SIMULATION_TOKEN_SECRET?.length ?? 0) < 32) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: unknown; scenario?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const scenario = typeof body.scenario === "string" && /^[a-z0-9-]{1,64}$/.test(body.scenario) ? body.scenario : null;
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
  if (!(await allow("self-test", "global", 5, 3600))) return NextResponse.json({ error: "Too many self-tests. Try again in an hour." }, { status: 429 });

  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).eq("is_superadmin", true).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Self-tests only go to a platform superadmin's own account email." }, { status: 403 });

  const { data: rows, error } = await admin.rpc("engine_self_test", { superadmin: profile.id, slug: scenario });
  if (error || !rows?.length) return NextResponse.json({ error: error?.message ?? "Couldn't create the self-test." }, { status: 422 });

  const result = await deliver(admin, { origin, fromDomain, replyDomain: process.env.SIMULATION_REPLY_DOMAIN || null }, rows);
  const row = rows[0]!;
  return NextResponse.json({ simulation_id: row.simulation_id, scenario: row.scenario_slug, to: row.email, ...result });
}
