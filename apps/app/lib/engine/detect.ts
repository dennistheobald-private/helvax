// Tells mail scanners and automated clients apart from people. Conservative: anything
// unclear stays "unknown", and only signs of a person (JavaScript and pointer input in
// the same session) make an event "human_likely". docs/verification.md has the rules.
import type { EventActor } from "../database.types";

const SCANNERS: [RegExp, string][] = [
  [/safelinks|microsoft office|ms-office|outlook-ios|microsoft url|bingpreview|msnbot/i, "microsoft"],
  [/google-safety|googlebot|google-read-aloud|feedfetcher|googleother|apis-google/i, "google"],
  [/proofpoint|mimecast|barracuda|ironport|cisco|fireeye|trellix|trend ?micro|forcepoint|sophos|symantec|broadcom|zscaler|checkpoint|fortinet|paloalto|hornet|spamtitan|vade|messagelabs|cloudmark/i, "security_vendor"],
  [/slackbot|facebookexternalhit|linkedinbot|whatsapp|telegrambot|skypeuripreview|discordbot|twitterbot|applebot|yandex|baiduspider|duckduckbot/i, "link_preview"],
  [/bot\b|crawler|spider|scan(ner)?\b|preview/i, "generic_bot"],
];
const AUTOMATION = /python|curl|wget|go-http-client|java\/|okhttp|libwww|httpclient|node-fetch|axios|undici|headlesschrome|phantomjs|puppeteer|playwright|selenium|electron\//i;

/** Requests faster than this after delivery are almost always gateways checking the link. */
const MIN_HUMAN_SECONDS = 10;

export interface Detection {
  actor: EventActor;
  signals: Record<string, string | number | boolean>;
  network: "security_vendor" | "unknown";
  browser: string;
}

export function browserFamily(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/chrome\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua)) return "Safari";
  return "Other";
}

export function detectRequest({ userAgent, method, secondsAfterSend }: { userAgent: string | null; method: string; secondsAfterSend: number | null }): Detection {
  const ua = userAgent ?? "";
  const signals: Detection["signals"] = {};
  if (secondsAfterSend != null) signals.seconds_after_send = Math.max(0, Math.round(secondsAfterSend));
  const browser = browserFamily(ua);

  if (!ua) return { actor: "automation", signals: { ...signals, reason: "no_user_agent" }, network: "unknown", browser: "Unknown" };
  for (const [re, kind] of SCANNERS) {
    if (re.test(ua)) return { actor: "scanner", signals: { ...signals, reason: kind }, network: kind === "security_vendor" || kind === "microsoft" || kind === "google" ? "security_vendor" : "unknown", browser };
  }
  if (AUTOMATION.test(ua)) return { actor: "automation", signals: { ...signals, reason: "automation_client" }, network: "unknown", browser };
  if (method === "HEAD") return { actor: "scanner", signals: { ...signals, reason: "head_request" }, network: "unknown", browser };
  if (secondsAfterSend != null && secondsAfterSend < MIN_HUMAN_SECONDS) return { actor: "scanner", signals: { ...signals, reason: "too_fast" }, network: "unknown", browser };
  return { actor: "unknown", signals, network: "unknown", browser };
}

/** Who caused an in-page event, from the request and what the session has shown so far. */
export function pageActor(request: Detection, session: { js_executed: boolean; pointer_events: number }): EventActor {
  if (request.actor === "scanner" || request.actor === "automation") return request.actor;
  return session.js_executed && session.pointer_events > 0 ? "human_likely" : "unknown";
}
