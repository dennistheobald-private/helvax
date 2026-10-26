import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { getUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Challenge, Enroll } from "./MfaForms";

export const metadata: Metadata = { title: "Two-factor authentication" };

export default async function MfaPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/mfa");
  if (user.aal === "aal2") redirect("/overview");

  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === "verified");

  return factor ? (
    <AuthCard title="Enter your code" lead="Open your authenticator app and enter the 6-digit code for Helvax.">
      <Challenge factorId={factor.id} />
      <SignOut />
    </AuthCard>
  ) : (
    <AuthCard title="Protect your account" lead="Admins sign in with a second step. It takes a minute to set up.">
      <Enroll />
      <SignOut />
    </AuthCard>
  );
}

function SignOut() {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className="hx-link login__back">Sign out</button>
    </form>
  );
}
