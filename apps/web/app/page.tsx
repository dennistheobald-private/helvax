import Link from "next/link";
import { AppIcon, Icon, buttonClass } from "@helvax/ui/react";

export default function HomePage() {
  return (
    <section className="hero hx-clouds" aria-labelledby="hero-title">
      <AppIcon />
      <Link className="hx-badge hx-badge--link" href="/#pricing">
        From CHF 2 per employee per month <Icon name="arrow" size="sm" />
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
  );
}
