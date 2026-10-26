import type { Metadata } from "next";
import { headers } from "next/headers";
import { Icon } from "@helvax/ui/react";
import { ComparePlans } from "@/components/ComparePlans";
import { PricingPlans } from "@/components/PricingPlans";
import { priceListFor } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free with one employee. Helvax, Helvax Pro and Enterprise plans, priced per employee in CHF or EUR.",
};

const faqs = [
  { q: "Who counts as an employee?", a: "Every active person you test. Employees you deactivate stop counting from the next billing period." },
  { q: "Can I switch plans later?", a: "Yes, up or down at any time. Upgrades apply straight away; downgrades from the next billing period." },
  { q: "Is there a minimum contract?", a: "Monthly plans can be cancelled any time. Yearly plans are paid up front for half the price." },
  { q: "Which currencies do you bill in?", a: "Swiss francs, or euros for customers in the EU, converted at the daily exchange rate." },
];

export default async function PricingPage() {
  const prices = await priceListFor((await headers()).get("x-vercel-ip-country"));
  return (
    <div className="wrap wrap--page">
      <header className="page-head">
        <span className="hx-eyebrow">Pricing</span>
        <h1 className="hx-headline">Start free with one employee.<span className="hx-headline__sub">Grow when you&apos;re ready.</span></h1>
      </header>
      <PricingPlans prices={prices} />
      <ComparePlans />
      <section className="section" aria-labelledby="pricing-faq">
        <h2 id="pricing-faq" className="hx-title section__title">Billing questions</h2>
        <div className="faq">
          {faqs.map((f) => (
            <details key={f.q} className="faq__item">
              <summary>{f.q}<Icon name="plus" /></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
