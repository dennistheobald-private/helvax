-- Helvax: employees, scenario library, simulation settings and verified results.
-- Results tables are written by the engine with the service role; members only read them.
-- See docs/verification.md for the evidence levels (L0-L4) and outcome rules.

create type public.employee_status as enum ('active', 'paused', 'left');
create type public.scenario_category as enum ('phishing', 'supplier_fraud', 'executive_impersonation', 'qr_phishing', 'document_link', 'credential_form');
create type public.approval_state as enum ('draft', 'in_review', 'approved', 'retired');
create type public.simulation_status as enum ('planned', 'queued', 'sent', 'accepted', 'bounced', 'failed', 'cancelled');
-- What happened, as observed. Each type has a default evidence level (docs/verification.md).
create type public.event_type as enum (
  'accepted',          -- L0 provider accepted the message
  'bounced', 'failed', -- L0 not delivered
  'link_request',      -- L1 signed link requested (scanners do this too)
  'qr_request',        -- L1 signed QR link requested
  'page_interaction',  -- L2 deliberate interaction, e.g. pressing Continue
  'action_completed',  -- L3 completed a simulated security-sensitive action
  'reply',             -- level set by the reply analysis
  'training_completed'
);
-- Who most likely caused an event, from scanner and automation detection.
create type public.event_actor as enum ('human_likely', 'unknown', 'scanner', 'automation');
create type public.reply_category as enum ('verification', 'refusal', 'neutral', 'risky_intent', 'ambiguous');
create type public.review_status as enum ('not_needed', 'pending', 'confirmed', 'overridden');
-- The per-simulation result. Only verified_risky counts toward the failure rate.
create type public.outcome_result as enum (
  'pending',         -- still inside the observation window
  'not_delivered',   -- bounced or failed
  'no_interaction',  -- delivered, no activity seen (not proof of safe behaviour)
  'scanner_only',    -- only automated activity
  'inconclusive',    -- some activity, evidence insufficient either way
  'suspected',       -- risky action likely but not verified; needs review
  'verified_risky',  -- L3 with credible human attribution, or L4
  'verified_safe'    -- verified safe behaviour, e.g. a verification or refusal reply
);

-- Employees ----------------------------------------------------------------------

create table public.employee_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email extensions.citext not null check (email::text ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  group_id uuid references public.employee_groups (id) on delete set null,
  locale text not null default 'en' check (locale in ('en', 'de', 'nl')),
  status public.employee_status not null default 'active',
  -- What the employee was told: 'standard' = covered by the company's awareness notice.
  consent_scope text not null default 'standard' check (consent_scope in ('standard', 'excluded')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);
create index employees_tenant_idx on public.employees (tenant_id, status);

-- The company's own email domains. Employees can only be added on these domains, and
-- simulations are only sent to a domain once its DNS verification succeeded.
create table public.company_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  domain extensions.citext not null check (domain::text ~ '^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'),
  verification_token text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  verified_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, domain)
);

create function private.email_domain(email text) returns text
language sql immutable set search_path = '' as $$
  select lower(split_part(email, '@', 2))
$$;

-- Employees must use one of the company's domains.
create function private.check_employee_domain() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.company_domains
    where tenant_id = new.tenant_id and domain = private.email_domain(new.email)
  ) then
    raise exception 'Only addresses on your company domain can be added (%).', private.email_domain(new.email)
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger employees_domain before insert or update of email on public.employees
  for each row execute function private.check_employee_domain();

create table public.suppressions (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email extensions.citext not null,
  reason text not null check (reason in ('bounce', 'complaint', 'manual')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, email)
);

-- Scenario library (global, curated by platform superadmins) ---------------------

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category public.scenario_category not null,
  difficulty smallint not null check (difficulty between 1 and 3),
  title text not null,
  description text not null,
  subject text not null,
  sender_name text not null,
  preview text not null,
  locales text[] not null default '{en}',
  approval_state public.approval_state not null default 'draft',
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.tenant_scenarios (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  enabled boolean not null default true,
  primary key (tenant_id, scenario_id)
);

create table public.simulation_settings (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  -- Master switch. Sending also needs a verified domain and the platform switch (phase 5).
  sending_enabled boolean not null default false,
  per_employee_per_month smallint not null default 1 check (per_employee_per_month between 1 and 4),
  business_days smallint[] not null default '{1,2,3,4,5}',
  window_start time not null default '09:00',
  window_end time not null default '17:00',
  cooldown_days smallint not null default 7 check (cooldown_days between 2 and 60),
  max_difficulty smallint not null default 3 check (max_difficulty between 1 and 3),
  training_moments boolean not null default true,
  updated_at timestamptz not null default now(),
  check (window_end > window_start)
);

-- Results (written by the engine) --------------------------------------------------

create table public.simulations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  scenario_id uuid not null references public.scenarios (id),
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status public.simulation_status not null default 'planned',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index simulations_tenant_idx on public.simulations (tenant_id, scheduled_at desc);
create index simulations_employee_idx on public.simulations (employee_id, scheduled_at desc);

-- One landing-page session per browser that used a signed link. Correlates requests,
-- interactions and submissions. Only hashes of network identifiers are kept.
create table public.landing_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  simulation_id uuid not null references public.simulations (id) on delete cascade,
  started_at timestamptz not null default now(),
  ip_hash text,
  user_agent_family text,
  network_class text check (network_class in ('residential', 'corporate', 'datacenter', 'security_vendor', 'unknown')),
  js_executed boolean not null default false,
  pointer_events integer not null default 0,
  is_demo boolean not null default false
);
create index landing_sessions_simulation_idx on public.landing_sessions (simulation_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  simulation_id uuid not null references public.simulations (id) on delete cascade,
  session_id uuid references public.landing_sessions (id) on delete set null,
  type public.event_type not null,
  evidence_level smallint not null check (evidence_level between 0 and 4),
  actor public.event_actor not null default 'unknown',
  occurred_at timestamptz not null default now(),
  -- Where the observation came from, for provenance.
  source text not null check (source in ('provider', 'landing', 'inbound', 'engine')),
  -- Detection signals behind `actor`, e.g. {"seconds_after_send": 4, "network": "security_vendor"}.
  signals jsonb not null default '{}'::jsonb,
  -- For action_completed: which simulated action, e.g. login, bank_change, payment_approval.
  action text,
  is_demo boolean not null default false
);
create index events_tenant_idx on public.events (tenant_id, occurred_at desc);
create index events_simulation_idx on public.events (simulation_id);

create table public.reply_analyses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  event_id uuid not null unique references public.events (id) on delete cascade,
  category public.reply_category not null,
  confidence numeric(3, 2) not null check (confidence between 0 and 1),
  -- Deterministic rules that fired, e.g. {test_marker_present, bank_change_agreed}.
  rule_hits text[] not null default '{}',
  -- The reply contained the synthetic test marker the scenario asked for.
  marker_found boolean not null default false,
  classifier_version text not null,
  excerpt text not null default '',
  reviewer_status public.review_status not null default 'not_needed',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_category public.reply_category,
  reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- Immutable decision history: every (re)decision about a simulation's outcome, with
-- the rule version, the events it used and a plain-language explanation.
create table public.outcome_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  simulation_id uuid not null references public.simulations (id) on delete cascade,
  result public.outcome_result not null,
  evidence_level smallint not null check (evidence_level between 0 and 4),
  counts_as_failure boolean not null generated always as (result = 'verified_risky') stored,
  rule_version text not null,
  evidence_event_ids uuid[] not null default '{}',
  explanation text not null,
  decided_by uuid references public.profiles (id) on delete set null, -- null = the engine
  decided_at timestamptz not null default now(),
  is_demo boolean not null default false
);
create index outcome_decisions_simulation_idx on public.outcome_decisions (simulation_id, decided_at desc);

-- The current outcome per simulation (the latest decision), kept by a trigger.
create table public.outcomes (
  simulation_id uuid primary key references public.simulations (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  decision_id uuid not null references public.outcome_decisions (id) on delete cascade,
  result public.outcome_result not null,
  evidence_level smallint not null,
  counts_as_failure boolean not null,
  decided_at timestamptz not null,
  is_demo boolean not null default false
);
create index outcomes_tenant_idx on public.outcomes (tenant_id, result);

create function private.apply_decision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.outcomes (simulation_id, tenant_id, decision_id, result, evidence_level, counts_as_failure, decided_at, is_demo)
  values (new.simulation_id, new.tenant_id, new.id, new.result, new.evidence_level, new.counts_as_failure, new.decided_at, new.is_demo)
  on conflict (simulation_id) do update set
    decision_id = excluded.decision_id, result = excluded.result, evidence_level = excluded.evidence_level,
    counts_as_failure = excluded.counts_as_failure, decided_at = excluded.decided_at;
  return new;
end $$;
create trigger outcome_decisions_apply after insert on public.outcome_decisions
  for each row execute function private.apply_decision();

-- History can't be edited, only appended to. (Deleting a whole company still cascades.)
create function private.forbid_change() returns trigger language plpgsql as $$
begin
  raise exception '% is append-only.', tg_table_name using errcode = 'insufficient_privilege';
end $$;
create trigger outcome_decisions_immutable before update on public.outcome_decisions
  for each row execute function private.forbid_change();
create trigger events_immutable before update on public.events
  for each row execute function private.forbid_change();

-- Frozen monthly snapshots: later reclassification never rewrites a sent report.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  period date not null check (extract(day from period) = 1),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  is_demo boolean not null default false,
  unique (tenant_id, period)
);

-- Settings row for every company --------------------------------------------------

insert into public.simulation_settings (tenant_id) select id from public.tenants on conflict do nothing;

create function private.create_tenant_defaults() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.simulation_settings (tenant_id) values (new.id) on conflict do nothing;
  insert into public.tenant_scenarios (tenant_id, scenario_id)
    select new.id, id from public.scenarios where approval_state = 'approved'
    on conflict do nothing;
  return new;
end $$;
create trigger tenants_defaults after insert on public.tenants
  for each row execute function private.create_tenant_defaults();

create function private.touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger employees_touch before update on public.employees for each row execute function private.touch();
create trigger settings_touch before update on public.simulation_settings for each row execute function private.touch();

-- Row-level security -------------------------------------------------------------

alter table public.employee_groups enable row level security;
alter table public.employees enable row level security;
alter table public.company_domains enable row level security;
alter table public.suppressions enable row level security;
alter table public.scenarios enable row level security;
alter table public.tenant_scenarios enable row level security;
alter table public.simulation_settings enable row level security;
alter table public.simulations enable row level security;
alter table public.events enable row level security;
alter table public.landing_sessions enable row level security;
alter table public.outcome_decisions enable row level security;
alter table public.outcomes enable row level security;
alter table public.reply_analyses enable row level security;
alter table public.reports enable row level security;

-- Members read everything in their company; admins (with MFA) manage the roster and settings.
do $$
declare t text;
begin
  foreach t in array array['employee_groups', 'employees', 'company_domains', 'suppressions', 'tenant_scenarios', 'simulation_settings'] loop
    execute format('create policy "members read" on public.%I for select to authenticated using (private.is_member(tenant_id) or private.is_superadmin())', t);
    execute format('create policy "admins insert" on public.%I for insert to authenticated with check (private.is_admin(tenant_id))', t);
    execute format('create policy "admins update" on public.%I for update to authenticated using (private.is_admin(tenant_id)) with check (private.is_admin(tenant_id))', t);
    execute format('create policy "admins delete" on public.%I for delete to authenticated using (private.is_admin(tenant_id))', t);
  end loop;
  foreach t in array array['simulations', 'landing_sessions', 'events', 'reply_analyses', 'outcome_decisions', 'outcomes', 'reports'] loop
    execute format('create policy "members read" on public.%I for select to authenticated using (private.is_member(tenant_id) or private.is_superadmin())', t);
  end loop;
end $$;

-- Results are written by the engine only. Admins review through review_outcome().
revoke insert, update, delete on public.simulations, public.landing_sessions, public.events, public.reply_analyses,
  public.outcome_decisions, public.outcomes, public.reports from authenticated;

-- Domains are verified by the server, never marked verified by the client.
revoke insert, update on public.company_domains from authenticated;
grant insert (tenant_id, domain) on public.company_domains to authenticated;
-- Sample data is created only by load_sample_data().
revoke insert, update on public.employees, public.employee_groups from authenticated;
grant insert (tenant_id, email, first_name, last_name, group_id, locale, status, consent_scope) on public.employees to authenticated;
grant update (email, first_name, last_name, group_id, locale, status, consent_scope) on public.employees to authenticated;
grant insert (tenant_id, name), update (name) on public.employee_groups to authenticated;
-- The master sending switch is changed only through set_sending_enabled (phase 5 safety checks).
revoke update on public.simulation_settings from authenticated;
grant update (per_employee_per_month, business_days, window_start, window_end, cooldown_days, max_difficulty, training_moments)
  on public.simulation_settings to authenticated;
revoke insert, delete on public.simulation_settings from authenticated;

create policy "everyone reads approved scenarios" on public.scenarios for select to authenticated
  using (approval_state = 'approved' or private.is_superadmin());
create policy "superadmins manage scenarios" on public.scenarios for all to authenticated
  using (private.is_superadmin() and private.mfa_verified()) with check (private.is_superadmin() and private.mfa_verified());

revoke all on public.employee_groups, public.employees, public.company_domains, public.suppressions, public.scenarios,
  public.tenant_scenarios, public.simulation_settings, public.simulations, public.landing_sessions, public.events,
  public.reply_analyses, public.outcome_decisions, public.outcomes, public.reports from anon;

-- Audit roster changes in bulk-friendly form (one row per statement).
create function private.audit_employees() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n integer; t uuid;
begin
  if tg_op = 'DELETE' then
    select count(*), min(tenant_id::text)::uuid into n, t from old_rows;
  else
    select count(*), min(tenant_id::text)::uuid into n, t from new_rows;
  end if;
  if n > 0 and auth.uid() is not null and exists (select 1 from public.tenants where id = t) then
    perform private.audit(t, 'employees.' || lower(tg_op), null, jsonb_build_object('count', n));
  end if;
  return null;
end $$;
create trigger employees_audit_ins after insert on public.employees referencing new table as new_rows
  for each statement execute function private.audit_employees();
create trigger employees_audit_upd after update on public.employees referencing new table as new_rows
  for each statement execute function private.audit_employees();
create trigger employees_audit_del after delete on public.employees referencing old table as old_rows
  for each statement execute function private.audit_employees();

-- Company domains ----------------------------------------------------------------

-- Free mail providers can never be a company domain.
create function private.check_company_domain() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.domain::text = any (array[
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'icloud.com',
    'me.com', 'aol.com', 'gmx.ch', 'gmx.de', 'gmx.net', 'web.de', 'bluewin.ch', 'proton.me', 'protonmail.com', 't-online.de'
  ]) then
    raise exception '% is a public email provider, not a company domain.', new.domain using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger company_domains_check before insert on public.company_domains
  for each row execute function private.check_company_domain();

-- New companies get the creator's email domain as their first company domain.
create or replace function public.create_tenant(tenant_name text, tenant_timezone text default 'Europe/Zurich')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.tenants (name, timezone) values (trim(tenant_name), tenant_timezone) returning id into t;
  insert into public.memberships (tenant_id, user_id, role) values (t, auth.uid(), 'owner');
  insert into public.company_domains (tenant_id, domain)
  values (t, private.email_domain(auth.jwt() ->> 'email'));
  perform private.audit(t, 'tenant.created', t::text, jsonb_build_object('name', tenant_name));
  return t;
end $$;
