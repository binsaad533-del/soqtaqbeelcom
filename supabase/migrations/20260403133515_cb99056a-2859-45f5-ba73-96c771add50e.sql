
-- Add area_sqm column to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS area_sqm numeric NULL;

-- Update publish validation trigger to require location
CREATE OR REPLACE FUNCTION public.fn_validate_listing_publish()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN

    -- Must have valid price (required for ALL deal types)
    IF NEW.price IS NULL OR NEW.price <= 0 THEN
      RAISE EXCEPTION 'Cannot publish: a valid price greater than zero is required';
    END IF;

    -- All types: business_activity + city + price required
    IF NEW.business_activity IS NULL OR TRIM(NEW.business_activity) = '' THEN
      RAISE EXCEPTION 'Cannot publish: business activity is required';
    END IF;
    IF NEW.city IS NULL OR TRIM(NEW.city) = '' THEN
      RAISE EXCEPTION 'Cannot publish: city is required';
    END IF;

    -- Location is mandatory for publishing
    IF NEW.location_lat IS NULL OR NEW.location_lng IS NULL THEN
      RAISE EXCEPTION 'Cannot publish: location (map coordinates) is required';
    END IF;

    -- Photos required only for asset-related deal types (without CR/lease transfer)
    IF NEW.primary_deal_type IN ('assets_only', 'assets_setup') THEN
      IF NEW.photos IS NULL OR NEW.photos = '{}'::jsonb OR NEW.photos = 'null'::jsonb THEN
        RAISE EXCEPTION 'Cannot publish: at least one photo is required for this deal type';
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;
