import "server-only";

interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Resend drops a repeat send with the same key for 24 hours. One key per email event. */
  idempotencyKey?: string;
}

const ATTEMPTS = 3;

/** Sends a transactional email through Resend. Returns false when it couldn't be sent. */
export async function sendEmail(mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("RESEND_API_KEY is not set; email not sent:", mail.subject);
    return false;
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  if (mail.idempotencyKey) headers["Idempotency-Key"] = mail.idempotencyKey;
  const body = JSON.stringify({ from: process.env.EMAIL_FROM ?? "Helvax <hello@mail.helvax.ch>", to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html });

  // Retry network errors, 429 and 5xx with backoff; other 4xx won't succeed on a retry.
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch("https://api.resend.com/emails", { method: "POST", headers, body });
    } catch (err) {
      console.error("Resend request failed", err);
      if (attempt < ATTEMPTS) await wait(backoff(attempt));
      continue;
    }
    if (res.ok) {
      const { id } = (await res.json().catch(() => ({}))) as { id?: string };
      console.info("Resend accepted email", id);
      return true;
    }
    const retryable = res.status === 429 || res.status >= 500;
    console.error("Resend rejected an email", res.status, await res.text());
    if (!retryable || attempt === ATTEMPTS) return false;
    const retryAfter = Number(res.headers.get("retry-after"));
    await wait(retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : backoff(attempt));
  }
  return false;
}

const backoff = (attempt: number) => 500 * 2 ** (attempt - 1);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
