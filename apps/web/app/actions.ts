"use server";

import { headers } from "next/headers";
import { hashToken, newToken, rateLimited, rpc, sendConfirmation } from "@/lib/newsletter";

export interface DemoState {
  status: "idle" | "sent" | "error";
  message?: string;
  fields?: Partial<Record<"name" | "email" | "company" | "employees", string>>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates a demo request and emails it to the Helvax team through Resend. */
export async function requestDemo(_prev: DemoState, form: FormData): Promise<DemoState> {
  // Honeypot: real people never fill this hidden field.
  if (form.get("website")) return { status: "sent" };

  const value = (k: string) => String(form.get(k) ?? "").trim().slice(0, 500);
  const data = { name: value("name"), email: value("email"), company: value("company"), employees: value("employees"), message: value("message") };

  const fields: DemoState["fields"] = {};
  if (!data.name) fields.name = "Enter your name.";
  if (!EMAIL.test(data.email)) fields.email = "Enter a valid work email, for example name@company.ch.";
  if (!data.company) fields.company = "Enter your company name.";
  if (Object.keys(fields).length) return { status: "error", fields };

  const key = process.env.RESEND_API_KEY;
  const to = process.env.DEMO_REQUEST_TO;
  if (!key || !to) {
    console.error("Demo request not sent: RESEND_API_KEY or DEMO_REQUEST_TO is missing.");
    return { status: "error", message: "We couldn't send your request right now. Please email us instead." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.DEMO_REQUEST_FROM ?? "Helvax <hello@mail.helvax.ch>",
      to: [to],
      reply_to: data.email,
      subject: `Demo request: ${data.company}`,
      text: [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Company: ${data.company}`,
        `Employees: ${data.employees || "not given"}`,
        "",
        data.message || "(no message)",
      ].join("\n"),
    }),
  });

  if (!res.ok) {
    console.error("Resend rejected the demo request", res.status, await res.text());
    return { status: "error", message: "We couldn't send your request right now. Please try again in a minute." };
  }
  return { status: "sent" };
}

export interface NewsletterState {
  status: "idle" | "sent" | "error";
  message?: string;
}

/** Starts a double opt-in: stores a pending sign-up and emails a confirmation link. */
export async function subscribeNewsletter(_prev: NewsletterState, form: FormData): Promise<NewsletterState> {
  if (form.get("website")) return { status: "sent" };
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (!EMAIL.test(email)) return { status: "error", message: "Enter a valid email, for example name@company.ch." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return { status: "error", message: "Too many attempts. Please try again in a few minutes." };

  const token = newToken();
  const next = await rpc<"send" | "wait" | "confirmed">("newsletter_request", { p_email: email, p_token_hash: hashToken(token) });
  if (!next) return { status: "error", message: "We couldn't sign you up right now. Please try again later." };
  // Same answer whether or not the address is already subscribed, so nobody can probe the list.
  if (next === "send" && !(await sendConfirmation(email, token))) {
    return { status: "error", message: "We couldn't send the confirmation email. Please try again later." };
  }
  return { status: "sent" };
}

export interface TokenState {
  status: "idle" | "done" | "invalid";
}

/** Confirms or cancels a subscription. A button press, so mail scanners opening the link change nothing. */
export async function updateSubscription(_prev: TokenState, form: FormData): Promise<TokenState> {
  const token = String(form.get("token") ?? "");
  const fn = form.get("mode") === "unsubscribe" ? "newsletter_unsubscribe" : "newsletter_confirm";
  if (!/^[\w-]{20,64}$/.test(token)) return { status: "invalid" };
  const ok = await rpc<boolean>(fn, { p_token_hash: hashToken(token) });
  return { status: ok ? "done" : "invalid" };
}
