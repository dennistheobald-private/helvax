"use client";

import { useState } from "react";
import { Button } from "@helvax/ui/react";
import { MAX_DOMAINS } from "@/lib/domains";

/** One or more company domain fields, submitted as repeated `domain` values. */
export function DomainsInput({ initial }: { initial: string }) {
  const [rows, setRows] = useState<{ key: number; value: string }[]>([{ key: 0, value: initial }]);
  const [next, setNext] = useState(1);
  return (
    <div className="hx-field">
      <span className="hx-label" id="domains-label">Company email domains</span>
      <div className="domains-input" role="group" aria-labelledby="domains-label">
        {rows.map((r, i) => (
          <div key={r.key} className="domains-input__row">
            <input
              className="hx-input"
              name="domain"
              aria-label={`Domain ${i + 1}`}
              placeholder="company.ch"
              autoCapitalize="none"
              spellCheck={false}
              required={i === 0}
              value={r.value}
              onChange={(e) => setRows(rows.map((x) => (x.key === r.key ? { ...x, value: e.target.value } : x)))}
            />
            {rows.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} aria-label={`Remove domain ${i + 1}`}>
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>
      {rows.length < MAX_DOMAINS && (
        <Button variant="outline" size="sm" className="domains-input__add" onClick={() => { setRows([...rows, { key: next, value: "" }]); setNext(next + 1); }}>
          Add another domain
        </Button>
      )}
      <span className="hx-help">Only people with addresses on these domains can be added as employees. You'll verify each one with a DNS record later.</span>
    </div>
  );
}
