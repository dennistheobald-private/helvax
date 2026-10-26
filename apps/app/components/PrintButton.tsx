"use client";

import { Button, Icon } from "@helvax/ui/react";

/** Opens the browser's print dialog, where the report can also be saved as a PDF. */
export function PrintButton() {
  return <Button variant="outline" onClick={() => window.print()}><Icon name="download" size="sm" />Print or save as PDF</Button>;
}
