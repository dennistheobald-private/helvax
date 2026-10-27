/** Free mail providers. Kept in sync with private.is_public_email_domain in the database. */
export const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com", "yahoo.com", "icloud.com",
  "me.com", "mac.com", "aol.com", "gmx.ch", "gmx.de", "gmx.net", "web.de", "bluewin.ch", "proton.me", "protonmail.com",
  "t-online.de", "hey.com",
]);

export const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
export const MAX_DOMAINS = 20;

export function normalizeDomain(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/^@+/, "").replace(/\.+$/, "").slice(0, 253);
}

/** The signed-in person's own domain, unless it's a public provider. */
export function suggestedDomain(email: string): string {
  const d = normalizeDomain(email.split("@")[1]);
  return DOMAIN.test(d) && !PUBLIC_EMAIL_DOMAINS.has(d) ? d : "";
}

/** Cleans the submitted domains, or says what's wrong with them. */
export function parseDomains(values: unknown[]): { domains: string[] } | { error: string } {
  const domains = [...new Set(values.map(normalizeDomain).filter(Boolean))];
  if (domains.length === 0) return { error: "Add at least one company domain." };
  if (domains.length > MAX_DOMAINS) return { error: `Add at most ${MAX_DOMAINS} domains.` };
  const invalid = domains.find((d) => !DOMAIN.test(d));
  if (invalid) return { error: `${invalid} isn't a valid domain. Enter it like company.ch.` };
  const free = domains.find((d) => PUBLIC_EMAIL_DOMAINS.has(d));
  if (free) return { error: `${free} is a public email provider. Enter the domain your company's email addresses use.` };
  return { domains };
}
