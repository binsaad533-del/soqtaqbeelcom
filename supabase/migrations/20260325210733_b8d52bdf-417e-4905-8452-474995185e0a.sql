
-- Listing likes table
CREATE TABLE public.listing_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

ALTER TABLE public.listing_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can like listings" ON public.listing_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike listings" ON public.listing_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view likes" ON public.listing_likes
  FOR SELECT TO authenticated USING (true);

-- Listing views table
CREATE TABLE public.listing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  user_id uuid,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views" ON public.listing_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can read views" ON public.listing_views
  FOR SELECT TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX idx_listing_likes_listing ON public.listing_likes(listing_id);
CREATE INDEX idx_listing_views_listing ON public.listing_views(listing_id);
CREATE INDEX idx_listing_likes_user ON public.listing_likes(user_id);
