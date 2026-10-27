import type { ReactNode } from "react";

/** Says what will appear here and the one step that makes it appear. */
export function EmptyState({ title, children, actions }: { title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="hx-empty">
      {/* The Split mark with its halves apart: the gap Helvax helps close. */}
      <svg className="hx-empty__art" viewBox="-20 -14 140 128" aria-hidden="true" focusable="false">
        <circle cx="50" cy="50" r="62" fill="currentColor" opacity=".08" />
        <path fill="currentColor" d="M36 12A44 44 0 0 0 36 100Z" />
        <path fill="currentColor" d="M64 0A44 44 0 0 1 64 88Z" opacity=".55" />
      </svg>
      <h3 className="hx-empty__title">{title}</h3>
      {children && <p className="hx-empty__body">{children}</p>}
      {actions && <div className="hx-btn-group">{actions}</div>}
    </div>
  );
}
