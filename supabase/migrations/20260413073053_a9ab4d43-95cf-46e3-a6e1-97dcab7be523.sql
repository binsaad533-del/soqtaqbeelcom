
-- Add last_updated_at to feasibility_studies
ALTER TABLE public.feasibility_studies 
ADD COLUMN IF NOT EXISTS last_updated_at timestamptz NOT NULL DEFAULT now();

-- Update existing rows
UPDATE public.feasibility_studies SET last_updated_at = created_at WHERE last_updated_at = now();

-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function that triggers re-analysis when listing data changes
CREATE OR REPLACE FUNCTION public.fn_trigger_reanalysis_on_listing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _supabase_url text;
  _service_key text;
  _anon_key text;
BEGIN
  -- Only for published listings
  IF NEW.status != 'published' THEN RETURN NEW; END IF;

  -- Check if important fields changed
  IF (
    OLD.price IS DISTINCT FROM NEW.price OR
    OLD.business_activity IS DISTINCT FROM NEW.business_activity OR
    OLD.deal_type IS DISTINCT FROM NEW.deal_type OR
    OLD.primary_deal_type IS DISTINCT FROM NEW.primary_deal_type OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.inventory IS DISTINCT FROM NEW.inventory OR
    OLD.documents IS DISTINCT FROM NEW.documents
  ) THEN
    -- Clear the analysis cache to force refresh
    NEW.ai_analysis_cache = NULL;
    NEW.ai_structure_validation = NULL;

    -- Call auto-analyze edge function via pg_net
    _supabase_url := current_setting('app.settings.supabase_url', true);
    _service_key := current_setting('app.settings.service_role_key', true);
    _anon_key := current_setting('app.settings.anon_key', true);

    -- Use direct URL if app settings not available
    IF _supabase_url IS NULL OR _supabase_url = '' THEN
      _supabase_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1);
    END IF;
    IF _service_key IS NULL OR _service_key = '' THEN
      _service_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1);
    END IF;
    IF _anon_key IS NULL OR _anon_key = '' THEN
      _anon_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1);
    END IF;

    IF _supabase_url IS NOT NULL AND _service_key IS NOT NULL THEN
      PERFORM extensions.http_post(
        url := _supabase_url || '/functions/v1/auto-analyze-listing',
        body := jsonb_build_object('listingId', NEW.id::text),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || _service_key,
          'apikey', COALESCE(_anon_key, '')
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_reanalyze_on_listing_change ON public.listings;
CREATE TRIGGER trg_reanalyze_on_listing_change
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trigger_reanalysis_on_listing_change();
