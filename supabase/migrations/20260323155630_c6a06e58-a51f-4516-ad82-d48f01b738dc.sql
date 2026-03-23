
-- Seller reviews / buyer feedback table
CREATE TABLE public.seller_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_accuracy integer NOT NULL CHECK (listing_accuracy BETWEEN 1 AND 5),
  honesty integer NOT NULL CHECK (honesty BETWEEN 1 AND 5),
  responsiveness integer NOT NULL CHECK (responsiveness BETWEEN 1 AND 5),
  overall_experience integer NOT NULL CHECK (overall_experience BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deal_id, reviewer_id)
);

ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view reviews (public transparency)
CREATE POLICY "Anyone can view reviews" ON public.seller_reviews
  FOR SELECT TO authenticated USING (true);

-- Buyer can insert review for completed deals
CREATE POLICY "Buyer can insert review" ON public.seller_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = seller_reviews.deal_id
        AND d.buyer_id = auth.uid()
        AND d.status IN ('completed', 'finalized')
    )
  );

-- Owner/admin can manage reviews
CREATE POLICY "Owner manages reviews" ON public.seller_reviews
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Update the trust score function to include commission and review data
CREATE OR REPLACE FUNCTION public.calculate_seller_trust_score(_seller_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _score integer := 0;
  _completed integer;
  _cancelled integer;
  _disputes integer;
  _verified boolean;
  _ver_level text;
  _account_age interval;
  _avg_review numeric;
  _review_count integer;
  _commission_paid integer;
  _commission_total integer;
  _disclosure_avg numeric;
BEGIN
  -- 1) Completed deals → max 25 points
  SELECT count(*) INTO _completed
  FROM deals WHERE seller_id = _seller_id AND status IN ('completed', 'finalized');
  _score := _score + LEAST(_completed * 5, 25);

  -- 2) Commission payment → max 20 points
  SELECT count(*) FILTER (WHERE payment_status = 'verified'),
         count(*)
  INTO _commission_paid, _commission_total
  FROM deal_commissions WHERE seller_id = _seller_id;
  
  IF _commission_total > 0 THEN
    _score := _score + ROUND((_commission_paid::numeric / _commission_total) * 20);
    -- Penalty for unpaid
    IF _commission_total > _commission_paid THEN
      _score := _score - LEAST((_commission_total - _commission_paid) * 3, 10);
    END IF;
  END IF;

  -- 3) Document verification → max 15 points
  SELECT is_verified, verification_level, (now() - created_at)
  INTO _verified, _ver_level, _account_age
  FROM profiles WHERE user_id = _seller_id LIMIT 1;
  
  IF _verified THEN _score := _score + 5; END IF;
  IF _ver_level = 'full' THEN _score := _score + 10;
  ELSIF _ver_level = 'basic' THEN _score := _score + 5; END IF;

  -- 4) Disclosure completeness → max 15 points
  SELECT COALESCE(avg(disclosure_score), 0)
  INTO _disclosure_avg
  FROM listings WHERE owner_id = _seller_id AND deleted_at IS NULL;
  _score := _score + ROUND(_disclosure_avg * 0.15);

  -- 5) Buyer feedback → max 15 points
  SELECT avg((listing_accuracy + honesty + responsiveness + overall_experience) / 4.0),
         count(*)
  INTO _avg_review, _review_count
  FROM seller_reviews WHERE seller_id = _seller_id;
  
  IF _review_count > 0 THEN
    _score := _score + ROUND((_avg_review / 5.0) * 15);
  END IF;

  -- 6) Account age / activity → max 10 points
  IF _account_age > interval '30 days' THEN _score := _score + 3; END IF;
  IF _account_age > interval '180 days' THEN _score := _score + 4; END IF;
  IF _account_age > interval '365 days' THEN _score := _score + 3; END IF;

  -- Penalties
  SELECT cancelled_deals, disputes_count INTO _cancelled, _disputes
  FROM profiles WHERE user_id = _seller_id LIMIT 1;
  _score := _score - LEAST(COALESCE(_cancelled, 0) * 5, 15);
  _score := _score - LEAST(COALESCE(_disputes, 0) * 8, 20);

  RETURN GREATEST(0, LEAST(100, _score));
END;
$$;
