"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TENANT_COOKIE, requireSession } from "@/lib/session";

export async function switchTenant(form: FormData) {
  const id = String(form.get("tenant") ?? "");
  const { tenants } = await requireSession();
  if (tenants.some((t) => t.id === id)) {
    (await cookies()).set(TENANT_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  }
  redirect("/overview");
}
