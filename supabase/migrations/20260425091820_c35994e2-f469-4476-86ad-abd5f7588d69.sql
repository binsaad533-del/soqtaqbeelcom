-- Invalidate translation cache for the specific listing so the new fields
-- (business_activity, lease_*, liabilities, municipality_license, etc.)
-- get translated on the next view in any non-Arabic language.
DELETE FROM public.listing_translations
WHERE listing_id = '3712f918-25c9-4d1c-9451-163601189f2d';