
-- 1) Soft-delete columns for listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- 2) Replace DELETE policy with soft-delete approach
DROP POLICY IF EXISTS "Owner can delete draft listings" ON public.listings;

-- Update published visibility to exclude soft-deleted
DROP POLICY IF EXISTS "Published listings visible to all" ON public.listings;
CREATE POLICY "Published listings visible to all"
ON public.listings
FOR SELECT
USING (status = 'published' AND deleted_at IS NULL);

-- Owner view includes soft-deleted for archive access
DROP POLICY IF EXISTS "Owner can view own listings" ON public.listings;
CREATE POLICY "Owner can view own listings"
ON public.listings
FOR SELECT
USING (auth.uid() = owner_id);

-- 3) Auto-log deal changes to deal_history
CREATE OR REPLACE FUNCTION public.log_deal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  changes jsonb := '{}'::jsonb;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    changes := changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
  END IF;
  IF OLD.agreed_price IS DISTINCT FROM NEW.agreed_price THEN
    changes := changes || jsonb_build_object('agreed_price', jsonb_build_object('old', OLD.agreed_price, 'new', NEW.agreed_price));
  END IF;
  IF OLD.deal_type IS DISTINCT FROM NEW.deal_type THEN
    changes := changes || jsonb_build_object('deal_type', jsonb_build_object('old', OLD.deal_type, 'new', NEW.deal_type));
  END IF;
  IF OLD.locked IS DISTINCT FROM NEW.locked THEN
    changes := changes || jsonb_build_object('locked', jsonb_build_object('old', OLD.locked, 'new', NEW.locked));
  END IF;
  IF OLD.deal_details IS DISTINCT FROM NEW.deal_details THEN
    changes := changes || jsonb_build_object('deal_details_changed', true);
  END IF;

  IF changes != '{}'::jsonb THEN
    INSERT INTO public.deal_history (deal_id, actor_id, action, details)
    VALUES (NEW.id, auth.uid(), 'deal_updated', changes);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_deal_changes
AFTER UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.log_deal_changes();

-- 4) Auto-log listing changes for version tracking
CREATE OR REPLACE FUNCTION public.log_listing_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  changes jsonb := '{}'::jsonb;
BEGIN
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    changes := changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
  END IF;
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    changes := changes || jsonb_build_object('price', jsonb_build_object('old', OLD.price, 'new', NEW.price));
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    changes := changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
  END IF;
  IF OLD.deal_type IS DISTINCT FROM NEW.deal_type THEN
    changes := changes || jsonb_build_object('deal_type', jsonb_build_object('old', OLD.deal_type, 'new', NEW.deal_type));
  END IF;
  IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
    changes := changes || jsonb_build_object('deleted_at', jsonb_build_object('old', OLD.deleted_at, 'new', NEW.deleted_at));
  END IF;

  IF changes != '{}'::jsonb THEN
    INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
    VALUES (auth.uid(), 'listing_updated', 'listing', NEW.id::text, changes);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_listing_changes
AFTER UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.log_listing_changes();
