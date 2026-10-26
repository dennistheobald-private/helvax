"use client";

import { useId, useState } from "react";
import { Icon, buttonClass } from "@helvax/ui/react";
import { formatCount, formatMoney, type PriceList } from "@/lib/pricing";

const included = [
  "All scenario types: phishing, supplier fraud, executive impersonation, QR and document links",
  "Randomized sending inside your business hours",
  "Scanner visits labelled apart from human clicks",
  "Monthly report by email, with PDF and CSV export",
  "Short training moment after a risky click",
  "Admin and viewer roles, MFA for admins",
];

export function Pricing({ prices }: { prices: PriceList }) {
  const [cycle, setCycle] = useState<"annual" | "monthly">("annual");
  const [seats, setSeats] = useState(100);
  const seatsId = useId();
  const { currency } = prices;

  const perMonth = cycle === "annual" ? prices.annual / 12 : prices.monthly;
  const total = cycle === "annual" ? prices.annual * seats : prices.monthly * seats;
  const saving = Math.round((1 - prices.annual / (prices.monthly * 12)) * 100);

  return (
    <div className="pricing">
      <div className="pricing__card hx-card">
        <div className="hx-tabs hx-tabs--track pricing__toggle">
          <div className="hx-tabs__list" role="radiogroup" aria-label="Billing">
            {(["annual", "monthly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                className="hx-tabs__tab"
                aria-checked={cycle === c}
                aria-selected={cycle === c}
                onClick={() => setCycle(c)}
              >
                {c === "annual" ? <>Annual <span className="hx-badge hx-badge--brand">−{saving}%</span></> : "Monthly"}
              </button>
            ))}
          </div>
        </div>

        <div className="pricing__price">
          <span className="pricing__amount">{formatMoney(perMonth, currency)}</span>
          <span className="pricing__unit">per employee per month</span>
        </div>
        <p className="pricing__note">
          {cycle === "annual"
            ? `${formatMoney(prices.annual, currency)} per employee per year, invoiced up front.`
            : "Billed monthly. Cancel any time."}
          {" "}You only pay for active employees.
        </p>

        <div className="pricing__calc">
          <label className="hx-label" htmlFor={seatsId}>Employees</label>
          <div className="pricing__seats">
            <input
              id={seatsId}
              type="range"
              min={10}
              max={2000}
              step={10}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              aria-valuetext={`${seats} employees`}
            />
            <output htmlFor={seatsId} className="hx-mono">{formatCount(seats)}</output>
          </div>
          <p className="pricing__total" aria-live="polite">
            <strong>{formatMoney(total, currency)}</strong> {cycle === "annual" ? "per year" : "per month"}
          </p>
        </div>

        <a className={buttonClass({ size: "lg", block: true })} href="#demo">Request a demo</a>
        {currency === "EUR" && (
          <p className="pricing__fx">Prices are set in CHF and shown in EUR at today&apos;s exchange rate. Your invoice states the final amount.</p>
        )}
      </div>

      <ul className="pricing__list" aria-label="Included in every plan">
        {included.map((item) => (
          <li key={item}><Icon name="check" />{item}</li>
        ))}
      </ul>
    </div>
  );
}
