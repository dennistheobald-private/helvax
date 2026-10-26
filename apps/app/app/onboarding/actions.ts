"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { allow } from "@/lib/ratelimit";
import { TENANT_COOKIE } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function createCompany(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const name = String(form.get("name") ?? "").trim();
  const timezone = String(form.get("timezone") ?? "Europe/Zurich");
  if (name.length < 2) return { error: "Enter your company name." };
  if (!Intl.supportedValuesOf("timeZone").includes(timezone)) return { error: "Choose a time zone." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  if (!(await allow("create-tenant", auth.user.id, 5, 86400))) return { error: "Too many companies created today. Try again tomorrow." };
  const { data, error } = await supabase.rpc("create_tenant", { tenant_name: name, tenant_timezone: timezone });
  if (error || !data) {
    console.error("create_tenant failed", error?.code, error?.message);
    return { error: "We couldn't create the company. Try again." };
  }

  (await cookies()).set(TENANT_COOKIE, data, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  redirect("/overview");
}
