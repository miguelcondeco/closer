-- 0002_multi_tenant.sql
-- Closer — pivot para arquitectura multi-tenant
-- Executar no Supabase Studio → SQL Editor

-- Tenants (clientes / agências)
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  -- unique token used in webhook URLs: /webhooks/meta-lead-ads/:webhook_token
  webhook_token text not null unique default encode(gen_random_bytes(32), 'hex'),
  plan text not null default 'trial'
    check (plan in ('trial', 'starter', 'growth', 'enterprise')),
  is_active boolean not null default true,
  -- working hours, timezone, etc — flexible jsonb config
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tenants_webhook_token on tenants(webhook_token);
create index idx_tenants_slug on tenants(slug);

-- Users (agents within a tenant — linked to Supabase Auth)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'agent'
    check (role in ('owner', 'admin', 'agent')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_tenant on users(tenant_id);

-- Tenant integrations (per-tenant 3rd-party credentials, encrypted at rest)
-- credentials jsonb stores AES-256-GCM encrypted values — never plaintext
create table tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  provider text not null
    check (provider in ('meta', 'twilio', 'google_calendar', 'anthropic')),
  credentials jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);

create index idx_tenant_integrations_tenant on tenant_integrations(tenant_id);

-- Add tenant_id to all data tables
alter table owners         add column tenant_id uuid not null references tenants(id) on delete cascade;
alter table properties     add column tenant_id uuid not null references tenants(id) on delete cascade;
alter table leads          add column tenant_id uuid not null references tenants(id) on delete cascade;
alter table lead_property_interest add column tenant_id uuid not null references tenants(id) on delete cascade;
alter table lead_qualifications    add column tenant_id uuid not null references tenants(id) on delete cascade;
alter table messages       add column tenant_id uuid not null references tenants(id) on delete cascade;
alter table visits         add column tenant_id uuid not null references tenants(id) on delete cascade;
alter table pipeline_history       add column tenant_id uuid not null references tenants(id) on delete cascade;
alter table usage_events   add column tenant_id uuid not null references tenants(id) on delete cascade;

-- Indexes on tenant_id for all data tables (queries always filter by tenant)
create index idx_owners_tenant         on owners(tenant_id);
create index idx_properties_tenant     on properties(tenant_id);
create index idx_leads_tenant          on leads(tenant_id);
create index idx_lead_property_tenant  on lead_property_interest(tenant_id);
create index idx_qualifications_tenant on lead_qualifications(tenant_id);
create index idx_messages_tenant       on messages(tenant_id);
create index idx_visits_tenant         on visits(tenant_id);
create index idx_pipeline_history_tenant on pipeline_history(tenant_id);
create index idx_usage_events_tenant   on usage_events(tenant_id);

-- meta_lead_id must be unique per tenant, not globally
alter table leads drop constraint leads_meta_lead_id_key;
alter table leads add constraint leads_meta_lead_id_tenant_unique unique (tenant_id, meta_lead_id);

-- Insert Miguel's tenant (Elevancy Real Estate)
insert into tenants (name, slug, plan)
values ('Elevancy Real Estate', 'elevancy', 'trial');
