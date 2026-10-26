import { NextResponse, type NextRequest } from "next/server";
import { detectRequest, pageActor } from "@/lib/engine/detect";
import { ACTIONS, loadLanding } from "@/lib/engine/landing";
import { verifyToken } from "@/lib/engine/token";
import { allow, clientIp } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

const KINDS = ["js", "interaction", "action", "training"] as const;
type Kind = (typeof KINDS)[number];
/** More events than this from one page view are ignored. */
const MAX_EVENTS = 12;

// Events from the practice page. The body only ever says what happened, never what was
// typed: the page's fields have no names and are never read.
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const none = new NextResponse(null, { status: 204 });
  if (Number(request.headers.get("content-length") ?? 0) > 512) return none;
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return none;
  if (!(await allow("practice-ip", await clientIp(request.headers), 120, 60))) return none;

  const body = (await request.json().catch(() => null)) as { s?: unknown; k?: unknown; p?: unknown } | null;
  const simulationId = verifyToken("link", token);
  const sessionId = verifyToken("session", body?.s);
  const kind = KINDS.includes(body?.k as Kind) ? (body!.k as Kind) : null;
  const admin = createAdminClient();
  if (!simulationId || !sessionId || !kind || !admin) return none;

  const landing = await loadLanding(simulationId);
  if (!landing) return none;
  const { data: session } = await admin.from("landing_sessions").select("id, simulation_id, js_executed, pointer_events").eq("id", sessionId).maybeSingle();
  if (!session || session.simulation_id !== simulationId) return none;
  const { count } = await admin.from("events").select("id", { count: "exact", head: true }).eq("session_id", sessionId);
  if ((count ?? 0) >= MAX_EVENTS) return none;

  const pointer = Math.max(0, Math.min(Number(body?.p) || 0, 10_000));
  await admin.rpc("engine_touch_session", { session: sessionId, pointer_events: pointer });
  if (kind === "js") return none;

  const detection = detectRequest({ userAgent: request.headers.get("user-agent"), method: "POST", secondsAfterSend: null });
  const who = pageActor(detection, { js_executed: true, pointer_events: Math.max(pointer, session.pointer_events) });
  await admin.rpc("engine_record", {
    sim: simulationId,
    session: sessionId,
    kind: kind === "interaction" ? "page_interaction" : kind === "action" ? "action_completed" : "training_completed",
    who,
    detection: { ...detection.signals, pointer_events: pointer, ...(kind === "action" && { fields: "synthetic" }) },
    simulated_action: kind === "action" ? ACTIONS[landing.category] : null,
  });
  return none;
}
