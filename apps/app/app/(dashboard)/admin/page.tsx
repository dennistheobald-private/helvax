import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, Badge, Card } from "@helvax/ui/react";
import type { SendingBlocker } from "@/lib/database.types";
import { formatDate } from "@/lib/results";
import { auditLabel } from "@/lib/audit";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ApproveButton, PlatformSwitch } from "./forms";

export const metadata: Metadata = { title: "Helvax admin" };

const BLOCKERS: Record<SendingBlocker, string> = {
  platform_off: "Platform off",
  not_approved: "Not approved",
  awareness_not_confirmed: "Notice not confirmed",
  no_verified_domain: "No verified domain",
  no_scenarios: "No scenarios",
  no_eligible_employees: "No eligible employees",
  sample_data_loaded: "Sample data loaded",
};

export default async function AdminPage() {
  const s = await requireSession();
  // Only Helvax staff see that this page exists.
  if (!s.profile.is_superadmin) notFound();
  if (s.aal !== "aal2") {
    return <div className="page"><Alert tone="warning" title="MFA required">Set up two-factor authentication in Settings to use the admin console.</Alert></div>;
  }

  const supabase = await createClient();
  const [{ data: platform }, { data: tenants, error }, { data: log }] = await Promise.all([
    supabase.from("platform_settings").select("*").single(),
    supabase.rpc("admin_tenants"),
    supabase.rpc("admin_platform_log", { max_rows: 10 }),
  ]);
  const on = Boolean(platform?.sending_enabled);
  const tz = s.tenant.timezone;

  return (
    <div className="page">
      <Card className="section admin-platform" data-on={on || undefined}>
        <header>
          <span className="hx-eyebrow">Platform</span>
          <h2>Real sending is {on ? "on" : "off"}</h2>
          <p className="muted">
            {on
              ? "Approved companies that turned sending on receive simulations. Stopping takes effect immediately; queued messages are held."
              : "No simulation email leaves Helvax, whatever each company has set. Planning and results keep working."}
          </p>
        </header>
        <PlatformSwitch enabled={on} />
        {(log ?? []).length > 0 && (
          <ul className="admin-log">
            {(log ?? []).map((l, i) => <li key={i}><span className="hx-mono">{formatDate(l.created_at, tz, true)}</span> {auditLabel(l.action)} · {l.actor}</li>)}
          </ul>
        )}
      </Card>

      <Card className="section">
        <header><h2>Companies</h2><p className="muted">Approve a company after its safety review. Withdrawing approval stops its sending and cancels what was planned.</p></header>
        {error ? <p className="form-status form-status--error">{error.message}</p> : (
          <div className="hx-table-wrap">
            <table className="hx-table">
              <thead>
                <tr><th scope="col">Company</th><th scope="col">Owners</th><th scope="col" className="is-num">Employees</th><th scope="col">Domains</th><th scope="col">Still missing</th><th scope="col" className="is-num">Sent 30d</th><th scope="col">Approval</th></tr>
              </thead>
              <tbody>
                {(tenants ?? []).map((t) => {
                  const missing = t.blockers.filter((b) => b !== "platform_off" && b !== "not_approved") as SendingBlocker[];
                  return (
                    <tr key={t.id}>
                      <td><strong>{t.name}</strong><br /><span className="muted">{t.status} · since {formatDate(t.created_at, tz)}{t.sending_enabled ? " · sending on" : ""}</span></td>
                      <td>{t.owners.join(", ") || "–"}</td>
                      <td className="is-num">{t.employees}</td>
                      <td>{t.verified_domains.join(", ") || "–"}</td>
                      <td>
                        {missing.length === 0 ? <Badge tone="success">Ready</Badge> : (
                          <ul className="hx-tags">{missing.map((b) => <li key={b}><Badge tone="warning">{BLOCKERS[b]}</Badge></li>)}</ul>
                        )}
                      </td>
                      <td className="is-num">{t.sent_30d}</td>
                      <td>
                        {t.approved_at && <span className="muted admin-approved">Approved {formatDate(t.approved_at, tz)}</span>}
                        <ApproveButton tenant={t.id} approved={Boolean(t.approved_at)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
