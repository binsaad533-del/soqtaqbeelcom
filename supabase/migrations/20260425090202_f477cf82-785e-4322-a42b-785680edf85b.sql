CREATE TABLE public.listing_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'zh', 'hi', 'ur', 'bn')),
  translated_data jsonb NOT NULL,
  source_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, language)
);

CREATE INDEX idx_listing_translations_lookup 
  ON public.listing_translations(listing_id, language);

ALTER TABLE public.listing_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read translations"
  ON public.listing_translations FOR SELECT
  USING (true);

CREATE POLICY "Service role manage translations"
  ON public.listing_translations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_listing_translations_updated_at
  BEFORE UPDATE ON public.listing_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();