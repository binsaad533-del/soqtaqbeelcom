-- ============================================
-- Commit 1: File Classifications System
-- ============================================

-- 1. Create file_classifications table
CREATE TABLE public.file_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,

  ai_category TEXT NOT NULL,
  ai_confidence TEXT NOT NULL,
  ai_reasoning TEXT,
  ai_subcategory TEXT,

  final_category TEXT NOT NULL,
  final_subcategory TEXT,

  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  classified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,

  CONSTRAINT file_classifications_listing_url_unique UNIQUE (listing_id, file_url)
);

-- 2. Indexes
CREATE INDEX idx_file_class_listing ON public.file_classifications(listing_id);
CREATE INDEX idx_file_class_url ON public.file_classifications(file_url);
CREATE INDEX idx_file_class_listing_confirmed ON public.file_classifications(listing_id, is_confirmed);

-- 3. Enable RLS
ALTER TABLE public.file_classifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Owners manage own classifications"
ON public.file_classifications
FOR ALL
TO authenticated
USING (
  listing_id IN (SELECT id FROM public.listings WHERE owner_id = auth.uid())
)
WITH CHECK (
  listing_id IN (SELECT id FROM public.listings WHERE owner_id = auth.uid())
);

CREATE POLICY "Platform staff can view all classifications"
ON public.file_classifications
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'platform_owner')
  OR public.has_role(auth.uid(), 'supervisor')
);

CREATE POLICY "Service role full access classifications"
ON public.file_classifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Trigger: auto-set confirmed_at when is_confirmed flips to true
CREATE OR REPLACE FUNCTION public.fn_set_classification_confirmed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_confirmed = true AND (OLD.is_confirmed IS DISTINCT FROM true) THEN
    NEW.confirmed_at := now();
  ELSIF NEW.is_confirmed = false THEN
    NEW.confirmed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_classification_confirmed_at
BEFORE UPDATE ON public.file_classifications
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_classification_confirmed_at();

-- 6. Add uses_unified_upload column to listings
ALTER TABLE public.listings
ADD COLUMN uses_unified_upload BOOLEAN NOT NULL DEFAULT false;

-- 7. Documentation
COMMENT ON TABLE public.file_classifications IS
  'Stores AI classification + seller confirmation for files uploaded during listing creation (unified upload flow)';
COMMENT ON COLUMN public.listings.uses_unified_upload IS
  'true = listing created via unified upload + classification flow. false = legacy flow.';