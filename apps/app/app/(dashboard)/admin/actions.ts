"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  ok?: string;
  error?: string;
}

async function superadmin() {
  const s = await requireSession();
  return s.profile.is_superadmin && s.aal === "aal2" ? s : null;
}

export async function setPlatformSending(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await superadmin())) return { error: "Only Helvax staff with MFA can change this." };
  const enabled = form.get("enabled") === "true";
  if (enabled && form.get("confirm") !== "SEND") return { error: "Type SEND to confirm." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_platform_sending", { enabled });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: enabled ? "Platform sending is on." : "Platform sending is off. Queued messages were put back." };
}

export async function approveTenant(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await superadmin())) return { error: "Only Helvax staff with MFA can change this." };
  const supabase = await createClient();
  const approved = form.get("approved") === "true";
  const { error } = await supabase.rpc("approve_tenant_sending", { t: String(form.get("tenant")), approved });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: approved ? "Approved." : "Approval withdrawn. Planned simulations were cancelled." };
}
