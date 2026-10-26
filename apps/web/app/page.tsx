import Link from "next/link";
import { headers } from "next/headers";
import { AppIcon, Icon, LogoMark, buttonClass } from "@helvax/ui/react";
import { DemoForm } from "@/components/DemoForm";
import { FrequencyDial } from "@/components/FrequencyDial";
import { NewsletterForm } from "@/components/NewsletterForm";
import { ProductWindow } from "@/components/ProductWindow";
import { Reveal } from "@/components/Reveal";
import { Stats } from "@/components/Stats";
import { ValueHub } from "@/components/ValueHub";
import { VerifyFlow } from "@/components/VerifyFlow";
import { formatMoney, priceListFor } from "@/lib/pricing";

const trust = [
  "No access to your mailboxes",
  "No real passwords collected",
  "Data hosted in the EU",
];

const faqs: { q: string; a: string }[] = [
  { q: "Do you need access to our email system?", a: "No. Helvax sends from its own domains like any outside sender, so there's no IT project. Only addresses on your verified company domain can be tested." },
  { q: "What counts as a failure?", a: "Only a verified risky action, such as confirming a fake bank change or approving a fake payment. Opening a link is never a failure on its own." },
  { q: "How often are people tested?", a: "You choose, usually once or twice a month per person. Helvax picks random times inside your business hours, never flooding anyone." },
  { q: "What about GDPR and the Swiss FADP?", a: "Helvax is built for data minimization: we store only work email, name and team, host data in the EU and sign a data processing agreement. You can delete anyone at any time." },
  { q: "Which languages are supported?", a: "English and German, with Dutch to follow." },
];

export default async function HomePage() {
  const prices = await priceListFor((await headers()).get("x-vercel-ip-country"));
  const from = formatMoney(prices.helvax.annual / 12, prices.currency);

  return (
    <>
      <section className="hero hx-clouds" aria-labelledby="hero-title">
        <AppIcon />
        <Link className="hx-badge hx-badge--link" href="/pricing">
          Start free · then from {from} per employee <Icon name="arrow" size="sm" />
        </Link>
        <h1 id="hero-title" className="hx-headline">
          Realistic attacks.
          <span className="hx-headline__sub">Verified results.</span>
        </h1>
        <p className="hx-lead">See how your people really respond to fraud and phishing, and prove they get better every month.</p>
        <div className="hx-btn-group">
          <Link className={buttonClass({ size: "lg" })} href="/#demo">Request a demo</Link>
          <Link className={buttonClass({ size: "lg", variant: "soft" })} href="/pricing">See pricing</Link>
        </div>
      </section>

      <div className="wrap">
        <Reveal as="section" className="showcase" aria-label="The Helvax monthly report">
          <ProductWindow />
        </Reveal>

        <Reveal><Stats /></Reveal>

        <section id="why" className="section" aria-labelledby="why-title">
          <Reveal className="section__head">
            <LogoMark width={40} height={40} className="section__mark" />
            <h2 id="why-title" className="hx-headline hx-headline--md">Train reflexes.<span className="hx-headline__sub">Prove the progress.</span></h2>
          </Reveal>
          <Reveal><ValueHub /></Reveal>
          <ul className="trust" aria-label="Built for privacy">
            {trust.map((t) => <li key={t}><Icon name="checkc" size="sm" />{t}</li>)}
            <li>
              <svg className="swiss-flag" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="4" fill="#DA291C" /><path fill="#FFFFFF" d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7z" /></svg>
              Made in Switzerland
            </li>
          </ul>
        </section>

        <section id="verified" className="section" aria-labelledby="verified-title">
          <Reveal className="section__head">
            <span className="hx-eyebrow">Verified results</span>
            <h2 id="verified-title" className="hx-headline hx-headline--md">A click is not a failure.<span className="hx-headline__sub">Evidence is.</span></h2>
            <p className="hx-lead">Scanners and stray clicks never count against your people. Only a confirmed risky action does, so the number you report is one you can defend.</p>
          </Reveal>
          <VerifyFlow />
        </section>

        <Reveal as="section" className="hx-panel" aria-label="Testing rhythm">
          <div className="hx-grain hx-grain--soft"><FrequencyDial /></div>
          <div className="hx-panel__copy">
            <span className="hx-kicker"><Icon name="calendar" />Testing rhythm</span>
            <h2 className="hx-title">You set the rhythm. Nobody knows the moment.</h2>
            <p>Choose how often each person is tested. Helvax picks the day, time and scenario, so people learn to pause every time, not just on test day.</p>
          </div>
        </Reveal>

        <Reveal as="section" className="teaser" aria-labelledby="teaser-title">
          <div>
            <h2 id="teaser-title" className="hx-title">Start free with one employee.</h2>
            <p>Then {from} per employee per month, billed yearly. Pro adds deepfake voice simulations.</p>
          </div>
          <Link className={buttonClass({ size: "lg" })} href="/pricing">Compare plans <Icon name="arrow" size="sm" /></Link>
        </Reveal>

        <section id="faq" className="section" aria-labelledby="faq-title">
          <Reveal className="section__head">
            <span className="hx-eyebrow">FAQ</span>
            <h2 id="faq-title" className="hx-headline hx-headline--md">Questions we hear often</h2>
          </Reveal>
          <div className="faq">
            {faqs.map((f) => (
              <details key={f.q} className="faq__item">
                <summary>{f.q}<Icon name="plus" /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="demo" className="section demo hx-panel hx-panel--reverse" aria-labelledby="demo-title">
          <div className="demo__card hx-card"><DemoForm /></div>
          <div className="hx-panel__copy">
            <span className="hx-kicker"><Icon name="calendar" />Request a demo</span>
            <h2 id="demo-title" className="hx-title">See Helvax with your own scenarios</h2>
            <p>30 minutes: the dashboard, a sample report and your questions on data protection.</p>
          </div>
        </section>
      </div>

      <section className="newsletter hx-clouds" aria-labelledby="newsletter-title">
        <LogoMark width={32} height={32} className="newsletter__mark" />
        <h2 id="newsletter-title" className="hx-headline hx-headline--md">Stay a step ahead of attackers</h2>
        <p className="hx-lead">One short email a month on new fraud tricks and how teams stop them.</p>
        <NewsletterForm />
      </section>
    </>
  );
}
