import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";

// Phase 3 adds the session check here: no session means a redirect to /login.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}
