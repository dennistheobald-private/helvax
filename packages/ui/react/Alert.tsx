import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

export interface AlertProps {
  tone?: "info" | "success" | "warning" | "danger";
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}

export function Alert({ tone = "info", title, children, actions }: AlertProps) {
  const icon = tone === "success" ? "checkc" : tone === "info" ? "info" : "warn";
  return (
    <div className={cx("hx-alert", tone !== "info" && `hx-alert--${tone}`)} role={tone === "danger" ? "alert" : "status"}>
      <Icon name={icon} />
      <div>
        <div className="hx-alert__title">{title}</div>
        {children && <div className="hx-alert__body">{children}</div>}
        {actions && <div className="hx-alert__actions">{actions}</div>}
      </div>
    </div>
  );
}
