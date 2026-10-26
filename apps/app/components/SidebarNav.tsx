"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, LogoMark, type IconName } from "@helvax/ui/react";

const main: { href: string; label: string; icon: IconName }[] = [
  { href: "/overview", label: "Overview", icon: "overview" },
  { href: "/employees", label: "Employees", icon: "users" },
  { href: "/simulations", label: "Simulations", icon: "target" },
  { href: "/activity", label: "Activity", icon: "activity" },
  { href: "/reports", label: "Reports", icon: "report" },
];

const account: typeof main = [{ href: "/settings", label: "Settings", icon: "gear" }];

export function SidebarNav() {
  const path = usePathname();
  const link = ({ href, label, icon }: (typeof main)[number]) => (
    <Link key={href} className="hx-sidebar__link" href={href} aria-current={path.startsWith(href) ? "page" : undefined}>
      <Icon name={icon} />
      {label}
    </Link>
  );
  return (
    <>
      <Link className="hx-sidebar__brand" href="/overview"><LogoMark width={24} height={24} />helvax</Link>
      <div className="hx-sidebar__section">{main.map(link)}</div>
      <div className="hx-sidebar__section">
        <span className="hx-eyebrow hx-sidebar__heading">Account</span>
        {account.map(link)}
      </div>
    </>
  );
}
