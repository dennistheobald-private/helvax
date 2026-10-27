import type { Metadata } from "next";
import { Badge, Card } from "@helvax/ui/react";
import type { MemberRole } from "@/lib/database.types";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { changeRole, removeMember, revokeInvitation } from "./actions";
import { formatPhone } from "@/lib/phone";
import { CompanyForm, InviteForm, LogoForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Settings" };

const roleLabel: Record<MemberRole, string> = { owner: "Owner", admin: "Admin", viewer: "Viewer" };

export default async function SettingsPage() {
  const s = await requireSession();
  const supabase = await createClient();
  const [{ data: members }, { data: invites }, { count: verifiedDomains }] = await Promise.all([
    supabase.from("memberships").select("user_id, role, created_at, profiles(full_name, email)").eq("tenant_id", s.tenant.id).order("created_at"),
    s.isAdmin
      ? supabase.from("invitations").select("id, email, role, expires_at").eq("tenant_id", s.tenant.id).is("accepted_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; email: string; role: MemberRole; expires_at: string }[] }),
    supabase.from("company_domains").select("id", { count: "exact", head: true }).eq("tenant_id", s.tenant.id).eq("is_demo", false).not("verified_at", "is", null),
  ]);

  return (
    <div className="settings">
      <Card className="settings__section">
        <header><h2>Company</h2><p>Used in reports and for the sending schedule.</p></header>
        <CompanyForm name={s.tenant.name} timezone={s.tenant.timezone} disabled={!s.isAdmin} />
      </Card>

      <Card className="settings__section">
        <header>
          <h2>Logo</h2>
          <p>{verifiedDomains
            ? "Internal-style simulations, such as IT or document notices, show your logo so they look like your own mail."
            : "Verify a company domain under Employees first. Then internal-style simulations can show your logo."}</p>
        </header>
        <LogoForm logoUrl={s.tenant.logo_url} companyName={s.tenant.name} canSet={s.isAdmin && Boolean(verifiedDomains)} />
      </Card>

      <Card className="settings__section">
        <header><h2>Team</h2><p>Owners and admins manage the company. Viewers can read results and export reports.</p></header>
        <div className="hx-table-wrap">
          <table className="hx-table">
            <thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col"><span className="hx-visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              {(members ?? []).map((m) => {
                const p = m.profiles as unknown as { full_name: string; email: string } | null;
                const self = m.user_id === s.userId;
                const canEdit = s.isOwner && !self;
                const canRemove = !self && s.isAdmin && (m.role !== "owner" || s.isOwner);
                return (
                  <tr key={m.user_id}>
                    <td><strong>{p?.full_name || p?.email}</strong>{p?.full_name && <div className="muted">{p.email}</div>}{self && <Badge tone="outline">You</Badge>}</td>
                    <td>
                      {canEdit ? (
                        <form action={changeRole} className="inline-form">
                          <input type="hidden" name="user" value={m.user_id} />
                          <label className="hx-visually-hidden" htmlFor={`role-${m.user_id}`}>Role</label>
                          <select id={`role-${m.user_id}`} name="role" className="hx-select" defaultValue={m.role}>
                            <option value="owner">Owner</option><option value="admin">Admin</option><option value="viewer">Viewer</option>
                          </select>
                          <button type="submit" className="hx-btn hx-btn--outline hx-btn--sm">Change</button>
                        </form>
                      ) : roleLabel[m.role]}
                    </td>
                    <td className="cell-actions">
                      {canRemove && (
                        <form action={removeMember}>
                          <input type="hidden" name="user" value={m.user_id} />
                          <button type="submit" className="hx-btn hx-btn--ghost hx-btn--sm">Remove</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {s.isAdmin && (
          <>
            <h3 className="settings__sub">Invite someone</h3>
            <InviteForm canInviteAdmins={s.isOwner} />
            {(invites ?? []).length > 0 && (
              <>
                <h3 className="settings__sub">Pending invitations</h3>
                <ul className="invites">
                  {(invites ?? []).map((i) => (
                    <li key={i.id}>
                      <span><strong>{i.email}</strong> · {roleLabel[i.role]} · expires {new Date(i.expires_at).toLocaleDateString("en-GB", { timeZone: s.tenant.timezone })}</span>
                      <form action={revokeInvitation}><input type="hidden" name="id" value={i.id} /><button type="submit" className="hx-btn hx-btn--ghost hx-btn--sm">Revoke</button></form>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Card>

      <Card className="settings__section">
        <header><h2>Your profile</h2></header>
        <ProfileForm fullName={s.profile.full_name} email={s.email} phone={formatPhone(s.profile.phone)} />
      </Card>
    </div>
  );
}
