import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { getUser } from "@/lib/session";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Set up your company" };

export default async function OnboardingPage() {
  if (!(await getUser())) redirect("/login");
  return (
    <AuthCard
      title="Set up your company"
      lead="You'll be its owner. If a colleague already uses Helvax, ask them to invite you instead."
    >
      <OnboardingForm />
    </AuthCard>
  );
}
