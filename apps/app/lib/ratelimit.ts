import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "./supabase/admin";

/**
 * Counts one attempt for `key` and says whether it is still within `max` per `windowSeconds`.
 * Keys are hashed before they reach the database, so no raw address or IP is stored. If the
 * limiter itself fails, the request is allowed and the failure is logged.
 */
export async function allow(scope: string, key: string, max: number, windowSeconds: number): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return true;
  const bucket = `${scope}:${createHash("sha256").update(key).digest("hex")}`;
  const { data, error } = await admin.rpc("rate_limit_hit", { bucket, max_hits: max, window_seconds: windowSeconds });
  if (error) {
    console.error("rate_limit_hit failed", error.message);
    return true;
  }
  return data !== false;
}

/** The caller's IP as Vercel reports it. */
export async function clientIp(source?: Headers): Promise<string> {
  const h = source ?? (await headers());
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
