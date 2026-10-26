import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Signed tokens for simulation links, reply addresses and landing sessions:
// 32 hex characters of the id, then 20 of an HMAC over purpose and id. Lowercase hex
// survives email addresses, which may not keep upper and lower case apart.
type Purpose = "link" | "reply" | "session";

const ID = /^[0-9a-f]{32}$/;

function secret(): string | null {
  const s = process.env.SIMULATION_TOKEN_SECRET;
  return s && s.length >= 32 ? s : null;
}

const mac = (key: string, purpose: Purpose, hex: string) => createHmac("sha256", key).update(`${purpose}:${hex}`).digest("hex").slice(0, 20);
const toHex = (uuid: string) => uuid.replaceAll("-", "").toLowerCase();
const toUuid = (hex: string) => `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

export function signToken(purpose: Purpose, id: string): string {
  const key = secret();
  if (!key) throw new Error("SIMULATION_TOKEN_SECRET is missing or shorter than 32 characters.");
  const hex = toHex(id);
  return hex + mac(key, purpose, hex);
}

/** The id inside a valid token, or null. Constant-time comparison. */
export function verifyToken(purpose: Purpose, token: unknown): string | null {
  const key = secret();
  if (!key || typeof token !== "string" || token.length !== 52) return null;
  const hex = token.slice(0, 32).toLowerCase();
  if (!ID.test(hex)) return null;
  const given = Buffer.from(token.slice(32).toLowerCase());
  const expected = Buffer.from(mac(key, purpose, hex));
  return given.length === expected.length && timingSafeEqual(given, expected) ? toUuid(hex) : null;
}

/** A keyed hash of a network address, so sessions can be compared without storing it. */
export function hashAddress(ip: string | null): string | null {
  const key = secret();
  if (!key || !ip) return null;
  return createHash("sha256").update(`${key}:ip:${ip}`).digest("hex").slice(0, 32);
}
