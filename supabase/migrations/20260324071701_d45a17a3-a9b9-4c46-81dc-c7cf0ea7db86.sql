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

    -- Deal-type-specific validation
    CASE COALESCE(NEW.primary_deal_type, 'full_takeover')

      WHEN 'cr_only' THEN
        -- CR-only: only price is strictly required; business_activity/city are optional
        NULL;

      WHEN 'location_only' THEN
        -- Location: city + price required
        IF NEW.city IS NULL OR TRIM(NEW.city) = '' THEN
          RAISE EXCEPTION 'Cannot publish: city is required for this deal type';
        END IF;

      ELSE
        -- All other types: business_activity + city + price required
        IF NEW.business_activity IS NULL OR TRIM(NEW.business_activity) = '' THEN
          RAISE EXCEPTION 'Cannot publish: business activity is required';
        END IF;
        IF NEW.city IS NULL OR TRIM(NEW.city) = '' THEN
          RAISE EXCEPTION 'Cannot publish: city is required';
        END IF;

        -- Photos required only for asset-related deal types
        IF NEW.primary_deal_type IN ('assets_only', 'assets_setup', 'assets_cr', 'assets_cr_name') THEN
          IF NEW.photos IS NULL OR NEW.photos = '{}'::jsonb OR NEW.photos = 'null'::jsonb THEN
            RAISE EXCEPTION 'Cannot publish: at least one photo is required for this deal type';
          END IF;
        END IF;

    END CASE;
  END IF;

  RETURN NEW;
END;
$function$;