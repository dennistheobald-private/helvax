import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("hx-card", className)} {...rest} />;
}

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  trend?: "better" | "worse" | "flat";
}

export function StatCard({ label, value, delta, trend = "flat" }: StatCardProps) {
  return (
    <div className="hx-card hx-stat">
      <span className="hx-stat__label">{label}</span>
      <span className="hx-stat__value">{value}</span>
      {delta != null && <span className="hx-stat__delta" data-trend={trend}>{delta}</span>}
    </div>
  );
}
