"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { MemberRole } from "@/lib/database.types";
import { emailLayout, p, strong } from "@helvax/ui/email";
import { escapeHtml, sendEmail } from "@/lib/email";
import { allow } from "@/lib/ratelimit";
import { requireSession } from "@/lib/session";
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
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", s.userId);
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
  if (!(await allow("invite", s.tenant.id, 50, 86400))) return { error: "Too many invitations today. Try again tomorrow." };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = await createClient();
  // Replace an earlier open invitation to the same address.
  await supabase.from("invitations").delete().eq("tenant_id", s.tenant.id).eq("email", email).is("accepted_at", null);
  const { error } = await supabase.from("invitations").insert({ tenant_id: s.tenant.id, email, role, token_hash: tokenHash, invited_by: s.userId });
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
