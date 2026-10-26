import type { Metadata } from "next";
import { EmptyState } from "@helvax/ui/react";

export const metadata: Metadata = { title: "Simulations" };

export default function SimulationsPage() {
  return (
    <EmptyState title="Choose your scenarios">
      Pick templates from the approved library and set how often each person is tested.
    </EmptyState>
  );
}
