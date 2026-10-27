"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon";

export interface AppShellProps {
  /** The `.hx-sidebar` contents: brand, sections and footer. */
  sidebar: ReactNode;
  title: ReactNode;
  /** The logo lockup the topbar shows on small screens, where the sidebar is hidden. */
  brand?: ReactNode;
  /** Right side of the topbar: search, notifications, avatar. */
  topbarEnd?: ReactNode;
  children: ReactNode;
}

/** Authenticated app frame: sidebar, sticky topbar and content. Below 760px the sidebar becomes a drawer. */
export function AppShell({ sidebar, title, brand, topbarEnd, children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      setOpen(false);
      toggle.current?.focus();
    }
  }

  return (
    <div className="hx-shell" data-nav-open={open || undefined} onKeyDown={onKeyDown}>
      <nav className="hx-sidebar" aria-label="Main" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
        {sidebar}
      </nav>
      <div className="hx-shell__main">
        <header className="hx-topbar">
          {brand && <span className="hx-topbar__brand">{brand}</span>}
          <h1 className="hx-topbar__title">{title}</h1>
          {topbarEnd}
          <button
            ref={toggle}
            type="button"
            className="hx-btn hx-btn--ghost hx-btn--icon hx-topbar__menu"
            aria-expanded={open}
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen(!open)}
          >
            <Icon name="menu" />
          </button>
        </header>
        <main className="hx-shell__content">
          {brand && <h1 className="hx-shell__heading">{title}</h1>}
          {children}
        </main>
      </div>
    </div>
  );
}
