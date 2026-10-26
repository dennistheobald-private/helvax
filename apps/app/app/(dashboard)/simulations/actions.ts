"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  ok?: string;
  error?: string;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function updateSettings(_prev: FormState, form: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!s.isAdmin) return { error: "Only admins can change the schedule." };
  const per = Number(form.get("per_employee_per_month"));
  const days = form.getAll("business_days").map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
  const start = String(form.get("window_start") ?? "");
  const end = String(form.get("window_end") ?? "");
  const cooldown = Number(form.get("cooldown_days"));
  const difficulty = Number(form.get("max_difficulty"));
  if (![1, 2, 4].includes(per)) return { error: "Choose how often each person is tested." };
  if (days.length === 0) return { error: "Choose at least one day." };
  if (!TIME.test(start) || !TIME.test(end) || end <= start) return { error: "The end time must be after the start time." };
  if (!(cooldown >= 2 && cooldown <= 60)) return { error: "Keep at least 2 and at most 60 days between simulations." };
  if (![1, 2, 3].includes(difficulty)) return { error: "Choose the highest difficulty." };

  const supabase = await createClient();
  const { error } = await supabase.from("simulation_settings").update({
    per_employee_per_month: per,
    business_days: [...new Set(days)].sort(),
    window_start: start,
    window_end: end,
    cooldown_days: cooldown,
    max_difficulty: difficulty,
    training_moments: form.get("training_moments") === "on",
  }).eq("tenant_id", s.tenant.id);
  if (error) return { error: "Couldn't save. Try again." };
  revalidatePath("/simulations");
  return { ok: "Saved." };
}

export async function toggleScenario(form: FormData) {
  const s = await requireSession();
  if (!s.isAdmin) return;
  const supabase = await createClient();
  await supabase.from("tenant_scenarios").update({ enabled: form.get("enabled") === "true" })
    .eq("tenant_id", s.tenant.id).eq("scenario_id", String(form.get("scenario")));
  revalidatePath("/simulations");
}

export async function confirmAwareness(): Promise<void> {
  const s = await requireSession();
  if (!s.isOwner) return;
  const supabase = await createClient();
  await supabase.rpc("confirm_awareness_notice", { t: s.tenant.id });
  revalidatePath("/simulations");
}

export async function setSending(_prev: FormState, form: FormData): Promise<FormState> {
  const s = await requireSession();
  const enabled = form.get("enabled") === "true";
  if (enabled ? !s.isOwner : !s.isAdmin) return { error: enabled ? "Only an owner can turn sending on." : "Only admins can turn sending off." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_sending_enabled", { t: s.tenant.id, enabled });
  if (error) return { error: enabled ? "Sending can't be turned on yet. Check the list below." : "Couldn't turn sending off. Try again." };
  revalidatePath("/simulations");
  return { ok: enabled ? "Sending is on." : "Sending is off. Planned simulations were cancelled." };
}
