import type { Metadata } from "next";
import { EmptyState } from "@helvax/ui/react";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <EmptyState title="Your first monthly report is on its way">
      Reports are created at the start of each month and emailed to opted-in admins.
    </EmptyState>
  );
}
