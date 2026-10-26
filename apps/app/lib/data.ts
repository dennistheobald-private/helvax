import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";

/** Whether the company currently has sample data loaded. */
export const hasSampleData = cache(async (tenantId: string) => {
  const supabase = await createClient();
  const { count } = await supabase.from("employees").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_demo", true);
  return (count ?? 0) > 0;
});
