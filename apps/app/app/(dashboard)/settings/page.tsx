import type { Metadata } from "next";
import { EmptyState } from "@helvax/ui/react";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <EmptyState title="Company settings">
      Admin users, safety limits, timezone, notifications and billing will live here.
    </EmptyState>
  );
}
