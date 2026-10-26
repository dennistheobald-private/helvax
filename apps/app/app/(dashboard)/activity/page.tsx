import type { Metadata } from "next";
import { EmptyState } from "@helvax/ui/react";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <EmptyState title="Nothing has happened yet">
      Deliveries and interactions show up here, with automated scanner visits labelled separately.
    </EmptyState>
  );
}
