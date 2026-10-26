import "server-only";
import { escapeHtml, sendEmail } from "../email";
import { createAdminClient } from "../supabase/admin";
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

  let sent = 0;
  let failed = 0;
  for (const d of due ?? []) {
    const link = `${cfg.origin}/p/${signToken("link", d.simulation_id)}`;
    const replyTo = `r${signToken("reply", d.simulation_id)}@${cfg.replyDomain}`;
    const greeting = `Hello ${d.first_name},`;
    const id = await sendEmail({
      to: d.email,
      from: `${d.sender_name} <${d.scenario_slug}@${cfg.fromDomain}>`,
      replyTo,
      subject: d.subject,
      text: `${greeting}\n\n${d.preview}\n\n${link}\n\n${d.sender_name}`,
      html: `<p>${escapeHtml(greeting)}</p><p>${escapeHtml(d.preview)}</p><p><a href="${link}">View details</a></p><p>${escapeHtml(d.sender_name)}</p>`,
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
