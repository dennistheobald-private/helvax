import { CountUp } from "@helvax/ui/react";

// Every figure links to its primary source. Check the source before changing a number or its wording.
const STATS = [
  {
    value: 54, suffix: "%",
    label: "clicked AI-written spear-phishing emails in a controlled study, against 12% for generic phishing.",
    source: "Heiding, Schneier et al., 2024",
    href: "https://arxiv.org/abs/2412.00586",
  },
  {
    value: 62, suffix: "%",
    label: "of organizations have faced a deepfake attack using social engineering or automated processes.",
    source: "Gartner survey of 302 security leaders, 2025",
    href: "https://www.gartner.com/en/newsroom/press-releases/2025-09-22-gartner-survey-reveals-generative-artificial-intelligence-attacks-are-on-the-rise",
  },
  {
    value: 3.05, prefix: "$", suffix: "B", decimals: 2,
    label: "lost to business email compromise in 2025, from fake CEO and supplier payment requests.",
    source: "FBI Internet Crime Report 2025",
    href: "https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf",
  },
];

export function Stats() {
  return (
    <section className="stats" aria-labelledby="stats-title">
      <h2 id="stats-title" className="hx-headline hx-headline--md">
        Attackers aim at people first.
        <span className="hx-headline__sub">Reflexes decide what happens next.</span>
      </h2>
      <ul className="stats__list">
        {STATS.map((s) => (
          <li key={s.href} className="stats__item">
            <span className="stats__value"><CountUp value={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} /></span>
            <p>{s.label}</p>
            <a className="stats__source" href={s.href} target="_blank" rel="noopener noreferrer">Source: {s.source}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
