
-- Trust score and verification level on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 50;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_level text NOT NULL DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completed_deals integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cancelled_deals integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disputes_count integer NOT NULL DEFAULT 0;

-- Risk score on deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS risk_factors jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS fraud_flags jsonb DEFAULT '[]'::jsonb;

-- Fraud flags on listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS fraud_flags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS fraud_score integer DEFAULT 0;

-- Auto-update trust score trigger
CREATE OR REPLACE FUNCTION public.update_trust_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _score integer := 50;
  _completed integer;
  _cancelled integer;
  _disputes integer;
  _account_age interval;
  _verified boolean;
  _ver_level text;
BEGIN
  -- Get stats
  SELECT count(*) INTO _completed FROM deals WHERE (buyer_id = NEW.buyer_id OR seller_id = NEW.buyer_id) AND status = 'completed';
  SELECT count(*) INTO _cancelled FROM deals WHERE (buyer_id = NEW.buyer_id OR seller_id = NEW.buyer_id) AND status = 'cancelled';
  
  -- Get profile info
  SELECT is_verified, verification_level, (now() - created_at)
  INTO _verified, _ver_level, _account_age
  FROM profiles WHERE user_id = COALESCE(NEW.buyer_id, NEW.seller_id) LIMIT 1;

  -- Calculate score
  _score := 50;
  _score := _score + LEAST(_completed * 5, 25); -- max +25 from completed deals
  _score := _score - LEAST(_cancelled * 10, 30); -- max -30 from cancellations
  IF _verified THEN _score := _score + 10; END IF;
  IF _ver_level = 'full' THEN _score := _score + 15;
  ELSIF _ver_level = 'basic' THEN _score := _score + 5; END IF;
  IF _account_age > interval '90 days' THEN _score := _score + 5; END IF;
  IF _account_age > interval '365 days' THEN _score := _score + 5; END IF;
  
  _score := GREATEST(0, LEAST(100, _score));

  -- Update both parties
  IF NEW.buyer_id IS NOT NULL THEN
    UPDATE profiles SET trust_score = _score, completed_deals = _completed, cancelled_deals = _cancelled WHERE user_id = NEW.buyer_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_trust_on_deal_change
AFTER INSERT OR UPDATE OF status ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.update_trust_score();
