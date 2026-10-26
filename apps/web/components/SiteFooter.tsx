import Link from "next/link";
import { LogoMark } from "@helvax/ui/react";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span className="site-footer__brand"><LogoMark width={22} height={22} />helvax</span>
        <nav aria-label="Footer">
          <ul className="site-footer__links">
            <li><Link href="/#pricing">Pricing</Link></li>
            <li><Link href="/#faq">FAQ</Link></li>
            <li><Link href="/#demo">Request demo</Link></li>
            <li><Link href="/imprint">Imprint</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
          </ul>
        </nav>
        <small>© {new Date().getFullYear()} Helvax. Made in Switzerland.</small>
      </div>
    </footer>
  );
}
