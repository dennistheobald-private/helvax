import { createHash, randomBytes } from "node:crypto";
import { SITE_URL } from "./urls";

// Newsletter sign-ups with double opt-in. Addresses are stored in Supabase only
// through the newsletter_* functions, with the service-role key on the server.

export const newToken = () => randomBytes(24).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function rpc<T>(fn: string, args: Record<string, string>): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Newsletter: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is missing.");
    return null;
  }
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`Newsletter: ${fn} failed`, res.status, await res.text());
    return null;
  }
  return (await res.json()) as T;
}

export async function sendConfirmation(email: string, token: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("Newsletter: RESEND_API_KEY is missing.");
    return false;
  }
  const confirm = `${SITE_URL}/newsletter/confirm?token=${token}`;
  const unsubscribe = `${SITE_URL}/newsletter/unsubscribe?token=${token}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.NEWSLETTER_FROM ?? "Helvax <hello@mail.helvax.ch>",
      to: [email],
      subject: "Confirm your Helvax newsletter subscription",
      text: [
        "Hi,",
        "",
        "Please confirm that you'd like the Helvax newsletter: one short email a month on new attack patterns and how teams stop them.",
        "",
        `Confirm: ${confirm}`,
        "",
        "If you didn't sign up, ignore this email and nothing happens. The link expires in 7 days.",
        "",
        "Helvax, Switzerland",
      ].join("\n"),
      html: `<div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.55;color:#17191D;max-width:520px">
<p>Hi,</p>
<p>Please confirm that you'd like the Helvax newsletter: one short email a month on new attack patterns and how teams stop them.</p>
<p><a href="${confirm}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#F36B32;color:#17191D;text-decoration:none;font-weight:600">Confirm subscription</a></p>
<p style="color:#6B6F78;font-size:14px">If you didn't sign up, ignore this email and nothing happens. The link expires in 7 days.</p>
<p style="color:#6B6F78;font-size:14px">Helvax, Switzerland</p>
</div>`,
      headers: { "List-Unsubscribe": `<${unsubscribe}>` },
    }),
  });
  if (!res.ok) console.error("Newsletter: Resend rejected the confirmation", res.status, await res.text());
  return res.ok;
}

// Best-effort limit per IP and server instance; the database adds a 10-minute cooldown per address.
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, max = 5, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}
