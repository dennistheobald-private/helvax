"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface EnrollState {
  factorId?: string;
  qr?: string;
  secret?: string;
  error?: string;
}

/** Starts TOTP enrollment and returns the QR code to scan. */
export async function startEnroll(): Promise<EnrollState> {
  const supabase = await createClient();
  // Clear abandoned, unverified attempts first, or enroll fails.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
  if (error || !data) return { error: "We couldn't start the setup. Try again." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyFactor(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const factorId = String(form.get("factorId") ?? "");
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code from your authenticator app." };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: "That code didn't match. Check the time on your phone and try again." };
  redirect("/overview");
}
