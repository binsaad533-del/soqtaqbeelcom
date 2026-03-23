
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS deal_options jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS deal_disclosures jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS required_documents jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_structure_validation jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS primary_deal_type text DEFAULT NULL;
