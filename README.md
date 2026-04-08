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
