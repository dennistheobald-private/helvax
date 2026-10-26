import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Alert, Button } from "@helvax/ui/react";
import { AuthCard } from "@/components/AuthCard";
import { TENANT_COOKIE, getUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Join your team" };

async function accept(form: FormData) {
  "use server";
  const token = String(form.get("token") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { invite_token: token });
  if (error || !data) redirect(`/invite/${encodeURIComponent(token)}?error=1`);
  (await cookies()).set(TENANT_COOKIE, data, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  redirect("/overview");
}

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  return (
    <AuthCard title="Join your team" lead={<>You&apos;re signed in as <strong>{user.email}</strong>.</>}>
      {error && (
        <Alert tone="danger" title="This invitation can't be used">
          It may have expired, been used already, or been sent to a different email address. Ask your admin for a new one.
        </Alert>
      )}
      <form action={accept}>
        <input type="hidden" name="token" value={token} />
        <Button type="submit" size="lg" block>Accept invitation</Button>
      </form>
    </AuthCard>
  );
}
