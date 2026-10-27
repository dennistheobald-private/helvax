"use client";

import { useActionState, useState } from "react";
import { Alert, Badge, Button, Field, Icon, type BadgeTone } from "@helvax/ui/react";
import {
  addDomain, addEmployee, addGroup, previewImport, verifyDomain,
  type FormState, type ImportPreview, type ImportRow, type RowVerdict,
} from "./actions";
import { LANGUAGE_OPTIONS } from "@/lib/engine/practice-copy";

function Status({ state }: { state: FormState }) {
  if (state.error) return <p className="form-status form-status--error" role="alert">{state.error}</p>;
  if (state.ok) return <p className="form-status" role="status">{state.ok}</p>;
  return null;
}

type Group = { id: string; name: string };

export function AddEmployeeForm({ groups, domains, defaultLocale }: { groups: Group[]; domains: string[]; defaultLocale: string }) {
  const [state, action, pending] = useActionState(addEmployee, {});
  return (
    <form action={action} className="employee-form" key={state.ok}>
      <Field label="First name" name="first_name" required autoComplete="off" />
      <Field label="Last name" name="last_name" required autoComplete="off" />
      <Field label="Work email" name="email" type="email" required autoComplete="off" placeholder={`name@${domains[0] ?? "company.ch"}`} />
      <Field label="Mobile number (optional)" name="phone" type="tel" autoComplete="off" placeholder="+41 79 123 45 67" help="For voice simulations later. International format." />
      <div className="hx-field">
        <label className="hx-label" htmlFor="new-group">Group</label>
        <select id="new-group" name="group_id" className="hx-select" defaultValue="">
          <option value="">No group</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div className="hx-field">
        <label className="hx-label" htmlFor="new-locale">Language of simulations</label>
        <select id="new-locale" name="locale" className="hx-select" defaultValue={defaultLocale}>
          {LANGUAGE_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>
      <div className="settings-form__actions"><Button type="submit" loading={pending}><Icon name="plus" size="sm" />Add employee</Button><Status state={state} /></div>
    </form>
  );
}

// CSV -------------------------------------------------------------------------------

const HEADERS: Record<string, keyof ImportRow> = {
  firstname: "first_name", first: "first_name", givenname: "first_name", vorname: "first_name", voornaam: "first_name",
  lastname: "last_name", last: "last_name", surname: "last_name", familyname: "last_name", nachname: "last_name", achternaam: "last_name",
  email: "email", emailaddress: "email", mail: "email", workemail: "email",
  group: "group", department: "group", team: "group", abteilung: "group", gruppe: "group", afdeling: "group",
  language: "language", locale: "language", lang: "language", sprache: "language", taal: "language",
  phone: "phone", mobile: "phone", mobilephone: "phone", phonenumber: "phone", telefon: "phone", handy: "phone", mobil: "phone", telefoon: "phone", mobiel: "phone",
};

/** Minimal CSV reader: quoted fields, "," or ";" separators (Excel in Switzerland uses ";"). */
function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

function toRows(text: string): { rows?: ImportRow[]; error?: string } {
  const [header, ...body] = parseCsv(text);
  if (!header) return { error: "The file is empty." };
  const cols = header.map((h) => HEADERS[h.toLowerCase().replace(/[^a-z]/g, "")]);
  for (const need of ["first_name", "last_name", "email"] as const) {
    if (!cols.includes(need)) return { error: "The first row needs the columns first_name, last_name and email (group, language and phone are optional)." };
  }
  return {
    rows: body.map((cells) => {
      const r: ImportRow = { first_name: "", last_name: "", email: "", group: "", language: "", phone: "" };
      // The server normalises the language ("Deutsch" → "de").
      cols.forEach((k, i) => { if (k) (r as unknown as Record<string, string>)[k] = (cells[i] ?? "").trim(); });
      return r;
    }),
  };
}

const VERDICTS: Record<RowVerdict, { label: string; tone: BadgeTone }> = {
  new: { label: "New", tone: "success" },
  update: { label: "Update", tone: "info" },
  unchanged: { label: "Unchanged", tone: "neutral" },
  invalid_email: { label: "Invalid email", tone: "danger" },
  invalid_phone: { label: "Phone not in +41… format", tone: "danger" },
  missing_name: { label: "Name missing", tone: "danger" },
  wrong_domain: { label: "Not a company domain", tone: "danger" },
  duplicate: { label: "Duplicate in file", tone: "warning" },
};

export function CsvImport() {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [readError, setReadError] = useState("");
  const [version, setVersion] = useState(0);
  // `v` ties a dry-run result to the file it was made for.
  const [state, action, pending] = useActionState<ImportPreview & { v?: number }, FormData>(async (prev, form) => {
    const next = await previewImport(prev, form);
    if (next.done) setRows(null);
    return { ...next, v: Number(form.get("v")) };
  }, {});

  async function onFile(file: File | undefined) {
    setReadError("");
    setRows(null);
    setVersion((v) => v + 1);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setReadError("The file is larger than 5 MB.");
    setFileName(file.name);
    const parsed = toRows(await file.text());
    if (parsed.error) return setReadError(parsed.error);
    setRows(parsed.rows!);
  }

  const preview = rows && state.rows && state.v === version ? state.rows : null;
  const counts = preview?.reduce<Partial<Record<RowVerdict, number>>>((acc, r) => ({ ...acc, [r.verdict]: (acc[r.verdict] ?? 0) + 1 }), {});
  const changes = (counts?.new ?? 0) + (counts?.update ?? 0);
  const problems = preview?.filter((r) => VERDICTS[r.verdict].tone === "danger" || r.verdict === "duplicate") ?? [];

  return (
    <div className="csv-import">
      <label className="hx-dropzone">
        <span className="hx-dropzone__icon"><Icon name="upload" /></span>
        <span className="hx-dropzone__title">{fileName && rows ? fileName : "Choose a CSV file"}</span>
        <span className="hx-dropzone__hint">Columns: first_name, last_name, email, plus optional group, language (en, de, nl) and phone (+41…) · up to 5,000 people</span>
        <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.currentTarget.files?.[0])} />
      </label>
      {readError && <p className="form-status form-status--error" role="alert">{readError}</p>}

      {rows && (
        <form action={action} className="csv-import__actions">
          <input type="hidden" name="rows" value={JSON.stringify(rows)} />
          <input type="hidden" name="v" value={version} />
          {!preview ? (
            <>
              <Button type="submit" loading={pending} variant="outline">Check {rows.length.toLocaleString("en-GB")} rows</Button>
              <span className="muted">Nothing changes until you confirm.</span>
            </>
          ) : (
            <>
              <input type="hidden" name="commit" value="1" />
              <Button type="submit" loading={pending} disabled={changes === 0}>Import {changes.toLocaleString("en-GB")} changes</Button>
              <span className="muted">Rows with problems are skipped.</span>
            </>
          )}
        </form>
      )}
      {state.error && state.v === version && <p className="form-status form-status--error" role="alert">{state.error}</p>}
      {state.done && (
        <Alert tone="success" title="Import finished">{state.done.added} added, {state.done.updated} updated.</Alert>
      )}

      {preview && counts && (
        <div className="csv-import__preview" aria-live="polite">
          <ul className="hx-tags">
            {(Object.keys(VERDICTS) as RowVerdict[]).filter((k) => counts[k]).map((k) => (
              <li key={k}><Badge tone={VERDICTS[k].tone}>{VERDICTS[k].label}: {counts[k]}</Badge></li>
            ))}
          </ul>
          {problems.length > 0 && (
            <div className="hx-table-wrap">
              <table className="hx-table">
                <caption className="hx-visually-hidden">Rows that will be skipped</caption>
                <thead><tr><th scope="col">Line</th><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Problem</th></tr></thead>
                <tbody>
                  {problems.slice(0, 50).map((p) => (
                    <tr key={p.line}><td className="is-num">{p.line}</td><td>{p.row.first_name} {p.row.last_name}</td><td>{p.row.email || "–"}</td><td><Badge tone={VERDICTS[p.verdict].tone}>{VERDICTS[p.verdict].label}</Badge></td></tr>
                  ))}
                </tbody>
              </table>
              {problems.length > 50 && <p className="muted">and {problems.length - 50} more.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Groups and domains -----------------------------------------------------------------------

export function AddGroupForm() {
  const [state, action, pending] = useActionState(addGroup, {});
  return (
    <form action={action} className="inline-add" key={state.ok}>
      <Field label="New group" name="name" placeholder="Finance" required />
      <Button type="submit" variant="outline" loading={pending}>Add group</Button>
      <Status state={state} />
    </form>
  );
}

export function AddDomainForm() {
  const [state, action, pending] = useActionState(addDomain, {});
  return (
    <form action={action} className="inline-add" key={state.ok}>
      <Field label="Add a domain" name="domain" placeholder="company.ch" required />
      <Button type="submit" variant="outline" loading={pending}>Add domain</Button>
      <Status state={state} />
    </form>
  );
}

export function VerifyDomainButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(verifyDomain, {});
  return (
    <form action={action} className="verify-domain">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" loading={pending}>Check DNS record</Button>
      <Status state={state} />
    </form>
  );
}
