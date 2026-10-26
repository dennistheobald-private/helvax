import type { ReactNode } from "react";

/** Says what will appear here and the one step that makes it appear. */
export function EmptyState({ title, children, actions }: { title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="hx-empty">
      <svg className="hx-empty__art" viewBox="0 0 88 88" aria-hidden="true" focusable="false">
        <circle cx="44" cy="44" r="8" fill="currentColor" />
        <circle cx="44" cy="44" r="20" fill="none" stroke="currentColor" strokeWidth="2" opacity=".6" />
        <circle cx="44" cy="44" r="32" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".35" />
        <circle cx="44" cy="44" r="43" fill="none" stroke="currentColor" strokeWidth="1" opacity=".18" />
      </svg>
      <h3 className="hx-empty__title">{title}</h3>
      {children && <p className="hx-empty__body">{children}</p>}
      {actions && <div className="hx-btn-group">{actions}</div>}
    </div>
  );
}
