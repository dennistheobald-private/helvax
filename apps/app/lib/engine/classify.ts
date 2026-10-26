// Deterministic first pass over replies (English, German, Dutch). It never decides a
// failure on its own: risky and ambiguous replies wait for a person to review them.
import type { ReplyCategory } from "../database.types";

export const CLASSIFIER_VERSION = "rules-v1";

const RULES: { category: Exclude<ReplyCategory, "neutral" | "ambiguous">; id: string; re: RegExp }[] = [
  { category: "verification", id: "asks_to_verify", re: /\b(verify|verification|double[- ]check|confirm (this|it) by phone|call you|phone you|is this (real|legit|genuine)|überprüf|verifizier|rückruf|telefonisch|anrufen|ist das echt|controleren|verifiëren|bel(len)? je|klopt dit)\b/i },
  { category: "verification", id: "mentions_policy", re: /\b(our (process|policy)|four[- ]eyes|vier[- ]?augen|official channel|it[- ]?(team|support|security)|security team|sicherheitsteam|beveiligingsteam)\b/i },
  { category: "refusal", id: "declines_request", re: /\b(i (can(no|')t|won'?t|will not)|not able to|declin|refuse|kann (ich )?(das )?nicht|werde (das )?nicht|mache (das )?nicht|kan (ik )?(dit|dat )?niet|ga (ik )?(dit|dat )?niet)\b/i },
  { category: "refusal", id: "suspects_phishing", re: /\b(phishing|scam|suspicious|fraud|spam|betrug|verdächtig|oplichting|verdacht)\b/i },
  { category: "risky_intent", id: "agrees_to_request", re: /\b(done|sure,? (i|i'll)|i('ll| will) (do|send|update|transfer|pay|buy|get)|updated|transferred|paid|here (are|is) the|on it|erledigt|mache ich|wird erledigt|überwiesen|aktualisiert|hier (sind|ist)|gedaan|ik regel|komt in orde|overgemaakt|bijgewerkt|hierbij)\b/i },
  { category: "risky_intent", id: "shares_codes", re: /\b[A-Z0-9]{4}[- ][A-Z0-9]{4}[- ][A-Z0-9]{4}\b/ },
];

export interface Classification {
  category: ReplyCategory;
  confidence: number;
  ruleHits: string[];
}

/** The reply's own words, without quoted history and signatures. */
export function ownText(text: string): string {
  const lines: string[] = [];
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (/^\s*>/.test(line)) continue;
    if (/^(on .+ wrote:|am .+ schrieb .+:|op .+ schreef .+:|-----\s*original message|von:|from:|van:)/i.test(line.trim())) break;
    if (/^--\s*$/.test(line)) break;
    lines.push(line);
  }
  return lines.join("\n").trim();
}

export function classifyReply(text: string): Classification {
  const result = rawClassify(text);
  return { ...result, confidence: Math.round(result.confidence * 100) / 100 };
}

function rawClassify(text: string): Classification {
  const own = ownText(text);
  const hits = RULES.filter((r) => r.re.test(own));
  const safe = hits.filter((h) => h.category !== "risky_intent");
  const risky = hits.filter((h) => h.category === "risky_intent");
  const ruleHits = hits.map((h) => h.id);
  if (!own) return { category: "neutral", confidence: 0.5, ruleHits };
  if (risky.length && safe.length) return { category: "ambiguous", confidence: 0.5, ruleHits };
  if (risky.length) return { category: "risky_intent", confidence: Math.min(0.6 + 0.15 * risky.length, 0.9), ruleHits };
  if (safe.length) {
    const category = safe.some((h) => h.category === "verification") ? "verification" : "refusal";
    return { category, confidence: Math.min(0.7 + 0.1 * safe.length, 0.9), ruleHits };
  }
  return { category: "ambiguous", confidence: 0.4, ruleHits };
}
