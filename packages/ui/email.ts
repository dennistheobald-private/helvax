// Branded HTML email layout shared by every Helvax email (app, website and the
// Supabase auth templates built by scripts/build-email-templates.mts).
// Email clients ignore <style> blocks and SVG, so everything is inline styles on
// tables, and the logo is a PNG served from helvax.ch.
// Never use this for simulation emails: those must not look like Helvax.

export const LOGO_URL = "https://helvax.ch/email/helvax-logo.png";

const C = {
  brandFill: "#CF4818",
  brandText: "#B4400F",
  brandSoft: "#FFF0E8",
  ink: "#17191D",
  muted: "#444850",
  subtle: "#6B6F78",
  warm: "#F7F6F4",
  border: "#E6E5E1",
};
const SANS = "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const DISPLAY = "'Plus Jakarta Sans',Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace";

export interface EmailParts {
  /** Hidden preview line shown next to the subject in the inbox. */
  preheader: string;
  title: string;
  /** Trusted HTML: escape any user-supplied values before passing them in. */
  body: string;
  /** One-time code, shown large. */
  code?: string;
  button?: { label: string; url: string };
  /** Small grey note under the button, e.g. expiry or "ignore this email". */
  note?: string;
}

export const p = (html: string) => `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.muted}">${html}</p>`;

export const strong = (html: string) => `<strong style="color:${C.ink};font-weight:600">${html}</strong>`;

/** Label/value rows, e.g. report figures. Values are trusted HTML. */
export const facts = (rows: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid ${C.border};font-family:${SANS};font-size:14px;color:${C.subtle}">${k}</td><td align="right" style="padding:10px 0;border-bottom:1px solid ${C.border};font-family:${SANS};font-size:14px;font-weight:600;color:${C.ink}">${v}</td></tr>`,
    )
    .join("")}</table>`;

export function emailLayout({ preheader, title, body, code, button, note }: EmailParts): string {
  const codeBlock = code
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 24px"><tr><td style="background:${C.brandSoft};border-radius:12px;padding:16px 24px;font-family:${MONO};font-size:32px;font-weight:600;letter-spacing:8px;color:${C.ink}">${code}</td></tr></table>`
    : "";
  const buttonBlock = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 24px"><tr><td bgcolor="${C.brandFill}" style="border-radius:8px;background:${C.brandFill}"><a href="${button.url}" style="display:inline-block;padding:13px 22px;font-family:${SANS};font-size:16px;font-weight:500;line-height:1.2;color:#FFFFFF;text-decoration:none;border-radius:8px">${button.label}</a></td></tr></table>`
    : "";
  const noteBlock = note
    ? `<p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.55;color:${C.subtle}">${note}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.warm}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.warm}">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 8px 24px"><a href="https://helvax.ch" style="text-decoration:none"><img src="${LOGO_URL}" width="124" height="24" alt="helvax" style="display:block;border:0;outline:none;height:24px;width:124px;font-family:${DISPLAY};font-size:22px;font-weight:700;color:${C.ink}"></a></td></tr>
<tr><td style="background:#FFFFFF;border:1px solid ${C.border};border-radius:16px;padding:36px 32px">
<h1 style="margin:0 0 16px;font-family:${DISPLAY};font-size:24px;line-height:1.3;font-weight:700;color:${C.ink}">${title}</h1>
${body}
${codeBlock}${buttonBlock}${noteBlock}
</td></tr>
<tr><td style="padding:24px 8px 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.subtle}">
Helvax · Trust. Trained. Tested.<br>
&copy; 2026 Helvax. Made in Switzerland. · <a href="https://helvax.ch" style="color:${C.brandText};text-decoration:none">helvax.ch</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
}
