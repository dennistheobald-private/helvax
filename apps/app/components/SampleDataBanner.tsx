import { Alert } from "@helvax/ui/react";
import { clearSampleData } from "@/app/(dashboard)/actions";

/** Shown on every results page while the company has sample data loaded. */
export function SampleDataBanner({ canClear }: { canClear: boolean }) {
  return (
    <Alert
      tone="warning"
      title="You're looking at sample data"
      actions={canClear && (
        <form action={clearSampleData}><button type="submit" className="hx-btn hx-btn--outline hx-btn--sm">Remove sample data</button></form>
      )}
    >
      Made-up employees and results on a sample domain, so you can explore the dashboard. Nothing was sent to anyone.
    </Alert>
  );
}
