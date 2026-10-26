import type { Metadata } from "next";
import { EmptyState } from "@helvax/ui/react";

export const metadata: Metadata = { title: "Employees" };

export default function EmployeesPage() {
  return (
    <EmptyState title="No employees yet">
      Upload a CSV roster. We check it in a dry run before anything is saved.
    </EmptyState>
  );
}
