-- Add WhatsApp CRM columns to businesses table
-- Run this in your Supabase SQL Editor

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS whatsapp_status TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

-- Create index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_businesses_whatsapp_status ON businesses(whatsapp_status);

-- Create index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_businesses_whatsapp_sent_at ON businesses(whatsapp_sent_at);

-- Optional: Add check constraint for valid statuses
-- ALTER TABLE businesses 
-- ADD CONSTRAINT chk_whatsapp_status 
-- CHECK (whatsapp_status IS NULL OR whatsapp_status IN ('sent', 'failed', 'replied'));

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND column_name IN ('whatsapp_status', 'whatsapp_sent_at');
