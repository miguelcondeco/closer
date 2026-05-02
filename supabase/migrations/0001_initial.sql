-- 0001_initial.sql
-- Closer — schema inicial single-tenant
-- Executar no Supabase Studio → SQL Editor

-- Owners (proprietários)
create table owners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_e164 text,
  email text,
  nif text,
  status text not null default 'active'
    check (status in ('active','inactive','sold','lost')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_owners_status on owners(status);

-- Properties (imóveis)
create table properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references owners(id) on delete set null,
  address text not null,
  district text,
  municipality text,
  parish text,
  property_type text check (property_type in ('apartment','house','land','commercial','other')),
  typology text,
  area_m2 numeric,
  asking_price_eur numeric,
  ami_listing_fee_eur numeric,
  description text,
  photos jsonb default '[]'::jsonb,
  status text not null default 'in_acquisition'
    check (status in ('in_acquisition','active','reserved','cpcv','sold','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_properties_status on properties(status);
create index idx_properties_owner on properties(owner_id);

-- Leads
create table leads (
  id uuid primary key default gen_random_uuid(),
  meta_lead_id text unique,
  source text not null check (source in ('meta_lead_ads','manual','referral','other')),
  full_name text,
  phone_e164 text not null,
  email text,
  language_detected text check (language_detected in ('pt','en','fr')),
  campaign_id text,
  campaign_name text,
  raw_payload jsonb,
  pipeline_stage text not null default 'new'
    check (pipeline_stage in ('new','qualified','visit_scheduled','visit_done','proposal','cpcv','escritura','lost')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_pipeline on leads(pipeline_stage);
create index idx_leads_phone on leads(phone_e164);
create index idx_leads_created on leads(created_at desc);

-- Lead × Property interest (many-to-many)
create table lead_property_interest (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  interest_level text default 'medium' check (interest_level in ('low','medium','high')),
  notes text,
  created_at timestamptz not null default now(),
  unique (lead_id, property_id)
);

-- Lead qualifications
create table lead_qualifications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  score text not null check (score in ('Hot','Warm','Cold','Time-waster')),
  timing_months integer,
  budget_min_eur integer,
  budget_max_eur integer,
  financing_status text,
  zones text[],
  property_type text[],
  motivation text,
  summary text,
  full_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_qualifications_lead on lead_qualifications(lead_id);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  channel text not null default 'whatsapp' check (channel in ('whatsapp','sms','email')),
  sender text not null check (sender in ('lead','closer_ai','agent')),
  body text not null,
  twilio_sid text unique,
  status text default 'sent' check (status in ('queued','sent','delivered','read','failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_messages_lead_created on messages(lead_id, created_at);

-- Visits
create table visits (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  google_event_id text,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30,
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','completed','no_show','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_visits_scheduled on visits(scheduled_at);
create index idx_visits_lead on visits(lead_id);
create index idx_visits_property on visits(property_id);

-- Pipeline movement audit log
create table pipeline_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index idx_pipeline_history_lead on pipeline_history(lead_id, created_at desc);

-- Cost tracking
create table usage_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('claude_tokens','twilio_message','google_api_call')),
  quantity numeric not null,
  cost_eur numeric not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_usage_created on usage_events(created_at desc);
