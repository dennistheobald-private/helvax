"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell, Button, Icon } from "@helvax/ui/react";
import { SidebarNav } from "./SidebarNav";

const titles: Record<string, string> = {
  "/overview": "Security overview",
  "/employees": "Employees",
  "/simulations": "Simulations",
  "/activity": "Activity",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const title = Object.entries(titles).find(([href]) => path.startsWith(href))?.[1] ?? "Helvax";
  return (
    <AppShell
      sidebar={<SidebarNav />}
      title={title}
      topbarEnd={
        <>
          <Button variant="ghost" iconOnly aria-label="Notifications"><Icon name="bell" /></Button>
          <span className="hx-avatar" role="img" aria-label="Signed in as demo admin">DA</span>
        </>
      }
    >
      {children}
    </AppShell>
  );
}
