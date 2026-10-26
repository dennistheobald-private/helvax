import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, buttonClass } from "@helvax/ui/react";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <EmptyState title="Your security overview appears here" actions={<Link className={buttonClass({})} href="/employees">Import employees</Link>}>
      Once employees are imported and simulations run, you&apos;ll see risk trends, the last 30 days and recommendations.
    </EmptyState>
  );
}
