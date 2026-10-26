-- Database advisor cleanup: fixed search paths, per-statement auth.uid() in policies,
-- and indexes for foreign keys.
alter function private.forbid_change() set search_path = '';
alter function private.touch() set search_path = '';

alter policy "own profile or teammates" on public.profiles
  using (id = (select auth.uid()) or private.shares_tenant(id) or private.is_superadmin());
alter policy "edit own profile" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy "admins remove members, anyone can leave" on public.memberships
  using (
    user_id = (select auth.uid())
    or (private.is_admin(tenant_id) and (role <> 'owner' or private.is_owner(tenant_id)))
  );

create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists employees_group_id_idx on public.employees (group_id);
create index if not exists events_session_id_idx on public.events (session_id);
create index if not exists invitations_invited_by_idx on public.invitations (invited_by);
create index if not exists landing_sessions_tenant_id_idx on public.landing_sessions (tenant_id);
create index if not exists outcome_decisions_decided_by_idx on public.outcome_decisions (decided_by);
create index if not exists outcome_decisions_tenant_id_idx on public.outcome_decisions (tenant_id);
create index if not exists outcomes_decision_id_idx on public.outcomes (decision_id);
create index if not exists platform_settings_updated_by_idx on public.platform_settings (updated_by);
create index if not exists reply_analyses_reviewed_by_idx on public.reply_analyses (reviewed_by);
create index if not exists reply_analyses_tenant_id_idx on public.reply_analyses (tenant_id);
create index if not exists simulations_scenario_id_idx on public.simulations (scenario_id);
create index if not exists tenant_scenarios_scenario_id_idx on public.tenant_scenarios (scenario_id);
