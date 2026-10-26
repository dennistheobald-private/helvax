import { Badge } from "@helvax/ui/react";
import type { OutcomeResult } from "@/lib/database.types";
import { OUTCOMES } from "@/lib/results";

export function OutcomeBadge({ result }: { result: OutcomeResult | null | undefined }) {
  const o = OUTCOMES[result ?? "pending"];
  return <Badge tone={o.tone} title={o.help}>{o.label}</Badge>;
}
