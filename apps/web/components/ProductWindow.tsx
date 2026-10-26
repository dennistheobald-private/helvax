"use client";

import { Badge, Icon, Logo, LogoMark, useCountUp, useInView, type BadgeTone, type IconName } from "@helvax/ui/react";

// The monthly report as it looks in app.helvax.ch, with a sample company and made-up data.
// Built from the same Helvax UI classes as the app: sidebar, topbar, tabs, stat cards, table, badges.

const NAV: { label: string; items: { label: string; icon: IconName; current?: boolean; badge?: string }[] }[] = [
  { label: "Protect", items: [{ label: "Overview", icon: "overview" }, { label: "Simulations", icon: "target" }, { label: "Employees", icon: "users" }] },
  { label: "Results", items: [{ label: "Activity", icon: "activity", badge: "19" }, { label: "Reports", icon: "report", current: true }] },
  { label: "Setup", items: [{ label: "Settings", icon: "gear" }] },
];

const ROWS: { name: string; team: string; scenario: string; result: string; tone: BadgeTone }[] = [
  { name: "Tobias Kranz", team: "Finance", scenario: "Supplier bank change", result: "Verified risky action", tone: "danger" },
  { name: "Selin Yıldız", team: "HR", scenario: "CEO payment request", result: "Verified safe", tone: "success" },
  { name: "Jonas Albers", team: "Sales", scenario: "Shared document", result: "Scanner only", tone: "info" },
  { name: "Ana Brandt", team: "Finance", scenario: "Overdue invoice", result: "Inconclusive", tone: "outline" },
  { name: "Pieter de Vries", team: "IT", scenario: "Password expiry", result: "Suspected", tone: "warning" },
];

const EVIDENCE = ["Opened in a real browser session", "Pressed Confirm on the practice page", "No scanner or automation signs"];

const initials = (n: string) => { const w = n.split(" "); return `${w[0]![0]}${w[w.length - 1]![0]}`.toUpperCase(); };

export function ProductWindow() {
  const [ref, inView] = useInView<HTMLDivElement>("0px 0px -10% 0px");
  const rate = useCountUp(3.4, inView, 1600);
  const sent = useCountUp(1213, inView);
  const scanner = useCountUp(131, inView);

  return (
    <div ref={ref} className="pw hx-grain" data-in={inView || undefined}>
      <figure className="pw__window" aria-label="Example monthly report in the Helvax app, with made-up data">
        <aside className="pw__side hx-sidebar" aria-hidden="true">
          <span className="hx-sidebar__brand"><Logo height={22} className="pw__logo" /></span>
          <span className="pw__company"><span className="pw__company-icon">AB</span>Alpenbau AG<Icon name="arrow" size="sm" /></span>
          {NAV.map((group) => (
            <div key={group.label} className="hx-sidebar__section">
              <span className="hx-eyebrow hx-sidebar__heading">{group.label}</span>
              {group.items.map((item) => (
                <span key={item.label} className="hx-sidebar__link" aria-current={item.current ? "page" : undefined}>
                  <Icon name={item.icon} />{item.label}
                  {item.badge && <span className="hx-badge">{item.badge}</span>}
                </span>
              ))}
            </div>
          ))}
        </aside>

        <div className="pw__main">
          <div className="pw__topbar hx-topbar" aria-hidden="true">
            <span className="hx-topbar__title">Reports</span>
            <Icon name="search" /><Icon name="bell" /><span className="hx-avatar pw__avatar">MK</span>
          </div>

          <div className="pw__content">
            <div className="pw__tabs">
              <div className="hx-tabs hx-tabs--track" aria-hidden="true">
                <div className="hx-tabs__list"><span className="hx-tabs__tab" aria-selected="true">October 2026</span><span className="hx-tabs__tab">September</span><span className="hx-tabs__tab">August</span></div>
              </div>
              <span className="hx-btn hx-btn--secondary hx-btn--sm pw__export" aria-hidden="true"><Icon name="download" size="sm" />PDF</span>
            </div>

            <dl className="pw__kpis">
              <div className="hx-card hx-stat pw__kpi--main">
                <dt className="hx-stat__label">Verified risky action rate</dt>
                <dd className="hx-stat__value">{rate.toFixed(1)}<small>%</small></dd>
                <dd className="hx-stat__delta" data-trend="better">−1.2 pts vs September</dd>
              </div>
              <div className="hx-card hx-stat">
                <dt className="hx-stat__label">Simulations delivered</dt>
                <dd className="hx-stat__value">{Math.round(sent).toLocaleString("en-US")}</dd>
                <dd className="hx-stat__delta" data-trend="flat">across 9 teams</dd>
              </div>
              <div className="hx-card hx-stat pw__kpi--opt">
                <dt className="hx-stat__label">Scanner hits filtered</dt>
                <dd className="hx-stat__value">{Math.round(scanner)}</dd>
                <dd className="hx-stat__delta" data-trend="flat">never counted</dd>
              </div>
            </dl>

            <div className="hx-table-wrap pw__table">
              <table className="hx-table">
                <caption className="hx-visually-hidden">Latest results</caption>
                <thead><tr><th scope="col">Employee</th><th scope="col" className="pw__col-opt">Scenario</th><th scope="col">Result</th></tr></thead>
                <tbody>
                  {ROWS.map((r, i) => (
                    <tr key={r.name} aria-selected={i === 0 || undefined} style={{ transitionDelay: `${250 + i * 110}ms` }}>
                      <td><span className="hx-table__person"><span className="hx-avatar">{initials(r.name)}</span><span>{r.name}<small>{r.team}</small></span></span></td>
                      <td className="pw__col-opt">{r.scenario}</td>
                      <td><Badge tone={r.tone}>{r.result}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="pw__detail" aria-label="Result detail">
          <span className="pw__detail-eyebrow"><LogoMark width={14} height={14} />Verified result</span>
          <h3 className="pw__detail-title">Tobias confirmed a fake bank change</h3>
          <p className="pw__detail-meta">Finance · Supplier bank change · Tue 10:45</p>
          <ul className="pw__evidence">
            {EVIDENCE.map((e, i) => (
              <li key={e} style={{ transitionDelay: `${1500 + i * 220}ms` }}><Icon name="checkc" />{e}</li>
            ))}
          </ul>
          <div className="pw__lesson"><Icon name="doc" /><span><b>Training moment sent</b>Two minutes, right after the action</span></div>
        </aside>
        <figcaption className="hx-visually-hidden">
          Example report for October 2026: a verified risky action rate of 3.4%, down 1.2 points, from 1,213 delivered simulations, with 131 scanner hits filtered out and never counted.
        </figcaption>
      </figure>
    </div>
  );
}
