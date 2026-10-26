"use client";

import { useActionState, useState } from "react";
import { Button } from "@helvax/ui/react";
import { startCheckout } from "./actions";

type Currency = "chf" | "eur";

/** Display prices per currency, read from Stripe: per employee per month, and the yearly total. */
export type PriceLabels = Record<Currency, { month: string; year: string; yearTotal: string; save: number }>;

export function CheckoutForm({ prices, defaultCurrency, seats }: { prices: Partial<PriceLabels>; defaultCurrency: Currency; seats: number }) {
  const currencies = Object.keys(prices) as Currency[];
  const [state, action, pending] = useActionState(startCheckout, {});
  const [yearly, setYearly] = useState(false);
  const [currency, setCurrency] = useState<Currency>(currencies.includes(defaultCurrency) ? defaultCurrency : currencies[0] ?? "chf");
  const p = prices[currency]!;
  return (
    <form action={action} className="billing-choice">
      <input type="hidden" name="interval" value={yearly ? "year" : "month"} />
      <input type="hidden" name="currency" value={currency} />
      <div className="billing-choice__price">
        <span className="billing-choice__amount">{yearly ? p.year : p.month}</span>
        <span className="muted">per employee per month{yearly ? `, billed yearly (${p.yearTotal} per employee)` : ", billed monthly"}</span>
      </div>
      <button className="hx-switch" type="button" role="switch" aria-checked={yearly} onClick={() => setYearly((y) => !y)}>
        <span className="hx-switch__track" aria-hidden="true" />Yearly contract {p.save > 0 && <span className="billing-choice__save">save {p.save}%</span>}
      </button>
      {currencies.length > 1 && (
        <div className="hx-field billing-choice__currency">
          <label className="hx-label" htmlFor="billing-currency">Currency</label>
          <select id="billing-currency" className="hx-select" value={currency} onChange={(e) => setCurrency(e.currentTarget.value as Currency)}>
            {currencies.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
        </div>
      )}
      <p className="muted">You have {seats} active {seats === 1 ? "employee" : "employees"}. The number of seats follows your active employees automatically, prorated.</p>
      <div className="settings-form__actions">
        <Button type="submit" loading={pending}>Continue to payment</Button>
        {state.error && <p className="form-status form-status--error" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}
