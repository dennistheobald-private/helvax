import Link from "next/link";
import { LogoMark } from "@helvax/ui/react";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span className="site-footer__brand"><LogoMark width={22} height={22} />helvax</span>
        <nav aria-label="Footer">
          <ul className="site-footer__links">
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/#faq">FAQ</Link></li>
            <li><Link href="/#demo">Request demo</Link></li>
            <li><Link href="/imprint">Imprint</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
          </ul>
        </nav>
        <small className="site-footer__made">
          © {new Date().getFullYear()} Helvax. Made in Switzerland.
          <svg className="swiss-flag" viewBox="0 0 32 32" role="img" aria-label="Swiss flag">
            <rect width="32" height="32" rx="4" fill="#DA291C" />
            <path fill="#FFFFFF" d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7z" />
          </svg>
        </small>
      </div>
    </footer>
  );
}
