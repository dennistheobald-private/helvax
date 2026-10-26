import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { requireSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const s = await requireSession();
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
