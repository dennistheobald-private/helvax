import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { MemberRole, Profile, Tenant } from "./database.types";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

export const TENANT_COOKIE = "hx_tenant";

export interface SessionContext {
  userId: string;
  email: string;
  aal: "aal1" | "aal2";
  profile: Profile;
  tenants: (Tenant & { role: MemberRole })[];
  tenant: Tenant & { role: MemberRole };
  isAdmin: boolean;
  isOwner: boolean;
}

/** The signed-in user, or null. Verified against the JWT signature. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub as string, email: (claims.email as string) ?? "", aal: (claims.aal as "aal1" | "aal2") ?? "aal1" };
});

async function ensureProfile(id: string, email: string): Promise<Profile | null> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("Profile missing and SUPABASE_SECRET_KEY is not set", id);
    return null;
  }
  const { data, error } = await admin.from("profiles").upsert({ id, email }, { onConflict: "id", ignoreDuplicates: true }).select("*").maybeSingle();
  if (error) console.error("Couldn't create the missing profile", id, error.message);
  if (data) return data;
  const { data: existing } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  return existing;
}

/**
 * Everything a dashboard page needs: user, profile, companies and the current company.
 * Sends people to /login, /onboarding or /mfa when they aren't ready for the dashboard yet.
 */
export const requireSession = cache(async (): Promise<SessionContext> => {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: found }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("memberships").select("role, tenants(*)").eq("user_id", user.id),
  ]);
  // Accounts created before the profiles trigger existed have no profile yet. Create it on
  // the server, and never send a signed-in user back to /login (that loops).
  const profile = found ?? (await ensureProfile(user.id, user.email));
  if (!profile) redirect("/login?error=account");

  const tenants = (rows ?? [])
    .map((r) => {
      const t = r.tenants as unknown as Tenant | null;
      return t ? { ...t, role: r.role } : null;
    })
    .filter((t): t is Tenant & { role: MemberRole } => t !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (tenants.length === 0) redirect("/onboarding");

  const chosen = (await cookies()).get(TENANT_COOKIE)?.value;
  const tenant = tenants.find((t) => t.id === chosen) ?? tenants[0]!;
  const isAdmin = tenant.role === "owner" || tenant.role === "admin";

  // Admins must use MFA. Anyone who has set it up must also use it.
  if (user.aal !== "aal2") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (isAdmin || aal?.nextLevel === "aal2") redirect("/mfa");
  }

  return { userId: user.id, email: user.email, aal: user.aal, profile, tenants, tenant, isAdmin, isOwner: tenant.role === "owner" };
});
