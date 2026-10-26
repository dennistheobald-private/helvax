// Plain-language labels for outcomes, evidence levels and events. docs/verification.md
// is the source for what each level and result means.
import type { BadgeTone } from "@helvax/ui/react";
import type { EventActor, EventType, OutcomeResult, ReplyCategory, ScenarioCategory } from "./database.types";

export const OUTCOMES: Record<OutcomeResult, { label: string; tone: BadgeTone; help: string }> = {
  verified_risky: { label: "Verified risky action", tone: "danger", help: "Completed a simulated risky action with credible signs of a real person. Counts as a failure." },
  suspected: { label: "Suspected", tone: "warning", help: "A risky action looks likely but isn't verified. It needs review and does not count yet." },
  inconclusive: { label: "Inconclusive", tone: "outline", help: "Some activity, but not enough evidence either way. Never counted as a failure." },
  scanner_only: { label: "Scanner only", tone: "info", help: "Only mail scanners or automated browsers touched the link. Not counted." },
  verified_safe: { label: "Verified safe", tone: "success", help: "Showed safe behaviour, such as replying to verify the request." },
  no_interaction: { label: "No interaction", tone: "neutral", help: "Delivered with no activity seen. This is not proof of safe behaviour." },
  pending: { label: "Pending", tone: "neutral", help: "Still inside the observation window." },
  not_delivered: { label: "Not delivered", tone: "neutral", help: "Bounced or failed. Not eligible for the rate." },
};

/** Display order: what matters most first. */
export const OUTCOME_ORDER: OutcomeResult[] = ["verified_risky", "suspected", "inconclusive", "scanner_only", "verified_safe", "no_interaction", "pending", "not_delivered"];

export const LEVELS = [
  { level: 0, name: "Sent", help: "Sent and accepted by the mail provider." },
  { level: 1, name: "Link requested", help: "The signed link was requested. Mail scanners do this too." },
  { level: 2, name: "Deliberate interaction", help: "A deliberate action on the page, such as pressing Continue." },
  { level: 3, name: "Risky action completed", help: "Completed a simulated security-sensitive action." },
  { level: 4, name: "Confirmed by several signals", help: "A risky action confirmed by independent signals." },
] as const;

export const levelLabel = (n: number) => `L${n} · ${LEVELS[n]?.name ?? ""}`;

const EVENTS: Record<EventType, string> = {
  accepted: "Accepted by the mail provider",
  bounced: "Bounced",
  failed: "Could not be sent",
  link_request: "Signed link requested",
  qr_request: "QR code link requested",
  page_interaction: "Deliberate interaction on the page",
  action_completed: "Completed the simulated action",
  reply: "Replied",
  training_completed: "Finished the training moment",
};

export function eventTitle(type: EventType, action: string | null) {
  if (type === "action_completed" && action) return `Completed the simulated ${action.replaceAll("_", " ")}`;
  return EVENTS[type];
}

export const ACTORS: Record<EventActor, { label: string; tone: BadgeTone }> = {
  human_likely: { label: "Likely a person", tone: "brand" },
  unknown: { label: "Not attributed", tone: "outline" },
  scanner: { label: "Mail scanner", tone: "info" },
  automation: { label: "Automated browser", tone: "info" },
};

export const REPLIES: Record<ReplyCategory, { label: string; tone: BadgeTone }> = {
  risky_intent: { label: "Agrees to the request", tone: "danger" },
  verification: { label: "Asks to verify", tone: "success" },
  refusal: { label: "Refuses", tone: "success" },
  neutral: { label: "Neutral", tone: "neutral" },
  ambiguous: { label: "Ambiguous", tone: "outline" },
};

export const CATEGORIES: Record<ScenarioCategory, { label: string; icon: "mail" | "invoice" | "person" | "qr" | "doc" | "eye" }> = {
  phishing: { label: "Phishing", icon: "mail" },
  supplier_fraud: { label: "Supplier fraud", icon: "invoice" },
  executive_impersonation: { label: "Executive impersonation", icon: "person" },
  qr_phishing: { label: "QR phishing", icon: "qr" },
  document_link: { label: "Document link", icon: "doc" },
  credential_form: { label: "Safe sign-in practice", icon: "eye" },
};

export const DIFFICULTY = ["", "Easy", "Medium", "Hard"] as const;

/** Verified risky actions as a share of eligible simulations, e.g. "3.4%". */
export function rate(risky: number, eligible: number) {
  if (!eligible) return "–";
  return `${((risky / eligible) * 100).toFixed(1)}%`;
}

export function formatDate(iso: string, timeZone: string, withTime = false) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone, day: "2-digit", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatMonth(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export const count = (n: number) => n.toLocaleString("en-GB");

/** "26 Oct, 10:42", for timelines. */
export function formatShort(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString("en-GB", { timeZone, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
