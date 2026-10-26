import "server-only";
import type { ScenarioCategory } from "../database.types";
import { createAdminClient } from "../supabase/admin";
import { toLocale, type Locale } from "./practice-copy";

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
  locale: Locale;
}

/** A sent simulation whose link is still valid, or null. */
export async function loadLanding(simulationId: string): Promise<LandingContext | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: sim } = await admin
    .from("simulations")
    .select("id, tenant_id, sent_at, status, is_demo, scenarios(id, category, title, sender_name), employees(locale)")
    .eq("id", simulationId)
    .maybeSingle();
  if (!sim?.sent_at || sim.is_demo || !["sent", "accepted"].includes(sim.status)) return null;
  if (Date.now() - new Date(sim.sent_at).getTime() > LINK_DAYS * 86_400_000) return null;
  const [{ data: tenant }, { data: settings }] = await Promise.all([
    admin.from("tenants").select("name").eq("id", sim.tenant_id).single(),
    admin.from("simulation_settings").select("training_moments").eq("tenant_id", sim.tenant_id).single(),
  ]);
  const scenario = sim.scenarios as unknown as { id: string; category: ScenarioCategory; title: string; sender_name: string } | null;
  if (!scenario || !tenant) return null;
  const locale = toLocale((sim.employees as unknown as { locale: string } | null)?.locale);
  // The page shows the same sender name as the email the person received.
  const { data: tr } = locale === "en" ? { data: null } : await admin.from("scenario_translations").select("sender_name")
    .eq("scenario_id", scenario.id).eq("locale", locale).maybeSingle();
  return {
    simulationId: sim.id,
    sentAt: sim.sent_at,
    category: scenario.category,
    title: scenario.title,
    senderName: tr?.sender_name ?? scenario.sender_name,
    company: tenant.name,
    training: settings?.training_moments ?? true,
    locale,
  };
}
