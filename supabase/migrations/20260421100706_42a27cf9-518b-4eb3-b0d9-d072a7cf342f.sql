ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS pricing_status TEXT DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS pricing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pricing_completed_at TIMESTAMPTZ;