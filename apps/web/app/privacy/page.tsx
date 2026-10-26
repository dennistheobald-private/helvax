import type { Metadata } from "next";
import { company } from "@/lib/company";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <article className="legal">
      <h1>Privacy policy</h1>
      <p>This policy explains what personal data {company.name} processes on this website and in the Helvax app, and why. It follows the Swiss Federal Act on Data Protection (FADP) and, where it applies, the EU GDPR.</p>

      <h2>Who is responsible</h2>
      <p>{company.name}, {company.address.join(", ")}. Contact: <a className="hx-link" href={`mailto:${company.email}`}>{company.email}</a>.</p>

      <h2>This website</h2>
      <ul>
        <li><strong>Hosting.</strong> The site runs on Vercel. Their servers log technical data such as IP address, time and requested page to deliver the site and keep it secure. We use your approximate country only to show prices in CHF or EUR; it is not stored.</li>
        <li><strong>Demo requests.</strong> When you request a demo we receive your name, work email, company, company size and message by email, sent through Resend. We use it only to reply and delete it when it&apos;s no longer needed.</li>
        <li><strong>No tracking.</strong> We don&apos;t use advertising cookies or third-party analytics on this site. Fonts are served from our own domain.</li>
      </ul>

      <h2 id="newsletter">Newsletter</h2>
      <p>If you sign up for the newsletter we store your email address, the time you signed up and when you confirmed. We send one confirmation email first and add you only after you press Confirm (double opt-in). Unconfirmed sign-ups are deleted after 7 days. Addresses are stored with Supabase in the EU and emails are sent through Resend. Every newsletter has an unsubscribe link, and you can also write to {company.email}. After you unsubscribe we keep only a record that you did, so you don&apos;t receive it again.</p>

      <h2>The Helvax app</h2>
      <p>For customers, Helvax processes employee names, work email addresses and groups, and the results of simulations, on behalf of the customer under a data processing agreement. Data is stored with Supabase in the EU. Helvax never collects real passwords, MFA codes, banking details or documents.</p>

      <h2>Your rights</h2>
      <p>You can ask for access to, correction or deletion of your data, and object to its processing, by writing to {company.email}. You can also complain to the Swiss Federal Data Protection and Information Commissioner or your local data protection authority.</p>
    </article>
  );
}
