import Link from "next/link";
import { headers } from "next/headers";
import { AppIcon, Icon, buttonClass, type IconName } from "@helvax/ui/react";
import { DemoForm } from "@/components/DemoForm";
import { EvidenceLadder } from "@/components/EvidenceLadder";
import { FrequencyDial } from "@/components/FrequencyDial";
import { Pricing } from "@/components/Pricing";
import { Reveal } from "@/components/Reveal";
import { ReportDemo } from "@/components/ReportDemo";
import { formatMoney, priceListFor } from "@/lib/pricing";

const steps: { icon: IconName; title: string; body: string }[] = [
  { icon: "target", title: "See your real exposure", body: "Realistic payment fraud, CEO fraud and phishing show where risk actually sits in your company, team by team." },
  { icon: "person", title: "Build reflexes, not fear", body: "Unpredictable tests and a two-minute learning moment teach people to pause and verify, without naming or shaming anyone." },
  { icon: "report", title: "Prove the progress", body: "Every month you get verified numbers you can show to management, auditors and insurers, and see them improve." },
];

const usps: { icon: IconName; title: string; body: string }[] = [
  { icon: "checkc", title: "Verified, not guessed", body: "Every failure is backed by evidence that a real person completed a risky action. A link visit alone never counts." },
  { icon: "scan", title: "Scanner noise removed", body: "Link scanners, security gateways and automated browsers are detected and reported separately, never as people." },
  { icon: "info", title: "Honest about uncertainty", body: "When the evidence isn't strong enough, the result is Inconclusive. Suspected cases wait for review instead of inflating the rate." },
  { icon: "doc", title: "An audit trail for every result", body: "Each outcome links to its full event history, the rule version that decided it and a plain-language explanation." },
  { icon: "users", title: "Trends by team, not blame", body: "See where risk sits by department and how it changes month to month. People get a short training moment, not a public list." },
  { icon: "download", title: "Ready for auditors and the board", body: "A frozen monthly snapshot with PDF and CSV export, so the numbers you presented never change afterwards." },
];

const safety: { icon: IconName; title: string; body: string }[] = [
  { icon: "block", title: "No real secrets, ever", body: "Practice forms use dummy fields. We never collect passwords, MFA codes, bank details or documents." },
  { icon: "mail", title: "No IT project", body: "Nothing to install and no access to Microsoft 365, Gmail or your mail servers. You can start the same week." },
  { icon: "person", title: "Built for works councils", body: "Data minimization, EU hosting, deletion on request and results focused on groups and trends." },
];

const faqs: { q: string; a: string }[] = [
  { q: "Do you need access to our email system?", a: "No. Helvax sends simulations from its own domains like any outside sender would, so there is no integration project and no access to your mailboxes. Only addresses on your own verified company domain can be tested." },
  { q: "How often will employees receive a simulation?", a: "You decide. Most teams choose one to two per person per month. Helvax spreads them randomly inside your business hours and time zone, with a cooldown per person so nobody is flooded." },
  { q: "What counts as a failure?", a: "Only a verified risky action: a person completed a simulated security-sensitive step, such as submitting the safe practice login, confirming a fictional bank change or approving a fake payment, and the evidence shows it was very likely a human. Opening a link is never a failure on its own." },
  { q: "What does Inconclusive mean?", a: "There was some activity, but not enough evidence to call it either way, for example a single link request with no deliberate interaction. We say so openly instead of counting it as a failure." },
  { q: "How do you tell people from scanners?", a: "Every simulation uses a signed, expiring link. We correlate requests into sessions and look at timing, network origin, browser behaviour and whether a deliberate action followed. Activity from mail security scanners and automated browsers is labelled separately." },
  { q: "What exactly do you measure?", a: "Deliveries accepted by your mail server, bounces, signed-link requests, deliberate interactions with practice pages, completed simulated actions and replies to our mailboxes. We don't claim to see inbox reads, internal forwarding or reports to your IT team, and a signed link proves the link was used, not who used it." },
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
          Realistic attacks.
          <span className="hx-headline__sub">Verified results.</span>
        </h1>
        <p className="hx-lead">
          Know how your people really respond to fraud and phishing. Helvax counts a failure only when the evidence shows a real person took a risky action, so you can act on numbers you trust.
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
            <h2 className="hx-title">The attacks your team will actually see</h2>
            <p>Payment fraud, CEO fraud, QR codes and fake logins land in real inboxes. The scenario library changes all the time, and every template is reviewed and approved before it can be sent.</p>
            <ul className="hx-tags" aria-label="Simulation types">
              <li className="hx-tag">Phishing</li><li className="hx-tag">Supplier fraud</li><li className="hx-tag">Executive impersonation</li>
              <li className="hx-tag">QR codes</li><li className="hx-tag">Document links</li><li className="hx-tag">Safe credential form</li>
            </ul>
          </div>
        </Reveal>

        <section id="verified" className="section" aria-labelledby="evidence-title">
          <Reveal className="section__head">
            <span className="hx-eyebrow">Verification first</span>
            <h2 id="evidence-title" className="hx-headline hx-headline--md">A click is not a failure.<span className="hx-headline__sub">Evidence is.</span></h2>
            <p className="hx-lead">Mail scanners open links within seconds. People share devices. So Helvax grades every observation and only counts levels 3 and 4 toward your failure rate.</p>
          </Reveal>
          <EvidenceLadder />
          <Reveal className="callout">
            <Icon name="info" />
            <p><strong>Inconclusive is a valid answer.</strong> When the evidence isn&apos;t strong enough, we say so, instead of inflating your failure rate.</p>
          </Reveal>
        </section>

        <Reveal as="section" className="hx-panel" aria-label="Testing frequency">
          <div className="hx-grain hx-grain--soft">
            <FrequencyDial />
          </div>
          <div className="hx-panel__copy">
            <span className="hx-kicker"><Icon name="calendar" />Frequency</span>
            <h2 className="hx-title">You set the rhythm. Nobody knows the moment.</h2>
            <p>Choose how often each person is tested and the hours it may happen. Helvax picks the day, the time and the scenario at random, and the library keeps changing. Employees learn to expect the unexpected.</p>
            <ul className="hx-tags" aria-label="Frequency settings">
              <li className="hx-tag">1 to 4 tests per person per month</li><li className="hx-tag">Business hours only</li><li className="hx-tag">Cooldown per person</li><li className="hx-tag">Holidays respected</li>
            </ul>
          </div>
        </Reveal>

        <section id="how-it-works" className="section" aria-labelledby="how-title">
          <Reveal className="section__head">
            <span className="hx-eyebrow">What you get</span>
            <h2 id="how-title" className="hx-headline hx-headline--md">From unknown risk<span className="hx-headline__sub">to proven progress.</span></h2>
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
                <div className="hx-incident__body"><div className="hx-item__lead"><span className="hx-incident__title">Confirmed the fictional bank change</span><span className="hx-incident__meta">Supplier fraud · L4 · reply + confirmation page</span></div><span className="hx-status hx-status--danger"><Icon name="block" />Verified risky</span></div>
              </article>
              <article className="hx-item"><Icon name="qr" style={{ color: "var(--subtle)" }} /><span className="hx-status"><Icon name="checkc" />Ignored</span><div className="hx-item__lead"><span className="hx-item__meta">QR parking permit · didn&apos;t scan</span></div></article>
              <article className="hx-item"><Icon name="doc" style={{ color: "var(--subtle)" }} /><span className="hx-status"><Icon name="checkc" />Completed</span><div className="hx-item__lead"><span className="hx-item__meta">Training moment · 2 min</span></div></article>
            </div>
          </div>
          <div className="hx-panel__copy">
            <span className="hx-kicker"><Icon name="scan" />Supplier fraud</span>
            <h2 className="hx-title">See who checks before they pay</h2>
            <p>Invoice corrections and bank-change requests test whether people verify by phone. Only an explicit confirmation of the fictional bank change counts as a risky action, and uncertain replies go to human review.</p>
            <ul className="hx-tags" aria-label="Scenarios in this category">
              <li className="hx-tag">Invoice correction</li><li className="hx-tag">Bank detail change</li><li className="hx-tag">Overdue reminder</li><li className="hx-tag">New vendor onboarding</li>
            </ul>
          </div>
        </Reveal>

        <section className="section" aria-labelledby="report-title">
          <Reveal className="section__head">
            <span className="hx-eyebrow">Monthly report</span>
            <h2 id="report-title" className="hx-headline hx-headline--md">One report a month.<span className="hx-headline__sub">Numbers you can defend.</span></h2>
          </Reveal>
          <ReportDemo />
        </section>

        <section className="section" aria-labelledby="usp-title">
          <Reveal className="section__head">
            <span className="hx-eyebrow">Why Helvax</span>
            <h2 id="usp-title" className="hx-headline hx-headline--md">What every security report<span className="hx-headline__sub">should be able to prove.</span></h2>
          </Reveal>
          <div className="usps">
            {usps.map((p, i) => (
              <Reveal key={p.title} className="usps__item" delay={i * 70}>
                <span className="usps__icon"><Icon name={p.icon} /></span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </Reveal>
            ))}
          </div>
          <div className="safety">
            {safety.map((p) => (
              <div key={p.title} className="safety__item"><Icon name={p.icon} /><div><strong>{p.title}</strong><p>{p.body}</p></div></div>
            ))}
          </div>
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
