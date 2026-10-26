"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@helvax/ui/react";
import { switchTenant } from "@/app/(dashboard)/actions";
import { SidebarNav } from "./SidebarNav";

const titles: Record<string, string> = {
  "/overview": "Security overview",
  "/employees": "Employees",
  "/simulations": "Simulations",
  "/activity": "Activity",
  "/reports": "Reports",
  "/settings": "Settings",
};

const roleLabel = { owner: "Owner", admin: "Admin", viewer: "Viewer" } as const;

interface ShellProps {
  user: { name: string; email: string; initials: string };
  tenant: { id: string; name: string; role: keyof typeof roleLabel };
  tenants: { id: string; name: string }[];
  children: ReactNode;
}

export function Shell({ user, tenant, tenants, children }: ShellProps) {
  const path = usePathname();
  const title = Object.entries(titles).find(([href]) => path.startsWith(href))?.[1] ?? "Helvax";
  return (
    <AppShell
      sidebar={
        <>
          <SidebarNav />
          <div className="hx-sidebar__footer">
            {tenants.length > 1 ? (
              <form action={switchTenant} className="tenant-switch">
                <label className="hx-visually-hidden" htmlFor="tenant">Company</label>
                <select id="tenant" name="tenant" className="hx-select" defaultValue={tenant.id} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </form>
            ) : (
              <strong style={{ color: "var(--ink)" }}>{tenant.name}</strong>
            )}
            <span>{user.email} · {roleLabel[tenant.role]}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="hx-link hx-link--quiet signout">Sign out</button>
            </form>
          </div>
        </>
      }
      title={title}
      topbarEnd={<span className="hx-avatar" role="img" aria-label={`Signed in as ${user.name}`}>{user.initials}</span>}
    >
      {children}
    </AppShell>
  );
}
