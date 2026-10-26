import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** A small info icon that shows a tooltip on hover or keyboard focus. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="hx-tooltip hx-infotip">
      <button type="button" className="hx-infotip__btn" aria-label={label}><Icon name="info" size="sm" /></button>
      <span className="hx-tooltip__bubble" role="tooltip">{children}</span>
    </span>
  );
}
