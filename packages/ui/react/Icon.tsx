import type { SVGProps } from "react";
import { cx } from "./cx";
import { icons, type IconName } from "./icons";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: "sm" | "md";
  /** Accessible name. Without it the icon is decorative and hidden from screen readers. */
  label?: string;
}

export function Icon({ name, size = "md", label, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={cx("hx-icon", size === "sm" && "hx-icon--sm", className)}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
      {...rest}
    >
      {icons[name]}
    </svg>
  );
}
