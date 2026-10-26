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
export type Tenant = { id: string; name: string; timezone: string; locale: string; status: TenantStatus; created_at: string };
export type Membership = { tenant_id: string; user_id: string; role: MemberRole; created_at: string };
export type Invitation = { id: string; tenant_id: string; email: string; role: MemberRole; token_hash: string; invited_by: string | null; expires_at: string; accepted_at: string | null; created_at: string };
export type AuditLog = { id: number; tenant_id: string | null; actor_id: string | null; action: string; target: string | null; metadata: Record<string, unknown>; created_at: string };

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
    };
    Views: Record<string, never>;
    Functions: {
      create_tenant: { Args: { tenant_name: string; tenant_timezone?: string }; Returns: string };
      accept_invitation: { Args: { invite_token: string }; Returns: string };
    };
    Enums: { member_role: MemberRole; tenant_status: TenantStatus };
    CompositeTypes: Record<string, never>;
  };
};
