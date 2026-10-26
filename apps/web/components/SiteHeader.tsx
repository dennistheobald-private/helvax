import Link from "next/link";
import { Logo, Navbar, buttonClass } from "@helvax/ui/react";
import { APP_URL } from "@/lib/urls";

export function SiteHeader() {
  return (
    <div className="site-header">
      <Navbar
        label="Main"
        brand={
          <Link className="hx-navbar__brand" href="/" aria-label="Helvax home">
            <Logo height={26} title="Helvax" />
          </Link>
        }
        links={
          <>
            <li><Link href="/#why">Why Helvax</Link></li>
            <li><Link href="/#verified">Verified results</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/#faq">FAQ</Link></li>
          </>
        }
        actions={
          <>
            <a className={buttonClass({ variant: "ghost" })} href={`${APP_URL}/login`}>Log in</a>
            <Link className={buttonClass({})} href="/#demo">Request demo</Link>
          </>
        }
      />
    </div>
  );
}
