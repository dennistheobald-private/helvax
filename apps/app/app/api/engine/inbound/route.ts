import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { CLASSIFIER_VERSION, classifyReply, ownText } from "@/lib/engine/classify";
import { verifyToken } from "@/lib/engine/token";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Resend signs webhooks the Svix way: HMAC-SHA256 over "id.timestamp.body". */
function verifySignature(request: NextRequest, body: string) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signatures = request.headers.get("svix-signature");
  if (!secret || !id || !timestamp || !signatures) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = Buffer.from(createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64"));
  return signatures.split(" ").some((s) => {
    const given = Buffer.from(s.split(",")[1] ?? "");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

type Payload = {
  type?: string;
  data?: { email_id?: string; to?: string[] | string; text?: string; body?: { text?: string } };
};

// Replies to simulations (sent to r<token>@ the reply domain) and delivery problems.
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 256_000 || !verifySignature(request, raw)) return new NextResponse("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  if (!admin) return new NextResponse("Not configured", { status: 503 });
  let event: Payload;
  try {
    event = JSON.parse(raw) as Payload;
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const data = event.data ?? {};

  if (event.type === "email.bounced" || event.type === "email.complained") {
    if (data.email_id) await admin.rpc("engine_mark_bounced", { provider_id: data.email_id, complaint: event.type === "email.complained" });
    return NextResponse.json({ ok: true });
  }

  if (event.type === "email.received") {
    const to = Array.isArray(data.to) ? data.to : data.to ? [data.to] : [];
    const simulationId = to
      .map((addr) => /\br([0-9a-f]{52})@/i.exec(addr)?.[1])
      .map((token) => verifyToken("reply", token))
      .find(Boolean);
    const text = data.text ?? data.body?.text ?? "";
    if (simulationId && text) {
      const result = classifyReply(text);
      // Only a short excerpt of the employee's own words is kept, for the reviewer.
      const excerpt = ownText(text).replace(/\s+/g, " ").slice(0, 280);
      await admin.rpc("engine_record_reply", {
        sim: simulationId, category: result.category, confidence: result.confidence, rule_hits: result.ruleHits,
        marker_found: false, classifier_version: CLASSIFIER_VERSION, excerpt,
      });
    }
  }
  return NextResponse.json({ ok: true });
}
