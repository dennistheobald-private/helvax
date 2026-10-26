"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appOrigin, safeNext } from "@/lib/urls";

export interface LoginState {
  step: "email" | "code";
  email?: string;
  error?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(form.get("next"));
  if (!EMAIL.test(email)) return { step: "email", email, error: "Enter a valid work email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${await appOrigin()}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    console.error("signInWithOtp failed", error.status, error.message);
    const wait = error.status === 429;
    return { step: "email", email, error: wait ? "Too many attempts. Wait a minute and try again." : "We couldn't send the email. Try again in a moment." };
  }
  return { step: "code", email };
}

export async function verifyCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const token = String(form.get("code") ?? "").replace(/\s/g, "");
  const next = safeNext(form.get("next"));
  if (!/^\d{6,10}$/.test(token)) return { step: "code", email, error: "Enter the code from the email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { step: "code", email, error: "That code is wrong or has expired. Request a new one." };
  redirect(next);
}
