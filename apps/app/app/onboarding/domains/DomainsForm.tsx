"use client";

import { useActionState } from "react";
import { Alert, Button } from "@helvax/ui/react";
import { DomainsInput } from "@/components/DomainsInput";
import { addCompanyDomains } from "./actions";

export function DomainsForm({ suggestedDomain }: { suggestedDomain: string }) {
  const [state, action, pending] = useActionState(addCompanyDomains, {});
  return (
    <form action={action} className="login__form">
      {state.error && <Alert tone="danger" title="Something went wrong">{state.error}</Alert>}
      <DomainsInput initial={suggestedDomain} />
      <Button type="submit" size="lg" block loading={pending}>Continue</Button>
    </form>
  );
}
