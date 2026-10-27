/**
 * Phone numbers are stored in international E.164 format (+41791234567). People may type
 * spaces, dashes, brackets or a leading 00; a number without a country code is rejected,
 * because we can't tell which country it belongs to.
 */
export const PHONE_HINT = "International format, such as +41 79 123 45 67.";

/** "" for empty input, the E.164 number when valid, or null when it isn't a valid number. */
export function normalizePhone(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const compact = raw.replace(/[\s\-./()]/g, "").replace(/^00/, "+");
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : null;
}

/** +41791234567 → +41 79 123 45 67 for display (groups of digits, best effort). */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const m = phone.match(/^\+(41|31|49|43|33|39|44)(\d{2})(\d{3})(\d{2})(\d{2,})$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : phone;
}
