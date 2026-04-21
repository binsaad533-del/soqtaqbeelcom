CREATE OR REPLACE FUNCTION public.fn_trigger_reanalysis_on_listing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $function$
DECLARE
  _supabase_url text;
  _service_key text;
  _anon_key text;
  _should_trigger boolean := false;
  _request_id bigint;
BEGIN
  -- Condition 1: listing just became published (any → published)
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'published' THEN
    _should_trigger := true;
  END IF;

  -- Condition 2: published listing with substantive content change
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

  -- Use net.http_post (the only http_post available in this project)
  BEGIN
    SELECT net.http_post(
      url := _supabase_url || '/functions/v1/auto-analyze-listing',
      body := jsonb_build_object('listingId', NEW.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_key,
        'apikey', COALESCE(_anon_key, '')
      )
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