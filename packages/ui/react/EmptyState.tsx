import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./icons";

/** Says what will appear here and the one step that makes it appear. */
export function EmptyState({ title, icon = "overview", children, actions }: { title: ReactNode; icon?: IconName; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="hx-empty">
      <span className="hx-empty__art"><Icon name={icon} /></span>
      <h3 className="hx-empty__title">{title}</h3>
      {children && <p className="hx-empty__body">{children}</p>}
      {actions && <div className="hx-btn-group">{actions}</div>}
    </div>
  );
}
