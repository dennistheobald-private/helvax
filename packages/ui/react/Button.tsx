import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "soft" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface StyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  iconOnly?: boolean;
}

export function buttonClass({ variant = "primary", size = "md", block, iconOnly }: StyleProps, extra?: string) {
  return cx(
    "hx-btn",
    variant !== "primary" && `hx-btn--${variant}`,
    size !== "md" && `hx-btn--${size}`,
    block && "hx-btn--block",
    iconOnly && "hx-btn--icon",
    extra,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  loading?: boolean;
}

export function Button({ variant, size, block, iconOnly, loading, className, type = "button", disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block, iconOnly }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement>, StyleProps {
  children: ReactNode;
}

/** A link styled as a button. For Next.js routing, pass `buttonClass(...)` to `<Link className>` instead. */
export function ButtonLink({ variant, size, block, iconOnly, className, ...rest }: ButtonLinkProps) {
  return <a className={buttonClass({ variant, size, block, iconOnly }, className)} {...rest} />;
}
