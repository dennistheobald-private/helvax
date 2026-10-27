"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { MemberRole } from "@/lib/database.types";
import { emailLayout, p, strong } from "@helvax/ui/email";
import { escapeHtml, sendEmail } from "@/lib/email";
import { normalizePhone } from "@/lib/phone";
import { allow } from "@/lib/ratelimit";
import { requireSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/urls";

export interface FormState {
  ok?: string;
  error?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateCompany(_prev: FormState, form: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!s.isAdmin) return { error: "Only admins can change company settings." };
  const name = String(form.get("name") ?? "").trim();
  const timezone = String(form.get("timezone") ?? "");
  if (name.length < 2) return { error: "Enter the company name." };
  if (!Intl.supportedValuesOf("timeZone").includes(timezone)) return { error: "Choose a valid time zone." };

  const supabase = await createClient();
  const { error } = await supabase.from("tenants").update({ name, timezone }).eq("id", s.tenant.id);
  if (error) return { error: "Couldn't save. Try again." };
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const s = await requireSession();
  const fullName = String(form.get("full_name") ?? "").trim().slice(0, 120);
  const phone = normalizePhone(form.get("phone"));
  if (phone === null) return { error: "Enter the mobile number in international format, such as +41 79 123 45 67." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("id", s.userId);
  if (error) return { error: "Couldn't save. Try again." };
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

export async function inviteMember(_prev: FormState, form: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!s.isAdmin) return { error: "Only admins can invite people." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "viewer") as MemberRole;
  if (!EMAIL.test(email)) return { error: "Enter a valid email address." };
  if (role !== "viewer" && role !== "admin") return { error: "Choose a role." };
  if (role === "admin" && !s.isOwner) return { error: "Only owners can invite admins." };
  const phone = normalizePhone(form.get("phone"));
  if (phone === null) return { error: "Enter the mobile number in international format, such as +41 79 123 45 67." };
  if (!(await allow("invite", s.tenant.id, 50, 86400))) return { error: "Too many invitations today. Try again tomorrow." };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = await createClient();
  // Replace an earlier open invitation to the same address.
  await supabase.from("invitations").delete().eq("tenant_id", s.tenant.id).eq("email", email).is("accepted_at", null);
  const { error } = await supabase.from("invitations").insert({ tenant_id: s.tenant.id, email, role, token_hash: tokenHash, invited_by: s.userId, phone: phone || null });
  if (error) return { error: "Couldn't create the invitation. Try again." };

  const link = `${await appOrigin()}/invite/${token}`;
  const inviter = s.profile.full_name || s.email;
  const company = s.tenant.name;
  const sent = await sendEmail({
    to: email,
    subject: `${inviter} invited you to ${company} on Helvax`,
    text: `${inviter} invited you to join ${company} on Helvax as ${role}.\n\nAccept the invitation: ${link}\n\nThe link works for 7 days.`,
    html: emailLayout({
      preheader: `Join ${escapeHtml(company)} on Helvax.`,
      title: `Join ${escapeHtml(company)} on Helvax`,
      body: p(`${strong(escapeHtml(inviter))} invited you to join ${strong(escapeHtml(company))} on Helvax as ${role}.`),
      button: { label: "Accept the invitation", url: link },
      note: "The link works for 7 days. If you weren't expecting this, you can ignore this email.",
    }),
    idempotencyKey: `invite/${tokenHash}`,
  });
  revalidatePath("/settings");
  return sent ? { ok: `Invitation sent to ${email}.` } : { error: `Invitation created, but the email couldn't be sent. Check the Resend setup.` };
}

export async function revokeInvitation(form: FormData) {
  const s = await requireSession();
  const supabase = await createClient();
  await supabase.from("invitations").delete().eq("id", String(form.get("id"))).eq("tenant_id", s.tenant.id);
  revalidatePath("/settings");
}

export async function changeRole(form: FormData) {
  const s = await requireSession();
  const role = String(form.get("role")) as MemberRole;
  if (!["owner", "admin", "viewer"].includes(role)) return;
  const supabase = await createClient();
  await supabase.from("memberships").update({ role }).eq("tenant_id", s.tenant.id).eq("user_id", String(form.get("user")));
  revalidatePath("/settings");
}

export async function removeMember(form: FormData) {
  const s = await requireSession();
  const supabase = await createClient();
  await supabase.from("memberships").delete().eq("tenant_id", s.tenant.id).eq("user_id", String(form.get("user")));
  revalidatePath("/settings");
}

// Company logo -------------------------------------------------------------------------

const LOGO_BUCKET = "branding";
const LOGO_MAX = 512 * 1024;

/** Detects the image type from its first bytes, so a renamed file can't pass as an image. */
function imageType(b: Uint8Array): { ext: string; mime: string } | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

/** The storage path of a logo we host, or null for any other URL. */
function logoPath(url: string | null, tenantId: string) {
  const marker = `/storage/v1/object/public/${LOGO_BUCKET}/`;
  const at = url?.indexOf(marker) ?? -1;
  const path = at >= 0 ? url!.slice(at + marker.length) : null;
  return path?.startsWith(`${tenantId}/`) ? path : null;
}

export async function uploadLogo(_prev: FormState, form: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!s.isAdmin) return { error: "Only admins can change the logo." };
  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image file." };
  if (file.size > LOGO_MAX) return { error: "The logo must be 512 KB or smaller." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = imageType(bytes);
  if (!type) return { error: "Use a PNG, JPG or WebP image." };

  const supabase = await createClient();
  const { count } = await supabase.from("company_domains").select("id", { count: "exact", head: true })
    .eq("tenant_id", s.tenant.id).eq("is_demo", false).not("verified_at", "is", null);
  if (!count) return { error: "Verify a company domain before adding a logo." };
  if (!(await allow("logo", s.tenant.id, 20, 86400))) return { error: "Too many uploads today. Try again tomorrow." };

  const admin = createAdminClient();
  if (!admin) return { error: "Logo uploads aren't set up yet." };
  const path = `${s.tenant.id}/${randomBytes(12).toString("hex")}.${type.ext}`;
  const { error: upErr } = await admin.storage.from(LOGO_BUCKET).upload(path, bytes, { contentType: type.mime, cacheControl: "31536000", upsert: false });
  if (upErr) {
    console.error("Logo upload failed", upErr.message);
    return { error: "Couldn't upload the logo. Try again." };
  }
  const url = admin.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.rpc("set_company_logo", { t: s.tenant.id, url });
  if (error) {
    await admin.storage.from(LOGO_BUCKET).remove([path]);
    return { error: error.code === "23514" || error.code === "42501" ? error.message : "Couldn't save the logo. Try again." };
  }
  const old = logoPath(s.tenant.logo_url, s.tenant.id);
  if (old) await admin.storage.from(LOGO_BUCKET).remove([old]);
  revalidatePath("/settings");
  return { ok: "Logo saved." };
}

export async function removeLogo(_prev: FormState): Promise<FormState> {
  const s = await requireSession();
  if (!s.isAdmin) return { error: "Only admins can change the logo." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_company_logo", { t: s.tenant.id, url: null });
  if (error) return { error: "Couldn't remove the logo. Try again." };
  const old = logoPath(s.tenant.logo_url, s.tenant.id);
  if (old) await createAdminClient()?.storage.from(LOGO_BUCKET).remove([old]);
  revalidatePath("/settings");
  return { ok: "Logo removed." };
}
