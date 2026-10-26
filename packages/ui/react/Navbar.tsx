"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export interface NavbarProps {
  brand: ReactNode;
  /** `<li>` items, usually links. */
  links: ReactNode;
  actions?: ReactNode;
  label?: string;
}

/** Floating marketing navbar. Below 860px the links collapse behind a menu button. */
export function Navbar({ brand, links, actions, label = "Main" }: NavbarProps) {
  const [open, setOpen] = useState(false);
  return (
    <nav className="hx-navbar" aria-label={label} data-open={open || undefined}>
      {brand}
      <ul className="hx-navbar__links" onClick={() => setOpen(false)}>{links}</ul>
      <div className="hx-navbar__end">
        {actions}
        <button
          type="button"
          className="hx-btn hx-btn--ghost hx-btn--icon hx-navbar__menu"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? "x" : "menu"} />
        </button>
      </div>
    </nav>
  );
}
