-- ═══════════════════════════════════════════════════════════
-- Fix #1: Remove redundant open INSERT policy on listing_views
-- The two stricter policies remain:
--   - "Anon inserts views without user_id" (anon, user_id IS NULL)
--   - "Auth users insert own views" (authenticated, user_id = auth.uid())
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can insert views" ON public.listing_views;

-- ═══════════════════════════════════════════════════════════
-- Fix #2: Restrict listing_likes SELECT
-- Old: USING (true) for authenticated → leaks who liked what
-- New: Only own likes OR likes on visible (published) listings,
-- and also expose user_id only when needed.
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can view likes" ON public.listing_likes;

CREATE POLICY "View likes on visible listings"
  ON public.listing_likes
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_likes.listing_id
        AND l.status = 'published'
        AND l.deleted_at IS NULL
    )
  );

COMMENT ON POLICY "View likes on visible listings" ON public.listing_likes IS
'Authenticated users can see likes only on published (non-deleted) listings, or their own likes. Prevents enumeration of likes on archived/deleted content.';

-- ═══════════════════════════════════════════════════════════
-- Fix #3: Restrict seller_reviews SELECT
-- Old: USING (true) for authenticated → exposes reviews tied to
--      incomplete or non-existent deals.
-- New: Only the reviewer, the seller, or reviews tied to completed deals.
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.seller_reviews;

CREATE POLICY "View reviews of completed deals"
  ON public.seller_reviews
  FOR SELECT
  TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR seller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = seller_reviews.deal_id
        AND d.status IN ('completed', 'finalized')
    )
  );

COMMENT ON POLICY "View reviews of completed deals" ON public.seller_reviews IS
'Authenticated users can see reviews from completed/finalized deals only, or reviews they wrote/received. Prevents leaking reviews tied to abandoned or in-progress deals.';