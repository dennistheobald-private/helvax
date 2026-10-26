import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@helvax/ui/react";
import { auditDetail, auditLabel } from "@/lib/audit";
import { formatDate } from "@/lib/results";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit log" };

const PAGE = 100;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const s = await requireSession();
  if (!s.isAdmin) redirect("/overview");
  const { before } = await searchParams;
  const supabase = await createClient();

  let q = supabase.from("audit_logs").select("*").eq("tenant_id", s.tenant.id).order("id", { ascending: false }).limit(PAGE);
  if (before && /^\d+$/.test(before)) q = q.lt("id", Number(before));
  const { data: logs } = await q;
  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: people } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
    : { data: [] as { id: string; full_name: string; email: string }[] };
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name || p.email]));
  const last = logs?.at(-1);

  return (
    <div className="page">
      <Card className="section">
        <header>
          <h2>Audit log</h2>
          <p className="muted">Every change to your team, employees, sending and results, with who made it. Entries can&apos;t be edited or deleted.</p>
        </header>
        {(logs ?? []).length === 0 ? <p className="muted">Nothing recorded yet.</p> : (
          <div className="hx-table-wrap">
            <table className="hx-table">
              <thead><tr><th scope="col">When</th><th scope="col">What</th><th scope="col">Who</th><th scope="col">Details</th></tr></thead>
              <tbody>
                {(logs ?? []).map((l) => (
                  <tr key={l.id}>
                    <td className="hx-mono audit__when">{formatDate(l.created_at, s.tenant.timezone, true)}</td>
                    <td>{auditLabel(l.action)}</td>
                    {/* Actors outside the company (Helvax staff, the engine) aren't visible by name. */}
                    <td>{l.actor_id ? (name.get(l.actor_id) ?? "Helvax") : "Helvax"}</td>
                    <td className="muted">{auditDetail(l.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {logs?.length === PAGE && last && <Link className="hx-link" href={`/audit?before=${last.id}`}>Older entries →</Link>}
      </Card>
    </div>
  );
}
