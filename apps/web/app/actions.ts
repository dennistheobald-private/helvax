"use server";

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
