-- Phase 7: billing through Stripe. One subscription per company, priced per active
-- employee. Only the server (service role) writes billing data, from Stripe webhooks.

create table public.billing_accounts (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  subscription_item_id text,
  status text not null default 'none',
  interval text check (interval in ('month', 'year')),
  currency text check (currency in ('chf', 'eur')),
  quantity integer,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.billing_accounts enable row level security;
create policy "members read" on public.billing_accounts for select to authenticated
  using (private.is_member(tenant_id) or private.is_superadmin());
revoke all on public.billing_accounts from anon;
revoke insert, update, delete on public.billing_accounts from authenticated;

-- Stripe event ids already handled, so a redelivered webhook is applied only once.
create table public.billing_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon, authenticated;

-- Seats to bill: active, real employees.
create function public.billable_employees(t uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.employees where tenant_id = t and status = 'active' and not is_demo
$$;
revoke execute on function public.billable_employees(uuid) from public, anon, authenticated;
grant execute on function public.billable_employees(uuid) to service_role;
