import type { Metadata } from "next";
import { company } from "@/lib/company";

export const metadata: Metadata = { title: "Imprint" };

export default function ImprintPage() {
  return (
    <article className="legal">
      <h1>Imprint</h1>
      <p>
        <strong>{company.name}</strong>
        {company.address.map((line) => (<span key={line}><br />{line}</span>))}
      </p>
      <p>Email: <a className="hx-link" href={`mailto:${company.email}`}>{company.email}</a></p>
      <p>{company.register}<br />{company.vat}</p>
      <h2>Liability</h2>
      <p>We check the content of this website carefully but can&apos;t guarantee that it is complete, correct or current. Links to other websites are the responsibility of their operators.</p>
    </article>
  );
}
