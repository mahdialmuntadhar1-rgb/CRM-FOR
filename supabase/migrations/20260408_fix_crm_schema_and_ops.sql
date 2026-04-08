create extension if not exists pgcrypto;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  original_name text,
  display_name text,
  raw_phone text,
  normalized_phone text,
  governorate text,
  category text,
  is_phone_valid boolean not null default false,
  is_duplicate boolean not null default false,
  ready_to_send boolean not null default false,
  last_sent_at timestamptz,
  last_message_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contacts
  add column if not exists original_name text,
  add column if not exists display_name text,
  add column if not exists raw_phone text,
  add column if not exists normalized_phone text,
  add column if not exists governorate text,
  add column if not exists category text,
  add column if not exists is_phone_valid boolean default false,
  add column if not exists is_duplicate boolean default false,
  add column if not exists ready_to_send boolean default false,
  add column if not exists last_sent_at timestamptz,
  add column if not exists last_message_status text,
  add column if not exists updated_at timestamptz default now();

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
  filter_summary text not null default '{}',
  target_count integer not null default 0,
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  template_id uuid references public.message_templates(id) on delete set null,
  normalized_phone text not null,
  rendered_message text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.send_logs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  normalized_phone text not null,
  status text not null,
  provider text not null default 'nabda',
  provider_message_id text,
  details text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete set null,
  provider_message_id text,
  normalized_phone text,
  body text,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'nabda',
  event_type text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists contacts_ready_to_send_idx on public.contacts(ready_to_send, is_duplicate, is_phone_valid);
create unique index if not exists contacts_normalized_phone_unique_ready_idx
  on public.contacts(normalized_phone)
  where normalized_phone is not null and ready_to_send = true and is_duplicate = false;
create index if not exists messages_status_created_at_idx on public.messages(status, created_at);
create index if not exists messages_provider_message_id_idx on public.messages(provider_message_id);
create index if not exists messages_campaign_id_idx on public.messages(campaign_id);
create index if not exists send_logs_message_id_idx on public.send_logs(message_id, created_at desc);
create index if not exists send_logs_campaign_id_idx on public.send_logs(campaign_id, created_at desc);
create index if not exists replies_phone_created_at_idx on public.replies(normalized_phone, created_at desc);
create index if not exists webhook_events_created_at_idx on public.webhook_events(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contacts_set_updated_at on public.contacts;
create trigger trg_contacts_set_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

drop trigger if exists trg_message_templates_set_updated_at on public.message_templates;
create trigger trg_message_templates_set_updated_at
before update on public.message_templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_campaigns_set_updated_at on public.campaigns;
create trigger trg_campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

drop trigger if exists trg_messages_set_updated_at on public.messages;
create trigger trg_messages_set_updated_at
before update on public.messages
for each row execute function public.set_updated_at();
