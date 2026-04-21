-- Part A: Create market_price_cache table
CREATE TABLE IF NOT EXISTS public.market_price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  brand TEXT,
  model TEXT,
  asset_name TEXT NOT NULL,
  condition TEXT NOT NULL,
  category TEXT,
  price_sar NUMERIC(12, 2) NOT NULL,
  confidence TEXT NOT NULL,
  reasoning TEXT,
  source TEXT,
  price_range JSONB,
  gemini_sources JSONB,
  gemini_reasoning TEXT,
  serper_calls INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_cache_key ON public.market_price_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON public.market_price_cache(expires_at);

-- Part B: RLS - service role only
ALTER TABLE public.market_price_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access" ON public.market_price_cache;
CREATE POLICY "service_role_full_access" ON public.market_price_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Part C: Add pricing columns to listing_assets only if the table exists
DO $$
BEGIN
  IF to_regclass('public.listing_assets') IS NOT NULL THEN
    ALTER TABLE public.listing_assets
      ADD COLUMN IF NOT EXISTS price_sar NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS price_confidence TEXT,
      ADD COLUMN IF NOT EXISTS price_reasoning TEXT,
      ADD COLUMN IF NOT EXISTS price_source TEXT,
      ADD COLUMN IF NOT EXISTS price_sources_json JSONB,
      ADD COLUMN IF NOT EXISTS price_range_json JSONB,
      ADD COLUMN IF NOT EXISTS priced_at TIMESTAMPTZ;
  END IF;
END $$;