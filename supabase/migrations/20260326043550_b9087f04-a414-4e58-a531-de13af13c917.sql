-- Tighten notification insert: only authenticated users for their own
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Auth users insert own notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'platform_owner'));

-- Tighten audit_logs: only authenticated
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Auth users insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'platform_owner'));

-- Add rate limiting function for listing creation
CREATE OR REPLACE FUNCTION public.check_listing_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.listings
  WHERE owner_id = NEW.owner_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 5 listings per hour';
  END IF;

  RETURN NEW;
END;
$$;

-- Rate limit trigger
DROP TRIGGER IF EXISTS rate_limit_listings ON public.listings;
CREATE TRIGGER rate_limit_listings
  BEFORE INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_listing_rate_limit();

-- Rate limiting for deal creation
CREATE OR REPLACE FUNCTION public.check_deal_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.deals
  WHERE (buyer_id = NEW.buyer_id OR seller_id = NEW.seller_id)
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 10 deals per hour';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rate_limit_deals ON public.deals;
CREATE TRIGGER rate_limit_deals
  BEFORE INSERT ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.check_deal_rate_limit();

-- Rate limiting for offer creation
CREATE OR REPLACE FUNCTION public.check_offer_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.listing_offers
  WHERE buyer_id = NEW.buyer_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 20 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 20 offers per hour';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rate_limit_offers ON public.listing_offers;
CREATE TRIGGER rate_limit_offers
  BEFORE INSERT ON public.listing_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_offer_rate_limit();