CREATE OR REPLACE FUNCTION public.fn_trigger_reanalysis_on_listing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  _supabase_url text;
  _service_key text;
  _anon_key text;
  _should_trigger boolean := false;
BEGIN
  -- Condition 1 (NEW): listing just became published (any → published)
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'published' THEN
    _should_trigger := true;
  END IF;

  -- Condition 2 (KEPT): published listing with substantive content change
  IF NEW.status = 'published' AND NOT _should_trigger THEN
    IF (
      OLD.price IS DISTINCT FROM NEW.price OR
      OLD.business_activity IS DISTINCT FROM NEW.business_activity OR
      OLD.description IS DISTINCT FROM NEW.description OR
      OLD.photos IS DISTINCT FROM NEW.photos OR
      OLD.documents IS DISTINCT FROM NEW.documents OR
      OLD.inventory IS DISTINCT FROM NEW.inventory
    ) THEN
      _should_trigger := true;
    END IF;
  END IF;

  IF NOT _should_trigger THEN
    RETURN NEW;
  END IF;

  -- Read secrets from vault
  _supabase_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1);
  _service_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1);
  _anon_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1);

  IF _supabase_url IS NOT NULL AND _service_key IS NOT NULL THEN
    PERFORM extensions.http_post(
      url := _supabase_url || '/functions/v1/auto-analyze-listing',
      body := jsonb_build_object('listingId', NEW.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_key,
        'apikey', COALESCE(_anon_key, '')
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop old BEFORE UPDATE trigger and recreate as AFTER UPDATE
DROP TRIGGER IF EXISTS trg_reanalyze_on_listing_change ON public.listings;

CREATE TRIGGER trg_reanalyze_on_listing_change
AFTER UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_reanalysis_on_listing_change();