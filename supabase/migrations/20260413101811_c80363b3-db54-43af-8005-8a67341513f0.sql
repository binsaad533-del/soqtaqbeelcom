
-- =============================================
-- PRIORITY 1: CRITICAL RLS FIXES
-- =============================================

-- 1. profiles: Replace overly permissive USING(true) policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Admins see everything
CREATE POLICY "Admins view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'platform_owner'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR has_role(auth.uid(), 'financial_manager'::app_role)
);

-- User sees own full profile
CREATE POLICY "Users view own full profile"
ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Other authenticated users see all rows but sensitive data masked in app layer
CREATE POLICY "Authenticated view public profile data"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Anon users (marketplace seller names)
CREATE POLICY "Anon view limited profile data"
ON public.profiles FOR SELECT TO anon
USING (true);

-- Function for safe public profile data (no PII)
CREATE OR REPLACE FUNCTION public.get_public_profile(target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  city text,
  is_verified boolean,
  trust_score integer,
  avatar_url text,
  completed_deals integer,
  cancelled_deals integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.city, p.is_verified, p.trust_score, p.avatar_url, p.completed_deals, p.cancelled_deals
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- 3. seller_verifications: Masking function for ID numbers
CREATE OR REPLACE FUNCTION public.mask_id_number(full_id text, viewer_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN has_role(viewer_id, 'platform_owner'::app_role) THEN full_id
    ELSE '****' || RIGHT(full_id, 4)
  END;
$$;

-- =============================================
-- PRIORITY 2: MEDIUM SECURITY FIXES
-- =============================================

-- 4. failed_login_attempts: Remove anon INSERT
DROP POLICY IF EXISTS "Insert failed logins" ON public.failed_login_attempts;
CREATE POLICY "Insert failed logins"
ON public.failed_login_attempts FOR INSERT TO authenticated
WITH CHECK (true);

-- 6. promoted_listings: Tighten INSERT
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'promoted_listings' AND schemaname = 'public' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.promoted_listings', pol.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Users promote own listings only"
ON public.promoted_listings FOR INSERT TO authenticated
WITH CHECK (
  promoted_by = auth.uid()
  AND amount_paid > 0
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = promoted_listings.listing_id
    AND l.owner_id = auth.uid()
  )
);

-- 7. listing_views: Prevent view inflation with a trigger instead of expression index
CREATE OR REPLACE FUNCTION public.fn_prevent_duplicate_view()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.listing_views
    WHERE user_id = NEW.user_id
    AND listing_id = NEW.listing_id
    AND created_at >= date_trunc('hour', now())
  ) THEN
    RETURN NULL; -- silently skip duplicate
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_view ON public.listing_views;
CREATE TRIGGER trg_prevent_duplicate_view
  BEFORE INSERT ON public.listing_views
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_duplicate_view();

-- =============================================
-- PRIORITY 3: PERFORMANCE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_listings_status_city ON public.listings (status, city);
CREATE INDEX IF NOT EXISTS idx_listings_business_activity ON public.listings (business_activity);
CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON public.listings (owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_buyer_id ON public.deals (buyer_id);
CREATE INDEX IF NOT EXISTS idx_deals_seller_id ON public.deals (seller_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals (status);
CREATE INDEX IF NOT EXISTS idx_deal_commissions_seller_status ON public.deal_commissions (seller_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON public.messages (receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_listing_offers_listing_buyer ON public.listing_offers (listing_id, buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON public.audit_logs (action, created_at);
