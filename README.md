<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f0f0f80d-81d5-488a-a335-7fefb7139d2e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase phone pipeline (backend)

These scripts use Supabase directly as source-of-truth (no CSV flow):

1. Run schema migration (adds helper columns only, preserves raw phone values):
   - `supabase/migrations/20260407_add_phone_normalization_fields.sql`
2. Audit current phone quality and field usage:
   - `npm run audit:phones`
3. Normalize/select best phone and update helper columns:
   - Dry run: `npm run normalize:phones -- --dry-run=true`
   - Write mode: `npm run normalize:phones -- --dry-run=false`
4. Preview valid audience only:
   - `npm run preview:audience -- --limit=20`
5. Create queue from validated phones only:
   - Tiny safe test (max 3):
     `npm run queue:create -- --campaign-id=<id> --template-id=<id> --tiny-test=true --dry-run=false --message="Hello {{business_name}}"`

Normalization output format is E.164 Iraqi mobile: `+9647XXXXXXXXX`.
