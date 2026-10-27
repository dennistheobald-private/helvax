import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { suggestedDomain } from "@/lib/domains";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { DomainsForm } from "./DomainsForm";

export const metadata: Metadata = { title: "Add your company domains" };

export default async function DomainsPage() {
  const s = await requireSession();
  if (!s.isAdmin) redirect("/overview");
  const supabase = await createClient();
  const { count } = await supabase.from("company_domains").select("id", { count: "exact", head: true }).eq("tenant_id", s.tenant.id);
  if (count) redirect("/overview");
  return (
    <AuthCard
      title="Add your company domains"
      lead={`Which email domains does ${s.tenant.name} use? Add every domain your employees have addresses on.`}
    >
      <DomainsForm suggestedDomain={suggestedDomain(s.email)} />
    </AuthCard>
  );
}
