import Link from "next/link";
import { headers } from "next/headers";
import { AppIcon, Icon, buttonClass, type IconName } from "@helvax/ui/react";
import { DemoForm } from "@/components/DemoForm";
import { Pricing } from "@/components/Pricing";
import { Reveal } from "@/components/Reveal";
import { formatMoney, priceListFor } from "@/lib/pricing";

const steps: { icon: IconName; title: string; body: string }[] = [
  { icon: "upload", title: "Upload your roster", body: "Import a CSV of employees and groups. We validate it in a dry run before anything is saved, and only domains you've verified can receive simulations." },
  { icon: "target", title: "Choose scenarios and frequency", body: "Pick from an approved library and decide how often each person is tested. Sending times are randomized inside your business hours." },
  { icon: "report", title: "Get a monthly report", body: "Every month admins get a short summary by email with a link to the dashboard: trends, risky replies and what to do next." },
];

const principles: { icon: IconName; title: string; body: string }[] = [
  { icon: "scan", title: "Scanners aren't people", body: "Mail security scanners and link prefetches are labelled separately, so your click rate reflects people, not robots." },
  { icon: "block", title: "No real secrets, ever", body: "Practice forms use dummy fields only. We never collect passwords, MFA codes, bank details or documents." },
  { icon: "mail", title: "No mailbox access", body: "Helvax doesn't connect to Microsoft 365, Gmail or your mail servers. There's no integration project and no access to read." },
  { icon: "person", title: "Learning, not blaming", body: "After a risky click people see a two-minute training moment. Reports focus on groups and trends, not on naming individuals." },
];

const faqs: { q: string; a: string }[] = [
  { q: "Do you need access to our email system?", a: "No. Helvax sends simulations from its own domains like any outside sender would. You upload a list of employees, verify that you own the recipient domain, and optionally allow-list our sending servers so simulations aren't blocked." },
  { q: "How often will employees receive a simulation?", a: "You decide. Most teams choose one to two per person per month. Helvax spreads them randomly inside your business hours and time zone, with a cooldown per person so nobody is flooded." },
  { q: "What exactly do you measure?", a: "Sends, deliveries accepted by your mail server, bounces, visits to signed links, interactions with the practice page, QR scans and replies to our mailboxes. We don't claim to see inbox reads, internal forwarding or reports to your IT team." },
  { q: "Is it GDPR compliant?", a: "Helvax is built for data minimization: we store work email, name and group, nothing more. We sign a data processing agreement, data is hosted in the EU, and you can delete employees and their history at any time. Check with your works council before starting where that applies." },
  { q: "Which languages are supported?", a: "Simulations, training moments and reports are available in English and German, with Dutch to follow." },
  { q: "How is billing calculated?", a: "Per active employee. Pay monthly, or yearly up front for half the price. Employees you deactivate stop counting from the next billing period." },
];

export default async function HomePage() {
  const country = (await headers()).get("x-vercel-ip-country");
  const prices = await priceListFor(country);
  const from = formatMoney(prices.annual / 12, prices.currency);

  return (
    <>
      <section className="hero hx-clouds" aria-labelledby="hero-title">
        <AppIcon />
        <Link className="hx-badge hx-badge--link" href="/#pricing">
          From {from} per employee per month <Icon name="arrow" size="sm" />
        </Link>
        <h1 id="hero-title" className="hx-headline">
          Train your team on the attacks they will actually see.
          <span className="hx-headline__sub">No mailbox connection. Just upload a roster.</span>
        </h1>
        <p className="hx-lead">
          Helvax sends randomized, realistic simulations all year round and emails you a clear monthly report.
        </p>
        <div className="hx-btn-group">
          <Link className={buttonClass({ size: "lg" })} href="/#demo">Request a demo</Link>
          <Link className={buttonClass({ size: "lg", variant: "soft" })} href="/#pricing">See pricing</Link>
        </div>
      </section>

      <div className="wrap">
        <Reveal as="section" className="hx-panel hx-panel--reverse" aria-label="Email simulations">
          <div className="hx-grain hx-grain--sage hx-grain--bleed">
            <div className="hx-window inbox" role="img" aria-label="Inbox preview with one executive impersonation simulation highlighted">
              <div className="hx-window__bar"><span className="hx-window__dots"><i /><i /><i /></span><span className="hx-window__tab"><Icon name="mail" />Urgent payment today</span></div>
              <div className="hx-window__url"><b>webmail.alpenbau.example</b>/inbox</div>
              <ul className="hx-window__list">
                <li className="hx-mailrow" aria-hidden="true"><span className="hx-mailrow__check" /><span className="hx-mailrow__avatar" /><span className="hx-mailrow__who">Jonas Albers<small>to me</small></span><span className="hx-mailrow__line" /></li>
                <li className="hx-mailrow" aria-hidden="true"><span className="hx-mailrow__check" /><span className="hx-mailrow__avatar" /><span className="hx-mailrow__who">Selin Yıldız<small>me, Pieter</small></span><span className="hx-mailrow__line" /></li>
                <li className="inbox__new">
                  <article className="hx-incident">
                    <div className="hx-incident__strip"><span className="hx-incident__tab"><Icon name="person" /></span>Executive impersonation</div>
                    <div className="hx-incident__person"><span className="hx-avatar">LS</span><div style={{ minWidth: 0 }}><b>Lena Seidel, CEO</b><span>Are you at your desk? I need a payment of CHF 48,750 sent today…</span></div></div>
                  </article>
                </li>
                <li className="hx-mailrow" aria-hidden="true"><span className="hx-mailrow__check" /><span className="hx-mailrow__avatar" /><span className="hx-mailrow__who">Ana Brandt<small>me, Tobias</small></span><span className="hx-mailrow__line" /></li>
                <li className="hx-mailrow" aria-hidden="true"><span className="hx-mailrow__check" /><span className="hx-mailrow__avatar" /><span className="hx-mailrow__who">Facility team<small>to me</small></span><span className="hx-mailrow__line" /></li>
              </ul>
            </div>
          </div>
          <div className="hx-panel__copy">
            <span className="hx-kicker"><Icon name="mail" />Email simulations</span>
            <h2 className="hx-title">Payment fraud, CEO fraud and AI phishing, the way they really arrive</h2>
            <p>Realistic, randomized simulations land in real inboxes inside business hours. Every template is reviewed and approved before it can be sent.</p>
            <ul className="hx-tags" aria-label="Simulation types">
              <li className="hx-tag">Phishing</li><li className="hx-tag">Supplier fraud</li><li className="hx-tag">Executive impersonation</li>
              <li className="hx-tag">QR codes</li><li className="hx-tag">Document links</li><li className="hx-tag">Safe credential form</li>
            </ul>
          </div>
        </Reveal>

        <section id="how-it-works" className="section" aria-labelledby="how-title">
          <Reveal className="section__head">
            <span className="hx-eyebrow">How it works</span>
            <h2 id="how-title" className="hx-headline hx-headline--md">Live in an afternoon.<span className="hx-headline__sub">Running all year.</span></h2>
          </Reveal>
          <ol className="steps">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} className="steps__item hx-card" delay={i * 90}>
                <span className="steps__num hx-mono">0{i + 1}</span>
                <Icon name={s.icon} />
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        <Reveal as="section" className="hx-panel" aria-label="Supplier fraud">
          <div className="hx-grain">
            <div className="hx-card feature-card">
              <div className="hx-profile"><span className="hx-avatar">TK</span><div><div className="hx-profile__name">Tobias Kranz</div><div className="hx-profile__meta">Finance · 7 simulations <span className="hx-profile__new">1 new</span></div></div></div>
              <article className="hx-incident">
                <div className="hx-incident__strip"><span className="hx-incident__tab"><Icon name="reply" /></span>Risky reply</div>
                <div className="hx-incident__body"><div className="hx-item__lead"><span className="hx-incident__title">Offered to update supplier bank details</span><span className="hx-incident__meta">Supplier fraud · confidence 0.88</span></div><span className="hx-status hx-status--danger"><Icon name="block" />High risk</span></div>
              </article>
              <article className="hx-item"><Icon name="qr" style={{ color: "var(--subtle)" }} /><span className="hx-status"><Icon name="checkc" />Ignored</span><div className="hx-item__lead"><span className="hx-item__meta">QR parking permit · didn&apos;t scan</span></div></article>
              <article className="hx-item"><Icon name="doc" style={{ color: "var(--subtle)" }} /><span className="hx-status"><Icon name="checkc" />Completed</span><div className="hx-item__lead"><span className="hx-item__meta">Training moment · 2 min</span></div></article>
            </div>
          </div>
          <div className="hx-panel__copy">
            <span className="hx-kicker"><Icon name="scan" />Supplier fraud</span>
            <h2 className="hx-title">See who checks before they pay</h2>
            <p>Invoice corrections and bank-change requests test whether people verify by phone. Replies are classified with a confidence score and flagged for review, never used to shame anyone.</p>
            <ul className="hx-tags" aria-label="Scenarios in this category">
              <li className="hx-tag">Invoice correction</li><li className="hx-tag">Bank detail change</li><li className="hx-tag">Overdue reminder</li><li className="hx-tag">New vendor onboarding</li>
            </ul>
          </div>
        </Reveal>

        <section className="section" aria-labelledby="honest-title">
          <Reveal className="section__head">
            <span className="hx-eyebrow">Built to be trusted</span>
            <h2 id="honest-title" className="hx-headline hx-headline--md">Honest numbers.<span className="hx-headline__sub">Safe by design.</span></h2>
          </Reveal>
          <div className="principles">
            {principles.map((p, i) => (
              <Reveal key={p.title} className="principles__item" delay={i * 70}>
                <span className="principles__icon"><Icon name={p.icon} /></span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section report-section" aria-labelledby="report-title">
          <Reveal className="section__head">
            <span className="hx-eyebrow">Monthly report</span>
            <h2 id="report-title" className="hx-headline hx-headline--md">One email a month.<span className="hx-headline__sub">Everything you need to act.</span></h2>
          </Reveal>
          <Reveal>
            <article className="hx-report report-demo" aria-label="Example monthly report">
              <header className="hx-report__cover"><span className="hx-eyebrow">Monthly security summary</span><h3 className="hx-report__title">Alpenbau AG · October 2026</h3><span className="hx-report__period">01.10.2026 – 31.10.2026 · Europe/Zurich</span></header>
              <dl className="hx-report__grid">
                <div className="hx-report__metric"><dt>Employees targeted</dt><dd>412</dd></div>
                <div className="hx-report__metric"><dt>Simulations sent</dt><dd>1,284</dd></div>
                <div className="hx-report__metric"><dt>Verified interactions</dt><dd>62</dd></div>
                <div className="hx-report__metric"><dt>High-risk replies</dt><dd>7</dd></div>
              </dl>
              <div className="hx-report__body">
                <div style={{ display: "grid", gap: 8 }}><strong>Recommendations</strong>
                  <ul className="hx-report__recs">
                    <li>Add a supplier-verification training moment for Finance; 5 of 7 risky replies came from this group.</li>
                    <li>Verification replies rose from 27 to 38. Share this in the next team update.</li>
                  </ul>
                </div>
                <p className="hx-help">Example data. Every report is a frozen snapshot, so later reclassification never rewrites what was sent.</p>
              </div>
            </article>
          </Reveal>
        </section>

        <section id="pricing" className="section" aria-labelledby="pricing-title">
          <Reveal className="section__head">
            <span className="hx-eyebrow">Pricing</span>
            <h2 id="pricing-title" className="hx-headline hx-headline--md">One plan.<span className="hx-headline__sub">Priced per employee.</span></h2>
          </Reveal>
          <Reveal><Pricing prices={prices} /></Reveal>
        </section>

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
            <p>In 30 minutes we show you the dashboard, the scenario library and a sample report, and answer questions about data protection and your works council.</p>
          </div>
        </section>
      </div>
    </>
  );
}
