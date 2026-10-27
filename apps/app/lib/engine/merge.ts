import "server-only";
import { createHash } from "node:crypto";
import { toLocale, type Locale } from "./practice-copy";

/**
 * Per-send merge tokens. A scenario's subject, preview or sender name may contain
 * placeholders like `{{invoice_no}}`; this fills them with plausible, generated values
 * so two copies of the same template never read identically. Values are derived
 * deterministically from the simulation id, so an idempotent resend produces the exact
 * same message. Nothing here is stored or read back: it only shapes what is sent.
 */

const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", de: "de-CH", nl: "nl-NL" };

/** Deterministic 0..1 generator seeded from the simulation id (mulberry32). */
function seeded(seed: string): () => number {
  let a = createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MergeInput {
  simulationId: string;
  firstName?: string | null;
  lastName?: string | null;
  locale: string;
}

/** Builds the token values for one simulation. */
export function buildMergeContext(input: MergeInput): Record<string, string> {
  const rnd = seeded(input.simulationId);
  const pick = (n: number) => Math.floor(rnd() * n);
  const locale = toLocale(input.locale);
  const intl = INTL_LOCALE[locale];

  const now = new Date();
  const dueOffset = 3 + pick(6); // 3–8 days out
  const due = new Date(now.getTime() + dueOffset * 86400000);
  const fmtDate = (d: Date) => new Intl.DateTimeFormat(intl, { day: "2-digit", month: "long", year: "numeric" }).format(d);
  const money = (n: number) => new Intl.NumberFormat(intl, { style: "currency", currency: "CHF" }).format(n);

  const alnum = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const ref = Array.from({ length: 6 }, () => alnum[pick(alnum.length)]).join("");
  const amount = money(120 + pick(9880) + rnd()); // CHF 120 – 10'000

  return {
    first_name: (input.firstName ?? "").trim(),
    last_name: (input.lastName ?? "").trim(),
    date: fmtDate(now),
    due_date: fmtDate(due),
    invoice_no: `2026-${1000 + pick(9000)}`,
    order_no: `#${1000000 + pick(9000000)}`,
    ticket_no: `INC${100000 + pick(900000)}`,
    amount,
    ref,
    reference: ref,
  };
}

const TOKEN = /\{\{\s*([a-z_]+)\s*\}\}/gi;

/** Replaces known `{{token}}` placeholders; any unknown placeholder is removed. */
export function applyMerge(text: string, ctx: Record<string, string>): string {
  return text
    .replace(TOKEN, (_m, key: string) => ctx[key.toLowerCase()] ?? "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
