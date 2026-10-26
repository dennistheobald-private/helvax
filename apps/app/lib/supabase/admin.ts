import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { supabaseUrl } from "./env";

/**
 * Service-role client that bypasses row level security. Only for server-side steps the
 * user must not be able to fake, such as marking a domain verified after a DNS check.
 * Always scope its queries to a tenant the caller was checked against.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createSupabaseClient<Database>(supabaseUrl(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}
