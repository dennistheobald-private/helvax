import "server-only";
import { escapeHtml, sendEmail } from "../email";
import { createAdminClient } from "../supabase/admin";
import { applyMerge, buildMergeContext } from "./merge";
import { BRANDED_SENDER, UI, toLocale } from "./practice-copy";
import type { ScenarioCategory } from "../database.types";
import { signToken } from "./token";

/**
 * Sending configuration. Everything must be set, or nothing is sent. The database
 * checks the four switches and every recipient again when it hands out work.
 */
function config() {
  const host = process.env.SIMULATION_HOST;
  const fromDomain = process.env.SIMULATION_FROM_DOMAIN;
  const replyDomain = process.env.SIMULATION_REPLY_DOMAIN;
  if (!host || !fromDomain || !replyDomain || !process.env.SIMULATION_TOKEN_SECRET || !process.env.RESEND_API_KEY) return null;
  return { origin: `https://${host}`, fromDomain, replyDomain };
}

export async function dispatchDue(limit = 50): Promise<{ sent: number; failed: number; skipped?: string }> {
  const cfg = config();
  const admin = createAdminClient();
  if (!cfg || !admin) return { sent: 0, failed: 0, skipped: "not configured" };

  // Returns nothing unless the platform, the company and the recipient all allow it.
  const { data: due, error } = await admin.rpc("engine_claim_due", { max_count: limit });
  if (error) throw new Error(`engine_claim_due failed: ${error.message}`);
  const rows = due ?? [];

  // Internal-style scenarios can carry the company's own name and logo. Look up the logo
  // per company and the category per scenario for this batch, so branded mail looks like
  // genuine internal mail. Only companies that set a logo (which needs a verified domain)
  // are branded.
  const INTERNAL = new Set(["credential_form", "document_link", "qr_phishing"]);
  const tenantIds = [...new Set(rows.map((d) => d.tenant_id))];
  const slugs = [...new Set(rows.map((d) => d.scenario_slug))];
  const [{ data: tenants }, { data: scenarios }] = await Promise.all([
    tenantIds.length ? admin.from("tenants").select("id, name, logo_url").in("id", tenantIds) : Promise.resolve({ data: [] }),
    slugs.length ? admin.from("scenarios").select("slug, category").in("slug", slugs) : Promise.resolve({ data: [] }),
  ]);
  const brandOf = new Map((tenants ?? []).map((t) => [t.id, { name: t.name, logo: t.logo_url }]));
  const categoryOf = new Map((scenarios ?? []).map((s) => [s.slug, s.category]));

  let sent = 0;
  let failed = 0;
  for (const d of rows) {
    const link = `${cfg.origin}/p/${signToken("link", d.simulation_id)}`;
    const replyTo = `r${signToken("reply", d.simulation_id)}@${cfg.replyDomain}`;
    const ui = UI[toLocale(d.locale)];
    // Fill per-send merge tokens (invoice numbers, dates, the recipient's name) so two
    // copies of the same template never read the same. Derived from the simulation id,
    // so an idempotent resend produces an identical message.
    const ctx = buildMergeContext({ simulationId: d.simulation_id, firstName: d.first_name, lastName: d.last_name, locale: d.locale });
    const subject = applyMerge(d.subject, ctx);
    const preview = applyMerge(d.preview, ctx);
    const senderName = applyMerge(d.sender_name, ctx);
    const greeting = ui.greeting(d.first_name);
    // Vary the from-address per send from the sender-identity pool; fall back to the
    // scenario slug and the configured sending domain when none is set.
    const fromDomain = d.sender_domain || cfg.fromDomain;
    const fromLocal = d.sender_local || d.scenario_slug;
    // Brand internal-style scenarios with the company's name and logo when it has one.
    const brand = brandOf.get(d.tenant_id);
    const category = categoryOf.get(d.scenario_slug) ?? "";
    const branded = Boolean(brand?.logo) && INTERNAL.has(category);
    // Branded mail goes under the company's own internal-team label, not the variant's
    // sender name, so it never reads as e.g. "Acme AG DocShare".
    const brandedSender = BRANDED_SENDER[toLocale(d.locale)][category as ScenarioCategory];
    const displayName = branded ? `${brand!.name} ${brandedSender ?? senderName}` : senderName;
    const logoHtml = branded ? `<p><img src="${escapeHtml(brand!.logo!)}" alt="${escapeHtml(brand!.name)}" style="height:28px;max-width:100%"></p>` : "";
    const id = await sendEmail({
      to: d.email,
      from: `${displayName} <${fromLocal}@${fromDomain}>`,
      replyTo,
      subject,
      text: `${greeting}\n\n${preview}\n\n${link}\n\n${displayName}`,
      html: `${logoHtml}<p>${escapeHtml(greeting)}</p><p>${escapeHtml(preview)}</p><p><a href="${link}">${ui.viewDetails}</a></p><p>${escapeHtml(displayName)}</p>`,
      // Lets the company's mail gateway recognise and allow simulations.
      headers: { "X-Helvax-Simulation": "1" },
      idempotencyKey: `simulation/${d.simulation_id}`,
    });
    await admin.rpc("engine_mark_sent", { sim: d.simulation_id, accepted: Boolean(id), provider_signals: id ? { provider_id: id } : {} });
    if (id) sent++;
    else failed++;
  }
  return { sent, failed };
}
