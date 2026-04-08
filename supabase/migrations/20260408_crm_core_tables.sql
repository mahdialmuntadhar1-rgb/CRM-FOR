create extension if not exists pgcrypto;

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_id uuid references public.message_templates(id),
  send_mode text not null,
  filter_summary text not null,
  target_count integer not null default 0,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid,
  template_id uuid references public.message_templates(id),
  normalized_phone text not null,
  rendered_message text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.send_logs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  normalized_phone text not null,
  status text not null,
  provider text not null default 'nabda',
  provider_message_id text,
  details text,
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.contacts
  add column if not exists original_name text,
  add column if not exists display_name text,
  add column if not exists raw_phone text,
  add column if not exists normalized_phone text,
  add column if not exists is_phone_valid boolean default false,
  add column if not exists is_duplicate boolean default false,
  add column if not exists ready_to_send boolean default false,
  add column if not exists last_sent_at timestamptz,
  add column if not exists last_message_status text;

create unique index if not exists contacts_normalized_phone_unique_ready_idx
  on public.contacts(normalized_phone)
  where normalized_phone is not null and ready_to_send = true and is_duplicate = false;
