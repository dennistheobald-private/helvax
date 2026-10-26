"use client";

import { useState } from "react";
import { Badge, Icon, InfoTip, buttonClass } from "@helvax/ui/react";
import { FREE_EMPLOYEES, formatMoney, type Price, type PriceList } from "@/lib/pricing";
import { APP_URL } from "@/lib/urls";

type Cycle = "annual" | "monthly";
interface Feature { text: string; tip?: string; soon?: boolean }
interface Plan {
  key: string;
  name: string;
  price: (cycle: Cycle) => { amount: string; unit?: string; note?: string };
  features: Feature[];
  cta: { label: string; href: string };
  limit: string;
  foot: string;
  featured?: boolean;
}

const perMonth = (p: Price, c: Cycle) => (c === "annual" ? p.annual / 12 : p.monthly);

export function PricingPlans({ prices }: { prices: PriceList }) {
  const [cycle, setCycle] = useState<Cycle>("annual");
  const { currency } = prices;
  const saving = Math.round((1 - prices.helvax.annual / (prices.helvax.monthly * 12)) * 100);
  const paid = (p: Price) => (c: Cycle) => ({
    amount: formatMoney(perMonth(p, c), currency),
    unit: "per employee / month",
    note: c === "annual" ? `${formatMoney(p.annual, currency)} per employee, billed yearly` : "Billed monthly, cancel any time",
  });

  const plans: Plan[] = [
    {
      key: "free", name: "Free", price: () => ({ amount: formatMoney(0, currency), note: "Free for good" }),
      features: [
        { text: "Email, CEO and supplier fraud scenarios" },
        { text: "Verified results", tip: "Only a confirmed risky action counts. Scanners and stray clicks never do." },
        { text: "Monthly report" },
      ],
      cta: { label: "Start free", href: `${APP_URL}/login` },
      limit: `${FREE_EMPLOYEES} employee`, foot: "To see Helvax for yourself",
    },
    {
      key: "helvax", name: "Helvax", price: paid(prices.helvax),
      features: [
        { text: "Everything in Free, for your whole team" },
        { text: "Unpredictable testing schedule", tip: "You set how often. Helvax picks the day, time and scenario inside your business hours." },
        { text: "Team trends and PDF export" },
        { text: "Two-minute training moments", tip: "Shown right after a risky action, in private. Nobody is named or shamed." },
      ],
      cta: { label: "Request a demo", href: "/#demo" },
      limit: "Any number of employees", foot: "For teams of every size",
    },
    {
      key: "pro", name: "Helvax Pro", featured: true,
      price: prices.pro ? paid(prices.pro) : () => ({ amount: "On request", note: "Priced with you for your team size" }),
      features: [
        { text: "Everything in Helvax" },
        { text: "Deepfake voice simulations", soon: true, tip: "Calls in a cloned executive voice, made only from samples your company provides and approves." },
        { text: "Kick-off call on request", tip: "A call with our team to set goals, scenarios and the testing rhythm." },
      ],
      cta: { label: prices.pro ? "Request a demo" : "Talk to us", href: "/#demo" },
      limit: "Any number of employees", foot: "Fraud protection beyond email",
    },
    {
      key: "enterprise", name: "Helvax Enterprise", price: () => ({ amount: "Custom", note: "Tailored to your organization" }),
      features: [
        { text: "Everything in Pro" },
        { text: "Dedicated Slack channel", tip: "A shared channel with the Helvax team for quick answers." },
        { text: "Custom terms and invoicing" },
      ],
      cta: { label: "Book a demo", href: "/#demo" },
      limit: "Large organizations", foot: "For groups and regulated companies",
    },
  ];

  return (
    <div className="plans">
      <div className="plans__cycle hx-tabs hx-tabs--track">
        <div className="hx-tabs__list" role="radiogroup" aria-label="Billing">
          {(["annual", "monthly"] as const).map((c) => (
            <button key={c} type="button" role="radio" className="hx-tabs__tab" aria-checked={cycle === c} aria-selected={cycle === c} onClick={() => setCycle(c)}>
              {c === "annual" ? <>Yearly <span className="hx-badge hx-badge--brand">−{saving}%</span></> : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      <ul className="plans__grid">
        {plans.map((p) => {
          const price = p.price(cycle);
          return (
            <li key={p.key} className={p.featured ? "plan plan--featured" : "plan"}>
              <div className="plan__body">
                <h2 className="plan__name">{p.name}</h2>
                <p className="plan__price" aria-live="polite">
                  <span className="plan__amount">{price.amount}</span>
                  {price.unit && <span className="plan__unit">{price.unit}</span>}
                </p>
                <p className="plan__note">{price.note}</p>
                <ul className="plan__features">
                  {p.features.map((f) => (
                    <li key={f.text}>
                      <span className="plan__check"><Icon name="check" size="sm" /></span>
                      <span>{f.text}{f.soon && <> <Badge tone="brand">Soon</Badge></>}</span>
                      {f.tip && <InfoTip label={`About ${f.text}`}>{f.tip}</InfoTip>}
                    </li>
                  ))}
                </ul>
                <a className={buttonClass({ variant: p.featured ? "primary" : "secondary", block: true })} href={p.cta.href}>{p.cta.label}</a>
                <p className="plan__limit">{p.limit}</p>
              </div>
              <p className="plan__foot">{p.featured && <Icon name="checkc" size="sm" />}{p.foot}</p>
            </li>
          );
        })}
      </ul>
      {currency === "EUR" && <p className="plans__fx">Prices are set in CHF and shown in EUR at today&apos;s exchange rate. Your invoice states the final amount.</p>}
    </div>
  );
}
