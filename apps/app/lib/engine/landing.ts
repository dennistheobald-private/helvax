import "server-only";
import type { ScenarioCategory } from "../database.types";
import { createAdminClient } from "../supabase/admin";

/** Links work for 30 days after a simulation was sent. */
const LINK_DAYS = 30;

/** The simulated action each kind of scenario asks for (docs/verification.md). */
export const ACTIONS: Record<ScenarioCategory, string> = {
  phishing: "login",
  credential_form: "login",
  document_link: "document_access",
  qr_phishing: "account_verification",
  supplier_fraud: "bank_change",
  executive_impersonation: "payment_approval",
};

export interface LandingContext {
  simulationId: string;
  sentAt: string;
  category: ScenarioCategory;
  title: string;
  senderName: string;
  company: string;
  training: boolean;
}

/** A sent simulation whose link is still valid, or null. */
export async function loadLanding(simulationId: string): Promise<LandingContext | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: sim } = await admin
    .from("simulations")
    .select("id, tenant_id, sent_at, status, is_demo, scenarios(category, title, sender_name)")
    .eq("id", simulationId)
    .maybeSingle();
  if (!sim?.sent_at || sim.is_demo || !["sent", "accepted"].includes(sim.status)) return null;
  if (Date.now() - new Date(sim.sent_at).getTime() > LINK_DAYS * 86_400_000) return null;
  const [{ data: tenant }, { data: settings }] = await Promise.all([
    admin.from("tenants").select("name").eq("id", sim.tenant_id).single(),
    admin.from("simulation_settings").select("training_moments").eq("tenant_id", sim.tenant_id).single(),
  ]);
  const scenario = sim.scenarios as unknown as { category: ScenarioCategory; title: string; sender_name: string } | null;
  if (!scenario || !tenant) return null;
  return {
    simulationId: sim.id,
    sentAt: sim.sent_at,
    category: scenario.category,
    title: scenario.title,
    senderName: scenario.sender_name,
    company: tenant.name,
    training: settings?.training_moments ?? true,
  };
}
