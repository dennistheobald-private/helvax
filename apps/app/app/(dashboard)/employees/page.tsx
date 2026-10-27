import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@helvax/ui/react";
import { SampleDataBanner } from "@/components/SampleDataBanner";
import { hasSampleData } from "@/lib/data";
import type { EmployeeStats, EmployeeStatus } from "@/lib/database.types";
import { count } from "@/lib/results";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { removeDomain, removeEmployee, removeGroup, updateEmployee } from "./actions";
import { AddDomainForm, AddEmployeeForm, AddGroupForm, CsvImport, VerifyDomainButton } from "./forms";
import { LANGUAGE_OPTIONS } from "@/lib/engine/practice-copy";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Employees" };

const PAGE = 50;
const STATUS: Record<EmployeeStatus, { label: string; tone: "success" | "warning" | "neutral" }> = {
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  left: { label: "Left", tone: "neutral" },
};

type Search = { q?: string; group?: string; status?: string; page?: string };

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const s = await requireSession();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim().slice(0, 80);
  const supabase = await createClient();

  let query = supabase
    .from("employees")
    .select("id, first_name, last_name, email, phone, status, group_id, locale, is_demo", { count: "exact" })
    .eq("tenant_id", s.tenant.id)
    .order("last_name")
    .order("first_name")
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) {
    const term = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`);
  }
  if (sp.group === "none") query = query.is("group_id", null);
  else if (sp.group) query = query.eq("group_id", sp.group);
  if (sp.status && sp.status in STATUS) query = query.eq("status", sp.status as EmployeeStatus);

  const [{ data: employees, count: total }, { data: groups }, { data: domains }, sample] = await Promise.all([
    query,
    supabase.from("employee_groups").select("id, name").eq("tenant_id", s.tenant.id).order("name"),
    supabase.from("company_domains").select("id, domain, verification_token, verified_at, is_demo").eq("tenant_id", s.tenant.id).order("created_at"),
    hasSampleData(s.tenant.id),
  ]);
  const ids = (employees ?? []).map((e) => e.id);
  const { data: stats } = ids.length
    ? await supabase.rpc("employee_stats", { t: s.tenant.id }).in("employee_id", ids)
    : { data: [] as EmployeeStats[] };
  const statsById = new Map((stats ?? []).map((r) => [r.employee_id, r]));
  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const pages = Math.max(1, Math.ceil((total ?? 0) / PAGE));
  const filtered = Boolean(q || sp.group || sp.status);
  const href = (p: number) => `/employees?${new URLSearchParams({ ...(q && { q }), ...(sp.group && { group: sp.group }), ...(sp.status && { status: sp.status }), page: String(p) })}`;
  const realDomains = (domains ?? []).filter((d) => !d.is_demo);

  return (
    <div className="page">
      {sample && <SampleDataBanner canClear={s.isAdmin} />}

      <Card className="section section--flush">
        <form className="hx-toolbar" role="search">
          <div className="toolbar-fields">
            <label className="hx-visually-hidden" htmlFor="q">Search employees</label>
            <input id="q" name="q" type="search" className="hx-input" placeholder="Search name or email" defaultValue={q} />
            <label className="hx-visually-hidden" htmlFor="group">Group</label>
            <select id="group" name="group" className="hx-select" defaultValue={sp.group ?? ""}>
              <option value="">All groups</option>
              <option value="none">No group</option>
              {(groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <label className="hx-visually-hidden" htmlFor="status">Status</label>
            <select id="status" name="status" className="hx-select" defaultValue={sp.status ?? ""}>
              <option value="">Any status</option>
              {(Object.keys(STATUS) as EmployeeStatus[]).map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
            </select>
            <button type="submit" className="hx-btn hx-btn--outline hx-btn--sm">Filter</button>
            {filtered && <Link className="hx-link" href="/employees">Clear</Link>}
          </div>
          <span className="muted">{count(total ?? 0)} {total === 1 ? "person" : "people"}</span>
        </form>

        {(employees ?? []).length === 0 ? (
          <EmptyState icon="users" title={filtered ? "Nobody matches these filters" : "No employees yet"}>
            {filtered ? "Try another search or clear the filters." : s.isAdmin ? "Add people one by one or import a CSV file below." : "An admin can add employees."}
          </EmptyState>
        ) : (
          <div className="hx-table-wrap table-plain">
            <table className="hx-table">
              <caption className="hx-visually-hidden">Employees</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th><th scope="col">Group</th><th scope="col">Status</th>
                  <th scope="col" className="is-num">Simulations</th><th scope="col" className="is-num">Verified risky</th><th scope="col" className="is-num">Verified safe</th>
                  {s.isAdmin && <th scope="col"><span className="hx-visually-hidden">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {(employees ?? []).map((e) => {
                  const st = statsById.get(e.id);
                  return (
                    <tr key={e.id}>
                      <td>
                        <div className="hx-table__person">
                          <span className="hx-avatar" aria-hidden="true">{e.first_name[0]}{e.last_name[0]}</span>
                          <span>{e.first_name} {e.last_name}<small>{e.email}{e.phone && ` · ${formatPhone(e.phone)}`}</small></span>
                        </div>
                      </td>
                      <td>{e.group_id ? groupName.get(e.group_id) : <span className="muted">–</span>}</td>
                      <td><Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge></td>
                      <td className="is-num">{st?.simulations ?? 0}</td>
                      <td className="is-num">{st?.verified_risky ?? 0}</td>
                      <td className="is-num">{st?.verified_safe ?? 0}</td>
                      {s.isAdmin && (
                        <td className="cell-actions">
                          <details className="row-menu">
                            <summary className="hx-btn hx-btn--ghost hx-btn--sm">Edit</summary>
                            <div className="row-menu__panel">
                              <form action={updateEmployee} className="row-menu__form">
                                <input type="hidden" name="id" value={e.id} />
                                <label className="hx-label" htmlFor={`g-${e.id}`}>Group</label>
                                <select id={`g-${e.id}`} name="group_id" className="hx-select" defaultValue={e.group_id ?? ""}>
                                  <option value="">No group</option>
                                  {(groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                                <label className="hx-label" htmlFor={`p-${e.id}`}>Mobile number</label>
                                <input id={`p-${e.id}`} name="phone" type="tel" className="hx-input" defaultValue={formatPhone(e.phone)} placeholder="+41 79 123 45 67" />
                                <label className="hx-label" htmlFor={`l-${e.id}`}>Language</label>
                                <select id={`l-${e.id}`} name="locale" className="hx-select" defaultValue={e.locale}>
                                  {LANGUAGE_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                                </select>
                                <label className="hx-label" htmlFor={`s-${e.id}`}>Status</label>
                                <select id={`s-${e.id}`} name="status" className="hx-select" defaultValue={e.status}>
                                  <option value="active">Active: receives simulations</option>
                                  <option value="paused">Paused: e.g. on leave</option>
                                  <option value="left">Left the company</option>
                                </select>
                                <button type="submit" className="hx-btn hx-btn--sm">Save</button>
                              </form>
                              <form action={removeEmployee}>
                                <input type="hidden" name="id" value={e.id} />
                                <button type="submit" className="hx-btn hx-btn--ghost hx-btn--sm danger-text">Delete with all results</button>
                              </form>
                            </div>
                          </details>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <nav className="pager" aria-label="Pages">
            {page > 1 ? <Link className="hx-btn hx-btn--outline hx-btn--sm" href={href(page - 1)}>Previous</Link> : <span />}
            <span className="muted">Page {page} of {pages}</span>
            {page < pages ? <Link className="hx-btn hx-btn--outline hx-btn--sm" href={href(page + 1)}>Next</Link> : <span />}
          </nav>
        )}
      </Card>

      {s.isAdmin && (
        <div className="split">
          <Card className="section">
            <header><h2>Add one person</h2><p className="muted">First name, last name and work email. Only addresses on your company domains.</p></header>
            <AddEmployeeForm groups={groups ?? []} domains={realDomains.map((d) => d.domain)} defaultLocale={s.tenant.locale} />
          </Card>
          <Card className="section">
            <header><h2>Import a CSV file</h2><p className="muted">We check every row first and show you what will change. Existing people are matched by email.</p></header>
            <CsvImport />
          </Card>
        </div>
      )}

      <div className="split">
        <Card className="section">
          <header><h2>Groups</h2><p className="muted">Results and reports are broken down by group, such as a department.</p></header>
          {(groups ?? []).length === 0 ? <p className="muted">No groups yet.</p> : (
            <ul className="chip-list">
              {(groups ?? []).map((g) => (
                <li key={g.id}>
                  <Link href={`/employees?group=${g.id}`}>{g.name}</Link>
                  {s.isAdmin && (
                    <form action={removeGroup}><input type="hidden" name="id" value={g.id} /><button type="submit" className="chip-list__x" aria-label={`Delete group ${g.name}`}>×</button></form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {s.isAdmin && <AddGroupForm />}
        </Card>

        <Card className="section">
          <header><h2>Company domains</h2><p className="muted">Employees can only be added on these domains. Simulations are only ever sent to a verified domain.</p></header>
          <ul className="domains">
            {(domains ?? []).map((d) => (
              <li key={d.id}>
                <div className="domains__row">
                  <strong>{d.domain}</strong>
                  {d.is_demo ? <Badge tone="outline">Sample</Badge> : d.verified_at ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Not verified</Badge>}
                  {s.isAdmin && !d.is_demo && (
                    <form action={removeDomain} className="domains__remove"><input type="hidden" name="id" value={d.id} /><button type="submit" className="hx-btn hx-btn--ghost hx-btn--sm" title="Only possible while no employees use it">Remove</button></form>
                  )}
                </div>
                {!d.verified_at && !d.is_demo && s.isAdmin && (
                  <div className="domains__dns">
                    <p className="muted">Add this TXT record at your DNS provider to prove the domain is yours:</p>
                    <dl className="dns-record">
                      <div><dt>Name</dt><dd className="hx-mono">_helvax.{d.domain}</dd></div>
                      <div><dt>Type</dt><dd className="hx-mono">TXT</dd></div>
                      <div><dt>Value</dt><dd className="hx-mono">helvax-verify={d.verification_token}</dd></div>
                    </dl>
                    <VerifyDomainButton id={d.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          {s.isAdmin && <AddDomainForm />}
        </Card>
      </div>
    </div>
  );
}
