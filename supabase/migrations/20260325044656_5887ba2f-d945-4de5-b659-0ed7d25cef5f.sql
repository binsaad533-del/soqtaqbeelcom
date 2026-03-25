ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS location_lat numeric DEFAULT NULL;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS location_lng numeric DEFAULT NULL;