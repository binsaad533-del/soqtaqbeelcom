
CREATE OR REPLACE FUNCTION public.fn_validate_listing_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only validate when status is being changed to 'published'
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    -- Must have business_activity
    IF NEW.business_activity IS NULL OR TRIM(NEW.business_activity) = '' THEN
      RAISE EXCEPTION 'Cannot publish: business activity is required';
    END IF;

    -- Must have city
    IF NEW.city IS NULL OR TRIM(NEW.city) = '' THEN
      RAISE EXCEPTION 'Cannot publish: city is required';
    END IF;

    -- Must have valid price
    IF NEW.price IS NULL OR NEW.price <= 0 THEN
      RAISE EXCEPTION 'Cannot publish: a valid price greater than zero is required';
    END IF;

    -- Must have at least one photo
    IF NEW.photos IS NULL OR NEW.photos = '{}'::jsonb OR NEW.photos = 'null'::jsonb THEN
      RAISE EXCEPTION 'Cannot publish: at least one photo is required';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_listing_publish
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_listing_publish();
