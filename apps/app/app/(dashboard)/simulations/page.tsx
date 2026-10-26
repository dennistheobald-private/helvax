import type { Metadata } from "next";
import { Badge, Card, Icon } from "@helvax/ui/react";
import type { Scenario, ScenarioCategory, SendingBlocker } from "@/lib/database.types";
import { CATEGORIES, DIFFICULTY } from "@/lib/results";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { confirmAwareness, toggleScenario } from "./actions";
import { SendingSwitch, SettingsForm } from "./forms";

export const metadata: Metadata = { title: "Simulations" };

const CHECKS: { key: SendingBlocker; label: string; hint?: string }[] = [
  { key: "no_verified_domain", label: "A verified company domain", hint: "Add the DNS record on the Employees page." },
  { key: "no_eligible_employees", label: "Active employees on a verified domain" },
  { key: "no_scenarios", label: "At least one scenario turned on" },
  { key: "awareness_not_confirmed", label: "Employees informed through your awareness notice", hint: "An owner confirms this once." },
  { key: "not_approved", label: "Safety review with Helvax", hint: "We check your setup with you before the first send." },
  { key: "platform_off", label: "Helvax sending enabled", hint: "Turned on by Helvax once sending is released." },
];

export default async function SimulationsPage() {
  const s = await requireSession();
  const supabase = await createClient();
  const [{ data: settings }, { data: library }, { data: readiness }] = await Promise.all([
    supabase.from("simulation_settings").select("*").eq("tenant_id", s.tenant.id).single(),
    supabase.from("tenant_scenarios").select("enabled, scenarios(*)").eq("tenant_id", s.tenant.id),
    supabase.rpc("sending_readiness", { t: s.tenant.id }),
  ]);
  const on = Boolean(readiness?.sending_enabled);
  const blockers: SendingBlocker[] = readiness?.blockers ?? CHECKS.map((c) => c.key);

  const scenarios = (library ?? [])
    .map((r) => ({ enabled: r.enabled, ...(r.scenarios as unknown as Scenario) }))
    .filter((r) => r.id && r.approval_state === "approved")
    .sort((a, b) => a.category.localeCompare(b.category) || a.difficulty - b.difficulty);
  const enabled = scenarios.filter((x) => x.enabled).length;
  const byCategory = new Map<ScenarioCategory, typeof scenarios>();
  for (const x of scenarios) byCategory.set(x.category, [...(byCategory.get(x.category) ?? []), x]);

  return (
    <div className="page">
      <Card className="section sending">
        <div className="sending__state">
          <span className="sending__dot" data-on={on || undefined} aria-hidden="true" />
          <div>
            <h2>{on ? "Simulations are being sent" : "Sending is off"}</h2>
            <p className="muted">
              {on
                ? `New simulations go out at random times inside your schedule.${readiness?.planned ? ` ${readiness.planned} planned for the next 30 days.` : ""}`
                : "Nothing is sent to your employees. Sending can start once every check is complete, and any admin can stop it at any time."}
            </p>
            <SendingSwitch enabled={on} canTurnOn={s.isOwner && blockers.length === 0} canTurnOff={s.isAdmin} />
          </div>
        </div>
        <ul className="checks">
          {CHECKS.map((c) => {
            const done = !blockers.includes(c.key);
            return (
              <li key={c.key} data-done={done || undefined}>
                <Icon name={done ? "checkc" : "info"} size="sm" />
                <span>
                  {c.label}
                  {!done && c.key === "awareness_not_confirmed" && s.isOwner && (
                    <form action={confirmAwareness} className="checks__action"><button type="submit" className="hx-link">I confirm employees were informed</button></form>
                  )}
                  {!done && c.hint && <small>{c.hint}</small>}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="section">
        <header><h2>Schedule</h2><p className="muted">Scenarios and timing change all the time, so employees learn to expect the unexpected.</p></header>
        {settings && <SettingsForm settings={settings} disabled={!s.isAdmin} />}
      </Card>

      <section className="section-plain" aria-labelledby="library">
        <header className="section__head">
          <div>
            <h2 id="library">Scenario library</h2>
            <p className="muted">{enabled} of {scenarios.length} scenarios on. All identities are fictional, and links only go to safe Helvax practice pages.</p>
          </div>
        </header>
        {[...byCategory].map(([cat, list]) => (
          <div key={cat} className="library-group">
            <h3 className="hx-eyebrow">{CATEGORIES[cat].label}</h3>
            <div className="scenario-grid">
              {list.map((x) => (
                <article key={x.id} className="hx-scenario" data-off={!x.enabled || undefined}>
                  <div className="hx-scenario__top">
                    <span className="hx-scenario__glyph"><Icon name={CATEGORIES[x.category].icon} /></span>
                    {x.enabled ? <Badge tone="success">On</Badge> : <Badge>Off</Badge>}
                  </div>
                  <div className="scenario-copy">
                    <h4 className="hx-scenario__title">{x.title}</h4>
                    <p className="hx-scenario__desc">{x.description}</p>
                  </div>
                  <div className="hx-scenario__preview">
                    <span>From <b>{x.sender_name}</b></span>
                    <span>Subject <b>{x.subject}</b></span>
                  </div>
                  <div className="hx-scenario__meta">
                    <span className="hx-difficulty" data-level={x.difficulty}><span className="hx-difficulty__dots" aria-hidden="true"><i /><i /><i /></span>{DIFFICULTY[x.difficulty]}</span>
                    <span className="hx-mono">{x.locales.map((l) => l.toUpperCase()).join(" · ")}</span>
                    <span className="hx-mono">v{x.version}</span>
                  </div>
                  {s.isAdmin && (
                    <form action={toggleScenario} className="hx-scenario__actions">
                      <input type="hidden" name="scenario" value={x.id} />
                      <input type="hidden" name="enabled" value={String(!x.enabled)} />
                      <button type="submit" className="hx-switch" role="switch" aria-checked={x.enabled}>
                        <span className="hx-switch__track" aria-hidden="true" />{x.enabled ? "Included in simulations" : "Not included"}
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
