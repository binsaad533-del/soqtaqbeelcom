CREATE OR REPLACE FUNCTION public.fn_trigger_reanalysis_on_listing_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'net'
AS $function$
DECLARE
  _supabase_url text;
  _service_key text;
  _anon_key text;
  _should_trigger boolean := false;
  _request_id bigint;
BEGIN
  -- Debounce: skip if AI analysis was updated within the last 30 seconds.
  -- This prevents cascade loops when AI itself updates the listing row.
  IF NEW.ai_analysis_updated_at IS NOT NULL
     AND NEW.ai_analysis_updated_at > now() - interval '30 seconds' THEN
    RETURN NEW;
  END IF;

  -- Condition 1: listing just became published (any → published)
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'published' THEN
    _should_trigger := true;
  END IF;

  -- Condition 2: published listing with substantive USER-driven content change.
  -- IMPORTANT: `inventory` is intentionally EXCLUDED from this watch list,
  -- because it is mutated by AI (detect-assets / price-assets) and would
  -- otherwise cause infinite re-analysis loops.
  IF NEW.status = 'published' AND NOT _should_trigger THEN
    IF (
      OLD.price IS DISTINCT FROM NEW.price OR
      OLD.business_activity IS DISTINCT FROM NEW.business_activity OR
      OLD.description IS DISTINCT FROM NEW.description OR
      OLD.photos IS DISTINCT FROM NEW.photos OR
      OLD.documents IS DISTINCT FROM NEW.documents
      -- removed: OR OLD.inventory IS DISTINCT FROM NEW.inventory
    ) THEN
      _should_trigger := true;
    END IF;
  END IF;

  IF NOT _should_trigger THEN
    RETURN NEW;
  END IF;

  -- Read secrets from vault
  BEGIN
    SELECT decrypted_secret INTO _supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
    SELECT decrypted_secret INTO _service_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
    SELECT decrypted_secret INTO _anon_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.audit_logs(action, resource_type, resource_id, details)
    VALUES ('trigger_reanalysis_vault_error', 'listing', NEW.id::text,
            jsonb_build_object('error', SQLERRM));
    RETURN NEW;
  END;

  IF _supabase_url IS NULL OR _service_key IS NULL THEN
    INSERT INTO public.audit_logs(action, resource_type, resource_id, details)
    VALUES ('trigger_reanalysis_missing_secrets', 'listing', NEW.id::text,
            jsonb_build_object('url_present', _supabase_url IS NOT NULL, 'key_present', _service_key IS NOT NULL));
    RETURN NEW;
  END IF;

  -- Fire-and-forget HTTP call (60s safety timeout)
  BEGIN
    SELECT net.http_post(
      url := _supabase_url || '/functions/v1/auto-analyze-listing',
      body := jsonb_build_object('listingId', NEW.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_key,
        'apikey', COALESCE(_anon_key, '')
      ),
      timeout_milliseconds := 60000
    ) INTO _request_id;

    INSERT INTO public.audit_logs(action, resource_type, resource_id, details)
    VALUES ('trigger_reanalysis_dispatched', 'listing', NEW.id::text,
            jsonb_build_object('request_id', _request_id, 'url', _supabase_url || '/functions/v1/auto-analyze-listing'));
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.audit_logs(action, resource_type, resource_id, details)
    VALUES ('trigger_reanalysis_http_error', 'listing', NEW.id::text,
            jsonb_build_object('error', SQLERRM));
  END;

  RETURN NEW;
END;
$function$;