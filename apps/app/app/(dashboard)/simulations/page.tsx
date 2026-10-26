import type { Metadata } from "next";
import { Badge, Card, Icon } from "@helvax/ui/react";
import type { Scenario, ScenarioCategory } from "@/lib/database.types";
import { CATEGORIES, DIFFICULTY } from "@/lib/results";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { toggleScenario } from "./actions";
import { SettingsForm } from "./forms";

export const metadata: Metadata = { title: "Simulations" };

export default async function SimulationsPage() {
  const s = await requireSession();
  const supabase = await createClient();
  const [{ data: settings }, { data: library }, { count: verifiedDomains }] = await Promise.all([
    supabase.from("simulation_settings").select("*").eq("tenant_id", s.tenant.id).single(),
    supabase.from("tenant_scenarios").select("enabled, scenarios(*)").eq("tenant_id", s.tenant.id),
    supabase.from("company_domains").select("id", { count: "exact", head: true }).eq("tenant_id", s.tenant.id).not("verified_at", "is", null),
  ]);

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
          <span className="sending__dot" data-on={settings?.sending_enabled || undefined} aria-hidden="true" />
          <div>
            <h2>{settings?.sending_enabled ? "Simulations are being sent" : "Sending is off"}</h2>
            <p className="muted">
              {settings?.sending_enabled
                ? "New simulations go out at random times inside your schedule."
                : "Nothing is sent to your employees yet. Sending starts once every check below is complete."}
            </p>
          </div>
        </div>
        <ul className="checks">
          <li data-done={(verifiedDomains ?? 0) > 0 || undefined}><Icon name={(verifiedDomains ?? 0) > 0 ? "checkc" : "info"} size="sm" />At least one verified company domain</li>
          <li data-done={enabled > 0 || undefined}><Icon name={enabled > 0 ? "checkc" : "info"} size="sm" />At least one scenario turned on</li>
          <li><Icon name="info" size="sm" />Employees informed through your awareness notice</li>
          <li><Icon name="info" size="sm" />Final safety review with Helvax before the first send</li>
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
