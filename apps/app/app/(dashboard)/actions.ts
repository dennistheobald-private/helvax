"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { TENANT_COOKIE, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function switchTenant(form: FormData) {
  const id = String(form.get("tenant") ?? "");
  const { tenants } = await requireSession();
  if (tenants.some((t) => t.id === id)) {
    (await cookies()).set(TENANT_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  }
  redirect("/overview");
}

export async function loadSampleData() {
  const s = await requireSession();
  if (!s.isAdmin) return;
  const supabase = await createClient();
  await supabase.rpc("load_sample_data", { t: s.tenant.id });
  revalidatePath("/", "layout");
}

export async function clearSampleData() {
  const s = await requireSession();
  if (!s.isAdmin) return;
  const supabase = await createClient();
  await supabase.rpc("clear_sample_data", { t: s.tenant.id });
  revalidatePath("/", "layout");
}
