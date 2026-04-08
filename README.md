# WhatsApp CRM (Nabda Orchestrator)

Production-focused React + TypeScript + Vite CRM for controlled WhatsApp bulk outreach.

## Locked Supabase Project (CRM only)
This app is intentionally locked to:
- `https://ujdsxzvvgaugypwtugdl.supabase.co`

Do **not** point this CRM to Belive or any other Supabase project.

## Core dashboard areas
- Overview
- Templates
- Recipients
- Test Send
- Campaigns / Queue
- Send Logs
- Inbox / Replies (placeholder)
- Settings

## Run locally
1. `npm install`
2. (Optional) set these env vars to the same locked project values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. `npm run dev`

## Minimal schema
Run migrations in order:
1. `supabase/migrations/20260407_add_phone_normalization_fields.sql`
2. `supabase/migrations/20260408_crm_core_tables.sql`
3. `supabase/migrations/20260408_fix_crm_schema_and_ops.sql`
4. `supabase/migrations/20260408_add_contact_import_audit_fields.sql`


## Cross-database recipient import (server-side only)
Use the migration script to import recipients from a separate source Supabase project into the locked CRM project.

Required environment variables:
- `SOURCE_SUPABASE_URL`
- `SOURCE_SUPABASE_SERVICE_ROLE_KEY`
- `TARGET_SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- Optional: `TARGET_SUPABASE_URL` (must stay `https://ujdsxzvvgaugypwtugdl.supabase.co`)

Run in dry-run mode first:
```bash
npm run migrate:recipients -- --source-tables=businesses,contacts
```

Run write mode:
```bash
npm run migrate:recipients -- --source-tables=businesses,contacts --dry-run=false
```

The importer is idempotent via upsert conflict key: `(source_project, source_table, source_record_id)`.

## Nabda integration
- Frontend queues messages into `messages`.
- Actual sending should happen from server-side Supabase Edge Functions:
  - `nabda-send`
  - `nabda-queue-processor`
- Keep Nabda secrets server-side only.

## Phone normalization
Accepted Iraqi mobile inputs are normalized to `+9647XXXXXXXXX`:
- `07xxxxxxxxx`
- `7xxxxxxxxx`
- `9647xxxxxxxxx`
- `+9647xxxxxxxxx`

Invalid/duplicate numbers are marked and excluded from sending.


## Edge functions to deploy
Deploy these to enable diagnostics and sending:
- `crm-health`
- `nabda-send`
- `nabda-queue-processor`
- `nabda-webhook`

Example:
```bash
supabase functions deploy crm-health
supabase functions deploy nabda-send
supabase functions deploy nabda-queue-processor
supabase functions deploy nabda-webhook
```

Webhook endpoint: `https://<project-ref>.supabase.co/functions/v1/nabda-webhook`
