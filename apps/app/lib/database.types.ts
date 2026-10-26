// Hand-written to match supabase/migrations. Regenerate with
// `supabase gen types typescript --project-id <id>` once the CLI is linked.

export type MemberRole = "owner" | "admin" | "viewer";
export type TenantStatus = "trial" | "active" | "paused" | "closed";

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>, Relationships extends Rel[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type Profile = { id: string; email: string; full_name: string; locale: string; is_superadmin: boolean; created_at: string };
export type Tenant = { id: string; name: string; timezone: string; locale: string; status: TenantStatus; created_at: string; awareness_confirmed_at: string | null; sending_approved_at: string | null };
export type Membership = { tenant_id: string; user_id: string; role: MemberRole; created_at: string };
export type Invitation = { id: string; tenant_id: string; email: string; role: MemberRole; token_hash: string; invited_by: string | null; expires_at: string; accepted_at: string | null; created_at: string };
export type AuditLog = { id: number; tenant_id: string | null; actor_id: string | null; action: string; target: string | null; metadata: Record<string, unknown>; created_at: string };

export type EmployeeStatus = "active" | "paused" | "left";
export type ScenarioCategory = "phishing" | "supplier_fraud" | "executive_impersonation" | "qr_phishing" | "document_link" | "credential_form";
export type SimulationStatus = "planned" | "queued" | "sent" | "accepted" | "bounced" | "failed" | "cancelled";
export type EventType = "accepted" | "bounced" | "failed" | "link_request" | "qr_request" | "page_interaction" | "action_completed" | "reply" | "training_completed";
export type EventActor = "human_likely" | "unknown" | "scanner" | "automation";
export type ReplyCategory = "verification" | "refusal" | "neutral" | "risky_intent" | "ambiguous";
export type ReviewStatus = "not_needed" | "pending" | "confirmed" | "overridden";
export type OutcomeResult = "pending" | "not_delivered" | "no_interaction" | "scanner_only" | "inconclusive" | "suspected" | "verified_risky" | "verified_safe";

export type EmployeeGroup = { id: string; tenant_id: string; name: string; is_demo: boolean; created_at: string };
export type Employee = {
  id: string; tenant_id: string; email: string; first_name: string; last_name: string; group_id: string | null;
  locale: "en" | "de" | "nl"; status: EmployeeStatus; consent_scope: "standard" | "excluded"; is_demo: boolean; created_at: string; updated_at: string;
};
export type CompanyDomain = { id: string; tenant_id: string; domain: string; verification_token: string; verified_at: string | null; is_demo: boolean; created_at: string };
export type Scenario = {
  id: string; slug: string; category: ScenarioCategory; difficulty: 1 | 2 | 3; title: string; description: string; subject: string;
  sender_name: string; preview: string; locales: string[]; approval_state: "draft" | "in_review" | "approved" | "retired"; version: number; created_at: string;
};
export type TenantScenario = { tenant_id: string; scenario_id: string; enabled: boolean };
export type SimulationSettings = {
  tenant_id: string; sending_enabled: boolean; per_employee_per_month: number; business_days: number[]; window_start: string; window_end: string;
  cooldown_days: number; max_difficulty: number; training_moments: boolean; updated_at: string;
};
export type Simulation = {
  id: string; tenant_id: string; employee_id: string; scenario_id: string; scheduled_at: string; sent_at: string | null;
  status: SimulationStatus; is_demo: boolean; created_at: string;
};
export type LandingSession = {
  id: string; tenant_id: string; simulation_id: string; started_at: string; ip_hash: string | null; user_agent_family: string | null;
  network_class: "residential" | "corporate" | "datacenter" | "security_vendor" | "unknown" | null; js_executed: boolean; pointer_events: number; is_demo: boolean;
};
export type SimEvent = {
  id: string; tenant_id: string; simulation_id: string; session_id: string | null; type: EventType; evidence_level: number; actor: EventActor;
  occurred_at: string; source: "provider" | "landing" | "inbound" | "engine"; signals: Record<string, unknown>; action: string | null; is_demo: boolean;
};
export type ReplyAnalysis = {
  id: string; tenant_id: string; event_id: string; category: ReplyCategory; confidence: number; rule_hits: string[]; marker_found: boolean;
  classifier_version: string; excerpt: string; reviewer_status: ReviewStatus; reviewed_by: string | null; reviewed_category: ReplyCategory | null;
  reviewed_at: string | null; is_demo: boolean; created_at: string;
};
export type OutcomeDecision = {
  id: string; tenant_id: string; simulation_id: string; result: OutcomeResult; evidence_level: number; counts_as_failure: boolean;
  rule_version: string; evidence_event_ids: string[]; explanation: string; decided_by: string | null; decided_at: string; is_demo: boolean;
};
export type Outcome = {
  simulation_id: string; tenant_id: string; decision_id: string; result: OutcomeResult; evidence_level: number; counts_as_failure: boolean; decided_at: string; is_demo: boolean;
};
export type ReportSnapshot = {
  period: string; timezone: string; rule_version: string; sample_data?: boolean; employees_targeted: number; simulations_sent: number; eligible: number; link_requests: number;
  outcomes: Record<OutcomeResult, number>; levels: { l3: number; l4: number };
  previous: { eligible: number; verified_risky: number } | null;
  groups: { name: string; eligible: number; verified_risky: number; verified_safe: number }[];
};
export type Report = { id: string; tenant_id: string; period: string; snapshot: ReportSnapshot; created_at: string; sent_at: string | null; is_demo: boolean };

export type PlatformSettings = { id: boolean; sending_enabled: boolean; updated_at: string; updated_by: string | null };
export type SendingBlocker = "platform_off" | "not_approved" | "awareness_not_confirmed" | "no_verified_domain" | "no_scenarios" | "no_eligible_employees" | "sample_data_loaded";
export type SendingReadiness = { sending_enabled: boolean; platform_enabled: boolean; approved_at: string | null; awareness_confirmed_at: string | null; blockers: SendingBlocker[]; planned: number };
export type DueSimulation = { simulation_id: string; tenant_id: string; email: string; first_name: string; last_name: string; locale: string; scenario_slug: string; subject: string; sender_name: string; preview: string };

export type AdminTenant = {
  id: string; name: string; status: TenantStatus; created_at: string; owners: string[]; members: number; employees: number;
  verified_domains: string[]; sending_enabled: boolean; approved_at: string | null; awareness_confirmed_at: string | null;
  blockers: SendingBlocker[]; sent_30d: number; has_sample_data: boolean;
};

export type OutcomeSummary = { sent: number; eligible: number; outcomes: Partial<Record<OutcomeResult, number>> };
export type EmployeeStats = { employee_id: string; simulations: number; verified_risky: number; verified_safe: number; last_sent_at: string | null };

type FK<Name extends string, Col extends string, Ref extends string> = { foreignKeyName: Name; columns: [Col]; isOneToOne: false; referencedRelation: Ref; referencedColumns: ["id"] };
type EmployeeWrite = Pick<Employee, "email" | "first_name" | "last_name"> & Partial<Pick<Employee, "group_id" | "locale" | "status" | "consent_scope">>;

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, never, Partial<Pick<Profile, "full_name" | "locale">>>;
      tenants: Table<Tenant, never, Partial<Pick<Tenant, "name" | "timezone" | "locale">>>;
      memberships: Table<Membership, never, Pick<Membership, "role">, [
        { foreignKeyName: "memberships_tenant_id_fkey"; columns: ["tenant_id"]; isOneToOne: false; referencedRelation: "tenants"; referencedColumns: ["id"] },
        { foreignKeyName: "memberships_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
      ]>;
      invitations: Table<Invitation, Pick<Invitation, "tenant_id" | "email" | "role" | "token_hash"> & { invited_by?: string }>;
      audit_logs: Table<AuditLog, never, never>;
      employee_groups: Table<EmployeeGroup, Pick<EmployeeGroup, "tenant_id" | "name">, Pick<EmployeeGroup, "name">>;
      employees: Table<Employee, EmployeeWrite & { tenant_id: string }, Partial<EmployeeWrite>, [FK<"employees_group_id_fkey", "group_id", "employee_groups">]>;
      company_domains: Table<CompanyDomain, Pick<CompanyDomain, "tenant_id" | "domain">, Pick<CompanyDomain, "verified_at">>; // verified_at: service role only
      scenarios: Table<Scenario, never, never>;
      tenant_scenarios: Table<TenantScenario, TenantScenario, Pick<TenantScenario, "enabled">, [FK<"tenant_scenarios_scenario_id_fkey", "scenario_id", "scenarios">]>;
      simulation_settings: Table<SimulationSettings, never, Partial<Omit<SimulationSettings, "tenant_id" | "sending_enabled" | "updated_at">>>;
      simulations: Table<Simulation, never, never, [
        FK<"simulations_employee_id_fkey", "employee_id", "employees">,
        FK<"simulations_scenario_id_fkey", "scenario_id", "scenarios">,
      ]>;
      landing_sessions: Table<LandingSession, never, never>;
      events: Table<SimEvent, never, never, [FK<"events_session_id_fkey", "session_id", "landing_sessions">]>;
      reply_analyses: Table<ReplyAnalysis, never, never, [FK<"reply_analyses_event_id_fkey", "event_id", "events">]>;
      outcome_decisions: Table<OutcomeDecision, never, never, [FK<"outcome_decisions_decided_by_fkey", "decided_by", "profiles">]>;
      outcomes: Table<Outcome, never, never, [{ foreignKeyName: "outcomes_simulation_id_fkey"; columns: ["simulation_id"]; isOneToOne: true; referencedRelation: "simulations"; referencedColumns: ["id"] }]>;
      reports: Table<Report, never, never>;
      platform_settings: Table<PlatformSettings, never, never>;
    };
    Views: Record<string, never>;
    Functions: {
      create_tenant: { Args: { tenant_name: string; tenant_timezone?: string }; Returns: string };
      accept_invitation: { Args: { invite_token: string }; Returns: string };
      load_sample_data: { Args: { t: string }; Returns: undefined };
      clear_sample_data: { Args: { t: string }; Returns: undefined };
      review_reply: { Args: { analysis: string; new_category: ReplyCategory }; Returns: undefined };
      review_outcome: { Args: { sim: string; confirm: boolean; note: string }; Returns: undefined };
      outcome_summary: { Args: { t: string; since: string; until?: string }; Returns: OutcomeSummary };
      employee_stats: { Args: { t: string }; Returns: EmployeeStats[] };
      sending_readiness: { Args: { t: string }; Returns: SendingReadiness };
      confirm_awareness_notice: { Args: { t: string }; Returns: undefined };
      set_sending_enabled: { Args: { t: string; enabled: boolean }; Returns: undefined };
      set_platform_sending: { Args: { enabled: boolean }; Returns: undefined };
      approve_tenant_sending: { Args: { t: string; approved: boolean }; Returns: undefined };
      // Service role only.
      engine_plan_all: { Args: Record<string, never>; Returns: number };
      engine_claim_due: { Args: { max_count?: number }; Returns: DueSimulation[] };
      engine_mark_sent: { Args: { sim: string; accepted: boolean; provider_signals?: Record<string, unknown> }; Returns: undefined };
      engine_mark_bounced: { Args: { provider_id: string; complaint?: boolean }; Returns: undefined };
      engine_start_session: { Args: { sim: string; ip_hash: string | null; user_agent_family: string; network_class: string }; Returns: string };
      engine_touch_session: { Args: { session: string; pointer_events: number }; Returns: undefined };
      engine_record: { Args: { sim: string; session: string | null; kind: EventType; who: EventActor; detection?: Record<string, unknown>; simulated_action?: string | null }; Returns: string };
      engine_record_reply: { Args: { sim: string; category: ReplyCategory; confidence: number; rule_hits: string[]; marker_found: boolean; classifier_version: string; excerpt: string }; Returns: string };
      engine_close_windows: { Args: Record<string, never>; Returns: number };
      admin_tenants: { Args: Record<string, never>; Returns: AdminTenant[] };
      admin_platform_log: { Args: { max_rows?: number }; Returns: { created_at: string; action: string; actor: string }[] };
      engine_build_reports: { Args: { as_of?: string }; Returns: number };
      engine_reports_to_send: { Args: Record<string, never>; Returns: { report_id: string; tenant_id: string; tenant_name: string; period: string; snapshot: ReportSnapshot; recipients: string[] }[] };
      engine_mark_report_sent: { Args: { report: string }; Returns: undefined };
    };
    Enums: { member_role: MemberRole; tenant_status: TenantStatus; employee_status: EmployeeStatus; outcome_result: OutcomeResult; reply_category: ReplyCategory };
    CompositeTypes: Record<string, never>;
  };
};
