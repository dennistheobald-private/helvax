"use server";

import { redirect } from "next/navigation";
import { parseDomains } from "@/lib/domains";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function addCompanyDomains(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const s = await requireSession();
  if (!s.isAdmin) return { error: "Only admins can add domains." };
  const parsed = parseDomains(form.getAll("domain"));
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("company_domains")
    .upsert(parsed.domains.map((domain) => ({ tenant_id: s.tenant.id, domain })), { onConflict: "tenant_id,domain", ignoreDuplicates: true });
  if (error) {
    console.error("Adding onboarding domains failed", error.code, error.message);
    return { error: error.code === "23514" ? error.message : "Couldn't add the domains. Try again." };
  }
  redirect("/overview");
}
