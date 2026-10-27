import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const s = await requireSession();
  // A company needs at least one domain before anything else: employees must be on one.
  if (s.isAdmin) {
    const supabase = await createClient();
    const { count } = await supabase.from("company_domains").select("id", { count: "exact", head: true }).eq("tenant_id", s.tenant.id);
    if (count === 0) redirect("/onboarding/domains");
  }
  const name = s.profile.full_name || s.email;
  const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  return (
    <Shell
      user={{ name, email: s.email, initials }}
      tenant={{ id: s.tenant.id, name: s.tenant.name, role: s.tenant.role }}
      tenants={s.tenants.map((t) => ({ id: t.id, name: t.name }))}
      isAdmin={s.isAdmin}
      isSuperadmin={s.profile.is_superadmin}
    >
      {children}
    </Shell>
  );
}
