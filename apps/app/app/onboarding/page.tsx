import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { suggestedDomain } from "@/lib/domains";
import { getUser } from "@/lib/session";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Set up your company" };

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <AuthCard
      title="Set up your company"
      lead="You'll be its owner. If a colleague already uses Helvax, ask them to invite you instead."
    >
      <OnboardingForm suggestedDomain={suggestedDomain(user.email)} />
    </AuthCard>
  );
}
