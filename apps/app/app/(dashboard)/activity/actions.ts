"use server";

import { revalidatePath } from "next/cache";
import type { ReplyCategory } from "@/lib/database.types";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  ok?: string;
  error?: string;
}

const CATEGORIES: ReplyCategory[] = ["verification", "refusal", "neutral", "risky_intent", "ambiguous"];

/** Confirm or correct how a reply was classified. The outcome is decided again from the evidence. */
export async function reviewReply(_prev: FormState, form: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!s.isAdmin) return { error: "Only admins can review results." };
  const category = String(form.get("category")) as ReplyCategory;
  if (!CATEGORIES.includes(category)) return { error: "Choose what the reply means." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_reply", { analysis: String(form.get("analysis")), new_category: category });
  if (error) return { error: "Couldn't save the review. Try again." };
  revalidatePath("/activity", "layout");
  revalidatePath("/overview");
  return { ok: "Review saved." };
}

/** Confirm or dismiss a suspected result that isn't based on a reply. */
export async function reviewOutcome(_prev: FormState, form: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!s.isAdmin) return { error: "Only admins can review results." };
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  if (note.length < 5) return { error: "Add a short reason, so the decision can be traced later." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_outcome", { sim: String(form.get("sim")), confirm: form.get("decision") === "confirm", note });
  if (error) return { error: error.message.includes("Only suspected") ? "This result was already decided." : "Couldn't save the review. Try again." };
  revalidatePath("/activity", "layout");
  revalidatePath("/overview");
  return { ok: "Review saved." };
}
