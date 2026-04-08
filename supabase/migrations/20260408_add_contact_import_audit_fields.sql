alter table public.contacts
  add column if not exists source_project text,
  add column if not exists source_table text,
  add column if not exists source_record_id text,
  add column if not exists source_phone_field text,
  add column if not exists whatsapp_phone text,
  add column if not exists alternate_phone text,
  add column if not exists phone_candidates jsonb,
  add column if not exists validity_status text,
  add column if not exists duplicate_status text,
  add column if not exists imported_at timestamptz,
  add column if not exists source_updated_at timestamptz;

create unique index if not exists contacts_source_identity_uidx
  on public.contacts(source_project, source_table, source_record_id)
  where source_project is not null and source_table is not null and source_record_id is not null;

create index if not exists contacts_validity_status_idx
  on public.contacts(validity_status);

create index if not exists contacts_duplicate_status_idx
  on public.contacts(duplicate_status);
