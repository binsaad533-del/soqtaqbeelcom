
-- Drop existing overly permissive SELECT policy
DROP POLICY IF EXISTS "dr_select" ON public.deal_ratings;

-- Mutual reveal: user sees their own ratings always, 
-- and sees ratings about them only if they also rated the other party in same deal
CREATE POLICY "dr_select_mutual_reveal" ON public.deal_ratings
FOR SELECT USING (
  -- Always see your own ratings (ones you wrote)
  auth.uid() = rater_id
  -- See ratings about you only if you also rated the other party
  OR (
    auth.uid() = rated_id
    AND EXISTS (
      SELECT 1 FROM public.deal_ratings dr2
      WHERE dr2.deal_id = deal_ratings.deal_id
        AND dr2.rater_id = auth.uid()
    )
  )
  -- Platform owner sees all
  OR public.has_role(auth.uid(), 'platform_owner')
);

-- Public aggregated view: anyone can see average for a seller (via RPC, not direct table)
-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_deal_ratings_rated_id ON public.deal_ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_deal_ratings_deal_rater ON public.deal_ratings(deal_id, rater_id);

-- Trigger: notify rated user when they receive a rating
CREATE OR REPLACE FUNCTION public.fn_notify_new_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rater_name text;
BEGIN
  SELECT full_name INTO _rater_name FROM profiles WHERE user_id = NEW.rater_id LIMIT 1;

  INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
  VALUES (
    NEW.rated_id,
    'تقييم جديد',
    COALESCE(_rater_name, 'مستخدم') || ' قيّمك بـ ' || NEW.rating || ' نجوم',
    'rating',
    'deal',
    NEW.deal_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_rating ON public.deal_ratings;
CREATE TRIGGER trg_notify_new_rating
  AFTER INSERT ON public.deal_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_new_rating();

-- Trigger: update trust_score based on ratings
CREATE OR REPLACE FUNCTION public.fn_update_trust_on_deal_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _new_score integer;
BEGIN
  _new_score := calculate_seller_trust_score(NEW.rated_id);
  UPDATE profiles 
  SET trust_score = _new_score, updated_at = now()
  WHERE user_id = NEW.rated_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_trust_on_deal_rating ON public.deal_ratings;
CREATE TRIGGER trg_update_trust_on_deal_rating
  AFTER INSERT ON public.deal_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_trust_on_deal_rating();

-- RPC: get public average rating for a seller (bypasses mutual reveal)
CREATE OR REPLACE FUNCTION public.get_seller_rating_summary(_seller_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_build_object(
    'average_rating', ROUND(AVG(rating)::numeric, 1),
    'total_ratings', COUNT(*),
    'rating_5', COUNT(*) FILTER (WHERE rating = 5),
    'rating_4', COUNT(*) FILTER (WHERE rating = 4),
    'rating_3', COUNT(*) FILTER (WHERE rating = 3),
    'rating_2', COUNT(*) FILTER (WHERE rating = 2),
    'rating_1', COUNT(*) FILTER (WHERE rating = 1)
  ), '{"average_rating":0,"total_ratings":0}')
  FROM deal_ratings
  WHERE rated_id = _seller_id;
$$;
