-- Drop unused seller_verifications system entirely
-- Table has 0 rows, no triggers, no FKs, no dependencies
DROP TABLE IF EXISTS public.seller_verifications CASCADE;

-- Drop unused PII masking helper (was only useful for the dropped table)
DROP FUNCTION IF EXISTS public.mask_id_number(text, uuid);
DROP FUNCTION IF EXISTS public.mask_id_number(text);