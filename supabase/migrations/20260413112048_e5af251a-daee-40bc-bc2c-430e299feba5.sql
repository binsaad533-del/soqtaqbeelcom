
-- 1) Create fraud_flags enum types
DO $$ BEGIN
  CREATE TYPE public.fraud_flag_type AS ENUM (
    'duplicate_images', 'duplicate_text', 'spam_listing',
    'suspicious_account', 'abnormal_pricing', 'rapid_messaging',
    'new_account_publish', 'multi_account_ip'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fraud_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fraud_status AS ENUM ('pending', 'reviewed', 'dismissed', 'confirmed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Create fraud_flags table
CREATE TABLE IF NOT EXISTS public.fraud_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  flag_type fraud_flag_type NOT NULL,
  severity fraud_severity NOT NULL DEFAULT 'medium',
  details jsonb DEFAULT '{}'::jsonb,
  status fraud_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_fraud_flags_user ON public.fraud_flags(user_id);
CREATE INDEX idx_fraud_flags_status ON public.fraud_flags(status);
CREATE INDEX idx_fraud_flags_severity ON public.fraud_flags(severity);
CREATE INDEX idx_fraud_flags_created ON public.fraud_flags(created_at DESC);

-- 3) Add fraud_score to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fraud_score integer NOT NULL DEFAULT 0;

-- 4) RLS for fraud_flags: owner + supervisor read all, owner updates
CREATE POLICY "Platform owners and supervisors can view fraud flags"
  ON public.fraud_flags FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_owner') OR
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Platform owners can update fraud flags"
  ON public.fraud_flags FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_owner'));

CREATE POLICY "Supervisors can update fraud flags"
  ON public.fraud_flags FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- Service role inserts (no INSERT policy needed for anon/authenticated — edge functions use service role)

-- 5) Trigger: prevent more than 3 offers per user per listing
CREATE OR REPLACE FUNCTION public.fn_limit_offers_per_listing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _count integer;
  _fraud integer;
BEGIN
  -- Check fraud_score
  SELECT fraud_score INTO _fraud FROM profiles WHERE user_id = NEW.buyer_id LIMIT 1;
  IF COALESCE(_fraud, 0) > 50 THEN
    RAISE EXCEPTION 'Account restricted from making offers due to suspicious activity';
  END IF;

  -- Check offer price
  IF NEW.offered_price <= 0 THEN
    RAISE EXCEPTION 'Offer price must be positive';
  END IF;

  -- Max 3 offers per user per listing
  SELECT count(*) INTO _count FROM listing_offers
  WHERE buyer_id = NEW.buyer_id AND listing_id = NEW.listing_id AND status NOT IN ('withdrawn', 'rejected');
  IF _count >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 active offers per listing';
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_limit_offers_per_listing ON public.listing_offers;
CREATE TRIGGER trg_limit_offers_per_listing
  BEFORE INSERT ON public.listing_offers
  FOR EACH ROW EXECUTE FUNCTION public.fn_limit_offers_per_listing();

-- 6) Trigger: block publish if fraud_score > 50
CREATE OR REPLACE FUNCTION public.fn_block_publish_high_fraud()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _fraud integer;
BEGIN
  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'published') THEN
    SELECT fraud_score INTO _fraud FROM profiles WHERE user_id = NEW.owner_id LIMIT 1;
    IF COALESCE(_fraud, 0) > 50 THEN
      RAISE EXCEPTION 'Account suspended from publishing due to suspicious activity (fraud_score: %)', _fraud;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_block_publish_high_fraud ON public.listings;
CREATE TRIGGER trg_block_publish_high_fraud
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_publish_high_fraud();

-- 7) Function to auto-suspend on high fraud_score
CREATE OR REPLACE FUNCTION public.fn_auto_suspend_on_fraud_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.fraud_score > 80 AND (OLD.fraud_score IS NULL OR OLD.fraud_score <= 80) THEN
    NEW.is_suspended := true;
    NEW.is_active := false;
    -- Notify platform owners
    INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
    SELECT ur.user_id,
      'تعليق حساب تلقائي — احتيال',
      'تم تعليق حساب ' || COALESCE(NEW.full_name, '') || ' تلقائياً (fraud_score: ' || NEW.fraud_score || ')',
      'security', 'profile', NEW.user_id::text
    FROM user_roles ur WHERE ur.role = 'platform_owner';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_suspend_fraud ON public.profiles;
CREATE TRIGGER trg_auto_suspend_fraud
  BEFORE UPDATE OF fraud_score ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_suspend_on_fraud_score();

-- 8) Updated_at trigger for fraud_flags
CREATE TRIGGER update_fraud_flags_updated_at
  BEFORE UPDATE ON public.fraud_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
