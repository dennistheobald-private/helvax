import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { getUser } from "@/lib/session";
import { safeNext } from "@/lib/urls";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const target = safeNext(next);
  const user = await getUser();
  // error=account: signed in, but the account couldn't be loaded. Show that instead of
  // redirecting back to the dashboard, which would loop.
  if (user && error === "account") {
    return (
      <AuthCard title="We couldn't open your account" lead="You're signed in, but your account details couldn't be loaded. Sign out and try again in a minute.">
        <form action="/auth/signout" method="post"><button type="submit" className="hx-btn hx-btn--primary">Sign out</button></form>
      </AuthCard>
    );
  }
  if (user) redirect(target);

  return (
    <AuthCard title="Log in" lead="We'll email you a one-time code. Admins then confirm with their authenticator app.">
      {error && error !== "account" && <div className="hx-alert hx-alert--danger" role="alert"><div><div className="hx-alert__title">That link didn&apos;t work</div><div className="hx-alert__body">It may have expired or been used already. Request a new code below.</div></div></div>}
      <LoginForm next={target} />
    </AuthCard>
  );
}
