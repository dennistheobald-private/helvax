"use server";

import { resolveTxt } from "node:dns/promises";
import { revalidatePath } from "next/cache";
import type { EmployeeStatus } from "@/lib/database.types";
import { toLocale, type Locale } from "@/lib/engine/practice-copy";
import { requireSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  ok?: string;
  error?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
const STATUSES: EmployeeStatus[] = ["active", "paused", "left"];
const MAX_IMPORT = 5000;

const domainOf = (email: string) => email.split("@")[1] ?? "";
const clean = (v: unknown, max = 80) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

async function adminContext() {
  const s = await requireSession();
  if (!s.isAdmin) return null;
  return { s, supabase: await createClient() };
}

async function companyDomains(tenantId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("company_domains").select("domain").eq("tenant_id", tenantId);
  return new Set((data ?? []).map((d) => d.domain.toLowerCase()));
}

// Employees ------------------------------------------------------------------------

const LANGUAGES: Record<string, Locale> = {
  en: "en", english: "en", englisch: "en", engels: "en",
  de: "de", german: "de", deutsch: "de", duits: "de",
  nl: "nl", dutch: "nl", nederlands: "nl", niederlaendisch: "nl", niederländisch: "nl",
};
/** "de", "Deutsch", "German" → "de". Empty or unknown → "". */
const toLanguage = (v: unknown): Locale | "" => LANGUAGES[String(v ?? "").trim().toLowerCase()] ?? "";

export async function addEmployee(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Only admins can add employees." };
  const first_name = clean(form.get("first_name"));
  const last_name = clean(form.get("last_name"));
  const email = clean(form.get("email"), 254).toLowerCase();
  const group_id = String(form.get("group_id") ?? "") || null;
  const locale = toLanguage(form.get("locale")) || toLocale(ctx.s.tenant.locale);
  if (!first_name || !last_name) return { error: "Enter the first and last name." };
  if (!EMAIL.test(email)) return { error: "Enter a valid email address." };
  if (!(await companyDomains(ctx.s.tenant.id)).has(domainOf(email))) {
    return { error: `${domainOf(email)} isn't one of your company domains. Add the domain first.` };
  }
  const { error } = await ctx.supabase.from("employees").insert({ tenant_id: ctx.s.tenant.id, first_name, last_name, email, group_id, locale });
  if (error) return { error: error.code === "23505" ? `${email} is already in the list.` : "Couldn't add the employee. Try again." };
  revalidatePath("/employees");
  return { ok: `Added ${first_name} ${last_name}.` };
}

export async function updateEmployee(form: FormData) {
  const ctx = await adminContext();
  if (!ctx) return;
  const status = String(form.get("status")) as EmployeeStatus;
  const group_id = String(form.get("group_id") ?? "") || null;
  const locale = toLanguage(form.get("locale"));
  if (!STATUSES.includes(status)) return;
  await ctx.supabase.from("employees").update({ status, group_id, ...(locale && { locale }) }).eq("tenant_id", ctx.s.tenant.id).eq("id", String(form.get("id")));
  revalidatePath("/employees");
}

export async function removeEmployee(form: FormData) {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from("employees").delete().eq("tenant_id", ctx.s.tenant.id).eq("id", String(form.get("id")));
  revalidatePath("/employees");
}

// CSV import -------------------------------------------------------------------------

export interface ImportRow {
  first_name: string;
  last_name: string;
  email: string;
  group: string;
  /** Normalised language code, or "" to keep the current one (new people get the company's). */
  language: Locale | "";
}

export type RowVerdict = "new" | "update" | "unchanged" | "invalid_email" | "missing_name" | "wrong_domain" | "duplicate";

export interface ImportPreview {
  error?: string;
  rows?: { line: number; row: ImportRow; verdict: RowVerdict }[];
  done?: { added: number; updated: number };
}

function parseRows(json: string): ImportRow[] | null {
  try {
    const rows = JSON.parse(json) as unknown;
    if (!Array.isArray(rows)) return null;
    return rows.slice(0, MAX_IMPORT + 1).map((r: Record<string, unknown>) => ({
      first_name: clean(r.first_name),
      last_name: clean(r.last_name),
      email: clean(r.email, 254).toLowerCase(),
      group: clean(r.group),
      language: toLanguage(r.language),
    }));
  } catch {
    return null;
  }
}

async function classify(tenantId: string, rows: ImportRow[]) {
  const supabase = await createClient();
  const domains = await companyDomains(tenantId);
  const [{ data: existing }, { data: groups }] = await Promise.all([
    supabase.from("employees").select("id, email, first_name, last_name, group_id, locale").eq("tenant_id", tenantId).limit(20000),
    supabase.from("employee_groups").select("id, name").eq("tenant_id", tenantId),
  ]);
  const byEmail = new Map((existing ?? []).map((e) => [e.email.toLowerCase(), e]));
  const groupId = new Map((groups ?? []).map((g) => [g.name.toLowerCase(), g.id]));
  const seen = new Set<string>();

  const result = rows.map((row, i) => {
    let verdict: RowVerdict;
    if (!EMAIL.test(row.email)) verdict = "invalid_email";
    else if (!row.first_name || !row.last_name) verdict = "missing_name";
    else if (!domains.has(domainOf(row.email))) verdict = "wrong_domain";
    else if (seen.has(row.email)) verdict = "duplicate";
    else {
      const e = byEmail.get(row.email);
      const gid = row.group ? groupId.get(row.group.toLowerCase()) ?? "new" : e?.group_id ?? null;
      const sameLanguage = !row.language || e?.locale === row.language;
      verdict = !e ? "new" : e.first_name === row.first_name && e.last_name === row.last_name && e.group_id === gid && sameLanguage ? "unchanged" : "update";
    }
    seen.add(row.email);
    return { line: i + 2, row, verdict };
  });
  return { result, byEmail, groupId };
}

/** Dry run: says what an import would do, without changing anything. */
export async function previewImport(_prev: ImportPreview, form: FormData): Promise<ImportPreview> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Only admins can import employees." };
  const rows = parseRows(String(form.get("rows") ?? ""));
  if (!rows || rows.length === 0) return { error: "The file has no rows we could read." };
  if (rows.length > MAX_IMPORT) return { error: `Import up to ${MAX_IMPORT.toLocaleString("en-GB")} people at a time.` };
  if (form.get("commit") !== "1") return { rows: (await classify(ctx.s.tenant.id, rows)).result };

  const { result, byEmail, groupId } = await classify(ctx.s.tenant.id, rows);
  const usable = result.filter((r) => r.verdict === "new" || r.verdict === "update");

  // Create groups named in the file that don't exist yet.
  const missing = [...new Set(usable.map((r) => r.row.group).filter((g) => g && !groupId.has(g.toLowerCase())))];
  if (missing.length) {
    const { data: created, error } = await ctx.supabase.from("employee_groups").insert(missing.map((name) => ({ tenant_id: ctx.s.tenant.id, name }))).select("id, name");
    if (error) return { error: "Couldn't create the groups from the file. Try again." };
    for (const g of created ?? []) groupId.set(g.name.toLowerCase(), g.id);
  }
  const gid = (name: string) => (name ? groupId.get(name.toLowerCase()) ?? null : undefined);

  const inserts = usable.filter((r) => r.verdict === "new").map(({ row }) => ({
    tenant_id: ctx.s.tenant.id, first_name: row.first_name, last_name: row.last_name, email: row.email, group_id: gid(row.group) ?? null,
    locale: row.language || toLocale(ctx.s.tenant.locale),
  }));
  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await ctx.supabase.from("employees").insert(inserts.slice(i, i + 500));
    if (error) return { error: `Stopped after ${i} new employees: ${error.code === "23514" ? error.message : "the import failed"}. Nothing else was changed.` };
  }

  const updates = usable.filter((r) => r.verdict === "update");
  for (let i = 0; i < updates.length; i += 20) {
    await Promise.all(updates.slice(i, i + 20).map(({ row }) => {
      const g = gid(row.group);
      return ctx.supabase.from("employees")
        .update({ first_name: row.first_name, last_name: row.last_name, ...(g !== undefined ? { group_id: g } : {}), ...(row.language && { locale: row.language }) })
        .eq("tenant_id", ctx.s.tenant.id).eq("id", byEmail.get(row.email)!.id);
    }));
  }

  revalidatePath("/employees");
  return { done: { added: inserts.length, updated: updates.length } };
}

// Groups ------------------------------------------------------------------------------

export async function addGroup(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Only admins can add groups." };
  const name = clean(form.get("name"));
  if (!name) return { error: "Enter a group name." };
  const { error } = await ctx.supabase.from("employee_groups").insert({ tenant_id: ctx.s.tenant.id, name });
  if (error) return { error: error.code === "23505" ? `${name} already exists.` : "Couldn't add the group." };
  revalidatePath("/employees");
  return { ok: `Added ${name}.` };
}

export async function removeGroup(form: FormData) {
  const ctx = await adminContext();
  if (!ctx) return;
  await ctx.supabase.from("employee_groups").delete().eq("tenant_id", ctx.s.tenant.id).eq("id", String(form.get("id")));
  revalidatePath("/employees");
}

// Company domains -----------------------------------------------------------------------

export async function addDomain(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Only admins can add domains." };
  const domain = clean(form.get("domain"), 253).toLowerCase().replace(/^@/, "");
  if (!DOMAIN.test(domain)) return { error: "Enter a domain such as company.ch." };
  const { error } = await ctx.supabase.from("company_domains").insert({ tenant_id: ctx.s.tenant.id, domain });
  if (error) return { error: error.code === "23505" ? `${domain} is already added.` : error.code === "23514" ? error.message : "Couldn't add the domain." };
  revalidatePath("/employees");
  return { ok: `Added ${domain}. Add the DNS record below to verify it.` };
}

export async function removeDomain(form: FormData): Promise<void> {
  const ctx = await adminContext();
  if (!ctx) return;
  const id = String(form.get("id"));
  const { data: d } = await ctx.supabase.from("company_domains").select("domain").eq("tenant_id", ctx.s.tenant.id).eq("id", id).single();
  if (!d) return;
  // Keep a domain while employees still use it.
  const { count } = await ctx.supabase.from("employees").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.s.tenant.id).ilike("email", `%@${d.domain}`);
  if (count) return;
  await ctx.supabase.from("company_domains").delete().eq("tenant_id", ctx.s.tenant.id).eq("id", id);
  revalidatePath("/employees");
}

/** Checks the TXT record `_helvax.<domain>` for `helvax-verify=<token>`. */
export async function verifyDomain(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Only admins can verify domains." };
  const { data: d } = await ctx.supabase.from("company_domains").select("id, domain, verification_token, verified_at")
    .eq("tenant_id", ctx.s.tenant.id).eq("id", String(form.get("id"))).single();
  if (!d) return { error: "Domain not found." };
  if (d.verified_at) return { ok: `${d.domain} is verified.` };

  let records: string[][] = [];
  try {
    records = await resolveTxt(`_helvax.${d.domain}`);
  } catch {
    return { error: `No TXT record found at _helvax.${d.domain} yet. DNS changes can take up to an hour.` };
  }
  if (!records.some((r) => r.join("") === `helvax-verify=${d.verification_token}`)) {
    return { error: `The TXT record at _helvax.${d.domain} doesn't match yet. Check the value and try again.` };
  }

  const admin = createAdminClient();
  if (!admin) return { error: "Domain verification isn't set up on the server yet." };
  const { error } = await admin.from("company_domains").update({ verified_at: new Date().toISOString() }).eq("id", d.id).eq("tenant_id", ctx.s.tenant.id);
  if (error) return { error: "Couldn't save the verification. Try again." };
  revalidatePath("/employees");
  return { ok: `${d.domain} is verified.` };
}
