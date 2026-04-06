
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS ai_detected_assets_images jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_detected_assets_files jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_assets_combined jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_analysis_updated_at timestamp with time zone DEFAULT NULL;
