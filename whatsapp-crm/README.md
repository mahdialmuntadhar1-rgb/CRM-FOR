# WhatsApp CRM - Bulk Messaging System

A complete Node.js + TypeScript CLI tool for Iraqi business outreach via WhatsApp. Fetches contacts from Supabase, personalizes messages, sends via Nabda OTP API, tracks status, and logs everything.

## Features

- **3 Message Strategies**: Direct Link, Reply Hook (2-step), Curiosity Hook
- **Dual Contact Sources**: Supabase database or local CSV files
- **Human-like Timing**: Configurable delays, batching, and randomization
- **Real-time Tracking**: Status updates in Supabase with full logging
- **Webhook Listener**: Automatic follow-up responses for Strategy B
- **Graceful Shutdown**: Ctrl+C saves progress
- **Dry-run Mode**: Test without sending

## Installation

```bash
# Install dependencies
npm install

# Copy environment template and fill in credentials
copy .env.example .env
# Edit .env with your actual Supabase and Nabda OTP credentials
```

## Database Setup

Run this SQL in your Supabase SQL Editor to add the required columns:

```sql
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS whatsapp_status TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_businesses_whatsapp_status ON businesses(whatsapp_status);
```

## Usage

### Send Campaign

```bash
# Default campaign (Strategy A, Supabase source)
npm run send

# Strategy B (Reply Hook) with webhook listener
npm run send -- --strategy=B --webhook

# Custom settings
npm run send -- \
  --strategy=C \
  --limit=50 \
  --delay=30 \
  --variance=15 \
  --batch=10 \
  --source=csv \
  --csv=contacts.csv

# Dry run (test without sending)
npm run send -- --dry-run --limit=5
```

### Test Single Message

```bash
npm run test -- --phone=9647701234567 --strategy=A
```

### View Statistics

```bash
npm run stats
```

### Reset Campaign (Clear all statuses)

```bash
npm run reset
```

### Start Webhook Server Only

```bash
npm run webhook
```

## CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--strategy=A\|B\|C` | Message strategy | A |
| `--limit=N` | Max contacts to message | All |
| `--delay=seconds` | Base delay between messages | 20 |
| `--variance=seconds` | Random extra delay | 10 |
| `--batch=N` | Messages per batch | 20 |
| `--batch-pause=seconds` | Pause between batches | 180 |
| `--source=supabase\|csv` | Contact source | supabase |
| `--csv=path` | CSV file path (if source=csv) | - |
| `--template=path` | Custom message template | - |
| `--dry-run` | Test without sending | false |
| `--webhook` | Start webhook listener | false |

## Message Strategies

### Strategy A - Direct Link
Single message with direct CTA:
```
{Business Name} 👋

نُدرج مشروعك في Iraq Compass — أكبر دليل أعمال عراقي مجاني...
```

### Strategy B - Reply Hook
Two-step approach:
1. Send curiosity message asking for reply
2. Webhook automatically sends follow-up when they reply "نعم"

### Strategy C - Curiosity Hook
Question-based engagement to spark interest:
```
{Business Name}، سؤال سريع 🤔

كم عميل جديد تجيبهم من الإنترنت شهرياً؟
...
```

## CSV Format

When using `--source=csv`, your file should have columns:
- `name` (or `Name`, `NAME`) - Business name
- `phone` (or `Phone`, `PHONE`) - Phone number starting with 964

Example:
```csv
name,phone
Acme Corp,9647701234567
My Store,9647809876543
```

## Custom Templates

Create a `.txt` file with `{name}` placeholder:

```
Hello {name}!

This is my custom message...
```

Then use: `--template=./my-message.txt`

## Webhook Setup (Strategy B)

For Strategy B follow-ups to work, configure your Nabda OTP webhook to point to:
```
http://YOUR_SERVER_IP:3001/webhook
```

Or use a tunnel like ngrok for local testing:
```bash
ngrok http 3001
```

## Project Structure

```
whatsapp-crm/
├── src/
│   ├── index.ts      # CLI entry point
│   ├── sender.ts     # Core sending engine
│   ├── templates.ts  # Message templates
│   ├── timing.ts     # Delay calculation
│   ├── supabase.ts   # Database operations
│   ├── nabda.ts      # WhatsApp API client
│   ├── webhook.ts    # Express webhook server
│   ├── logger.ts     # Console + CSV logging
│   ├── csv-loader.ts # CSV parsing
│   └── types.ts      # TypeScript interfaces
├── .env              # Your credentials (not in git)
├── .env.example      # Template
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NABDA_BASE_URL` | Nabda OTP instance URL | Yes |
| `NABDA_TOKEN` | API Bearer token | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon key | Yes* |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes* |
| `WEBHOOK_PORT` | Webhook server port | No (default: 3001) |

\* Either ANON_KEY or SERVICE_KEY is required. Service key needed for updates.

## Safety Features

- **Hard minimum**: 8-second delay between messages enforced
- **Phone validation**: Must start with 964, cleaned of + and spaces
- **Graceful degradation**: Continues on Supabase errors
- **Progress saving**: CSV logs every send, even on crash
- **SIGINT handling**: Ctrl+C stops cleanly with summary

## License

MIT
