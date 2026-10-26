import type { Metadata } from "next";
import { headers } from "next/headers";
import { detectRequest } from "@/lib/engine/detect";
import { loadLanding } from "@/lib/engine/landing";
import { UI, toLocale, type Locale } from "@/lib/engine/practice-copy";
import { hashAddress, signToken, verifyToken } from "@/lib/engine/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { Practice } from "./Practice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Secure access" }, robots: { index: false, follow: false } };

function Unavailable({ locale }: { locale: Locale }) {
  const ui = UI[locale];
  return (
    <main className="practice practice--center" lang={locale}>
      <div className="practice__card">
        <h1>{ui.unavailableTitle}</h1>
        <p>{ui.unavailableLead}</p>
      </div>
    </main>
  );
}

// Opening the link is evidence level 1 (a link request). Mail scanners open links too, so
// the request is labelled by who most likely made it; it never counts as a failure.
export default async function LandingPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ q?: string }> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const simulationId = verifyToken("link", token);
  const landing = simulationId ? await loadLanding(simulationId) : null;
  const admin = createAdminClient();
  const h = await headers();
  if (!landing || !admin) return <Unavailable locale={toLocale(h.get("accept-language")?.slice(0, 2))} />;

  const detection = detectRequest({
    userAgent: h.get("user-agent"),
    method: "GET",
    secondsAfterSend: (Date.now() - new Date(landing.sentAt).getTime()) / 1000,
  });
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { data: sessionId } = await admin.rpc("engine_start_session", {
    sim: landing.simulationId, ip_hash: hashAddress(ip), user_agent_family: detection.browser, network_class: detection.network,
  });
  if (!sessionId) return <Unavailable locale={landing.locale} />;
  await admin.rpc("engine_record", {
    sim: landing.simulationId, session: sessionId, kind: sp.q === "1" ? "qr_request" : "link_request", who: detection.actor, detection: detection.signals,
  });

  return (
    <Practice
      token={token}
      session={signToken("session", sessionId)}
      category={landing.category}
      senderName={landing.senderName}
      company={landing.company}
      training={landing.training}
      locale={landing.locale}
    />
  );
}
