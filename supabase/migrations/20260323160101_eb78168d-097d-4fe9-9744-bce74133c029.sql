
-- Create a database view that ranks listings by seller trust and commission compliance
-- This calculates a visibility_tier for each listing based on seller behavior

CREATE OR REPLACE FUNCTION public.get_seller_visibility_tier(_seller_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _trust integer;
  _unpaid_count integer;
  _total_commissions integer;
  _verified boolean;
  _is_active boolean;
BEGIN
  -- Get trust score and verification
  SELECT trust_score, is_verified, is_active
  INTO _trust, _verified, _is_active
  FROM profiles WHERE user_id = _seller_id LIMIT 1;

  IF NOT COALESCE(_is_active, true) THEN RETURN 3; END IF;

  -- Check commission compliance
  SELECT 
    count(*) FILTER (WHERE payment_status NOT IN ('verified', 'paid_proof_uploaded')),
    count(*)
  INTO _unpaid_count, _total_commissions
  FROM deal_commissions WHERE seller_id = _seller_id;

  -- Tier 1: High trust + paid commissions + verified
  IF COALESCE(_trust, 50) >= 70 AND _unpaid_count = 0 AND COALESCE(_verified, false) THEN
    RETURN 1;
  END IF;

  -- Tier 3: Unpaid commissions or low trust
  IF _unpaid_count > 0 OR COALESCE(_trust, 50) < 50 THEN
    RETURN 3;
  END IF;

  -- Tier 2: Normal
  RETURN 2;
END;
$$;

-- Function to recalculate and update seller trust score considering commission impact
CREATE OR REPLACE FUNCTION public.fn_update_trust_on_commission_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _new_score integer;
BEGIN
  -- Recalculate the seller's trust score
  _new_score := calculate_seller_trust_score(NEW.seller_id);
  
  -- Update the profile
  UPDATE profiles 
  SET trust_score = _new_score, updated_at = now()
  WHERE user_id = NEW.seller_id;

  RETURN NEW;
END;
$$;

-- Trigger: when commission status changes, update trust score
CREATE TRIGGER trg_commission_trust_update
  AFTER UPDATE OF payment_status ON public.deal_commissions
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION public.fn_update_trust_on_commission_change();

-- Trigger: when new commission is created, update trust score
CREATE TRIGGER trg_commission_created_trust
  AFTER INSERT ON public.deal_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_trust_on_commission_change();

-- Trigger: when a new review is submitted, update seller trust score
CREATE OR REPLACE FUNCTION public.fn_update_trust_on_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _new_score integer;
BEGIN
  _new_score := calculate_seller_trust_score(NEW.seller_id);
  UPDATE profiles 
  SET trust_score = _new_score, updated_at = now()
  WHERE user_id = NEW.seller_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_review_trust_update
  AFTER INSERT ON public.seller_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_trust_on_review();
