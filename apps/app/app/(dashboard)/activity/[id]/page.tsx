import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Card } from "@helvax/ui/react";
import { OutcomeBadge } from "@/components/OutcomeBadge";
import type { LandingSession, OutcomeDecision, ReplyAnalysis, Scenario, SimEvent } from "@/lib/database.types";
import { ACTORS, CATEGORIES, LEVELS, OUTCOMES, REPLIES, eventTitle, formatDate, formatShort, levelLabel } from "@/lib/results";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { OutcomeReviewForm, ReplyReviewForm } from "../forms";

export const metadata: Metadata = { title: "Simulation" };

const NETWORK: Record<string, string> = {
  residential: "home network", corporate: "company network", datacenter: "data centre", security_vendor: "security vendor", unknown: "unknown network",
};

function sessionNote(ls: LandingSession | undefined) {
  if (!ls) return null;
  const parts = [
    ls.user_agent_family ?? "Unknown browser",
    NETWORK[ls.network_class ?? "unknown"],
    ls.js_executed ? "JavaScript ran" : "no JavaScript",
    ls.pointer_events > 0 ? `${ls.pointer_events} pointer movements` : "no pointer input",
  ];
  return parts.join(" · ");
}

function signalNote(e: SimEvent) {
  const sig = e.signals as Record<string, unknown>;
  const notes: string[] = [];
  if (typeof sig.seconds_after_send === "number") notes.push(`${sig.seconds_after_send}s after delivery`);
  if (typeof sig.network === "string") notes.push(NETWORK[sig.network] ?? sig.network);
  if (sig.fields === "synthetic") notes.push("practice fields only, nothing stored");
  return notes.join(" · ");
}

export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const supabase = await createClient();

  const { data: sim } = await supabase
    .from("simulations")
    .select("id, tenant_id, sent_at, scheduled_at, status, is_demo, employees(first_name, last_name, email), scenarios(*), outcomes(result, evidence_level, decided_at)")
    .eq("id", id)
    .eq("tenant_id", s.tenant.id)
    .maybeSingle();
  if (!sim) notFound();

  const [{ data: events }, { data: sessions }, { data: decisions }] = await Promise.all([
    supabase.from("events").select("*").eq("simulation_id", id).order("occurred_at"),
    supabase.from("landing_sessions").select("*").eq("simulation_id", id),
    supabase.from("outcome_decisions").select("*, profiles(full_name, email)").eq("simulation_id", id).order("decided_at", { ascending: false }),
  ]);
  const replyIds = (events ?? []).filter((e) => e.type === "reply").map((e) => e.id);
  const { data: replies } = replyIds.length
    ? await supabase.from("reply_analyses").select("*").in("event_id", replyIds)
    : { data: [] as ReplyAnalysis[] };

  const employee = sim.employees as unknown as { first_name: string; last_name: string; email: string } | null;
  const scenario = sim.scenarios as unknown as Scenario | null;
  const outcome = sim.outcomes as unknown as { result: keyof typeof OUTCOMES; evidence_level: number; decided_at: string } | null;
  const sessionById = new Map((sessions ?? []).map((ls) => [ls.id, ls]));
  const replyByEvent = new Map((replies ?? []).map((r) => [r.event_id, r]));
  const current = (decisions ?? [])[0] as (OutcomeDecision & { profiles: { full_name: string; email: string } | null }) | undefined;
  const evidence = new Set(current?.evidence_event_ids ?? []);
  const tz = s.tenant.timezone;

  const pendingReply = (replies ?? []).find((r) => r.reviewer_status !== "confirmed" && r.reviewer_status !== "overridden" && r.category === "risky_intent");
  const showOutcomeReview = s.isAdmin && outcome?.result === "suspected" && !pendingReply;

  return (
    <div className="page detail">
      <Link className="hx-link back-link" href="/activity">← All activity</Link>

      <Card className="section detail__head">
        <div>
          <span className="hx-eyebrow">{scenario ? CATEGORIES[scenario.category].label : "Simulation"}{sim.is_demo ? " · sample data" : ""}</span>
          <h2>{employee ? `${employee.first_name} ${employee.last_name}` : "Removed employee"}</h2>
          <p className="muted">{employee?.email} · {scenario?.title} · sent {sim.sent_at ? formatDate(sim.sent_at, tz, true) : "not yet"}</p>
        </div>
        <div className="detail__result">
          <OutcomeBadge result={outcome?.result} />
          <span className="hx-mono">{levelLabel(outcome?.evidence_level ?? 0)}</span>
        </div>
      </Card>

      {current && (
        <Alert tone={outcome?.result === "verified_risky" ? "danger" : outcome?.result === "suspected" ? "warning" : outcome?.result === "verified_safe" ? "success" : "info"} title="Why this result">
          {current.explanation}
          <span className="detail__rule"> Rule {current.rule_version}{current.decided_by ? `, reviewed by ${current.profiles?.full_name || current.profiles?.email || "an admin"}` : ""}, {formatDate(current.decided_at, tz, true)}.</span>
        </Alert>
      )}

      {pendingReply && s.isAdmin && (
        <Card className="section">
          <header><h2>Review this reply</h2><p className="muted">A reply only counts once a person has confirmed what it means. The result is then decided again from the evidence.</p></header>
          <blockquote className="reply-excerpt">{pendingReply.excerpt}</blockquote>
          <ReplyReviewForm analysis={pendingReply.id} current={pendingReply.category} />
        </Card>
      )}
      {showOutcomeReview && (
        <Card className="section">
          <header><h2>Review this result</h2><p className="muted">The action was completed, but we can&apos;t tell for sure that a person did it. Your decision is added to the history; the original stays visible.</p></header>
          <OutcomeReviewForm sim={sim.id} />
        </Card>
      )}

      <div className="split split--wide">
        <Card className="section">
          <header><h2>Evidence</h2><p className="muted">Everything we observed, in order. Highlighted events were used for the result.</p></header>
          {(events ?? []).length === 0 ? <p className="muted">Nothing observed yet.</p> : (
            <ol className="hx-timeline evidence">
              {(events ?? []).map((e) => {
                const actor = ACTORS[e.actor];
                const reply = replyByEvent.get(e.id);
                const kind = e.actor === "scanner" || e.actor === "automation" ? "scanner" : e.evidence_level >= 3 && evidence.has(e.id) ? "risk" : e.actor === "human_likely" ? "human" : undefined;
                const ls = e.session_id ? sessionById.get(e.session_id) : undefined;
                return (
                  <li key={e.id} className="hx-timeline__item" data-kind={kind} data-used={evidence.has(e.id) || undefined}>
                    <span className="hx-timeline__time">{formatShort(e.occurred_at, tz)}</span>
                    <span className="hx-timeline__node" />
                    <div className="hx-timeline__body">
                      <span className="hx-timeline__title">{eventTitle(e.type, e.action)}</span>
                      <span className="hx-timeline__meta">
                        <span className="hx-mono">L{e.evidence_level}</span>
                        <Badge tone={actor.tone}>{actor.label}</Badge>
                        {reply && <Badge tone={REPLIES[reply.reviewed_category ?? reply.category].tone}>{REPLIES[reply.reviewed_category ?? reply.category].label}</Badge>}
                        {reply && <span className="hx-mono">conf {Number(reply.confidence).toFixed(2)}</span>}
                        {(e.actor === "scanner" || e.actor === "automation") && <span>not counted</span>}
                      </span>
                      {(signalNote(e) || ls) && <span className="evidence__note">{[signalNote(e), sessionNote(ls)].filter(Boolean).join(" · ")}</span>}
                      {reply && (
                        <span className="evidence__note">
                          “{reply.excerpt}” · {reply.classifier_version}
                          {reply.marker_found ? " · test marker found" : ""}
                          {reply.reviewer_status === "confirmed" ? " · confirmed by a reviewer" : reply.reviewer_status === "overridden" ? " · corrected by a reviewer" : ""}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <div className="stack">
          <Card className="section">
            <header><h2>Decision history</h2><p className="muted">Every decision is kept. Nothing is overwritten.</p></header>
            <ol className="decisions">
              {(decisions ?? []).map((d) => {
                const who = (d as unknown as { profiles: { full_name: string; email: string } | null }).profiles;
                return (
                  <li key={d.id}>
                    <div className="decisions__top"><OutcomeBadge result={d.result} /><span className="hx-mono">L{d.evidence_level}</span></div>
                    <p>{d.explanation}</p>
                    <span className="muted">{d.decided_by ? (who?.full_name || who?.email || "Admin") : "Helvax rules"} · {d.rule_version} · {formatDate(d.decided_at, tz, true)}</span>
                  </li>
                );
              })}
            </ol>
          </Card>
          <Card className="section">
            <header><h2>Evidence levels</h2></header>
            <ul className="levels">
              {LEVELS.map((l) => (
                <li key={l.level} data-current={outcome?.evidence_level === l.level || undefined} data-counts={l.level >= 3 || undefined}>
                  <span className="hx-mono">L{l.level}</span><span><strong>{l.name}</strong><small>{l.help}</small></span>
                </li>
              ))}
            </ul>
            <p className="muted">Only L3 and L4 with credible signs of a person count as a failure.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
