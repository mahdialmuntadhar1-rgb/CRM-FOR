-- Adds non-destructive helper columns for phone normalization and queue traceability.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS normalized_phone text,
  ADD COLUMN IF NOT EXISTS normalized_phone_source text,
  ADD COLUMN IF NOT EXISTS phone_valid boolean,
  ADD COLUMN IF NOT EXISTS phone_invalid_reason text;

CREATE INDEX IF NOT EXISTS idx_businesses_phone_valid ON public.businesses (phone_valid);
CREATE INDEX IF NOT EXISTS idx_businesses_normalized_phone ON public.businesses (normalized_phone);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS selected_phone text,
  ADD COLUMN IF NOT EXISTS phone_source text;

CREATE INDEX IF NOT EXISTS idx_messages_selected_phone ON public.messages (selected_phone);
