import type { SVGProps } from "react";
import { cx } from "./cx";

/** The Split mark: a disc pulled apart. Inherits `currentColor` unless `brand` is set. */
export function LogoMark({ brand = true, className, ...rest }: SVGProps<SVGSVGElement> & { brand?: boolean }) {
  const fill = brand ? "var(--brand-500)" : "currentColor";
  return (
    <svg viewBox="0 0 100 100" className={cx("hx-signal-mark", className)} aria-hidden="true" focusable="false" {...rest}>
      <path fill={fill} d="M44 12A44 44 0 0 0 44 100Z" />
      <path fill={fill} d="M56 0A44 44 0 0 1 56 88Z" />
    </svg>
  );
}

/** The rounded orange app icon with the mark inside, as used in the marketing navbar and hero. */
export function AppIcon({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <span className={cx("hx-appicon", size === "sm" && "hx-appicon--sm", className)}>
      <svg viewBox="0 0 100 100" className="hx-icon" aria-hidden="true" focusable="false">
        <path fill="currentColor" stroke="none" d="M44 12A44 44 0 0 0 44 100Z" />
        <path fill="currentColor" stroke="none" d="M56 0A44 44 0 0 1 56 88Z" />
      </svg>
    </span>
  );
}
