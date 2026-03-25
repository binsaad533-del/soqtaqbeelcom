
-- Create listing_offers table
CREATE TABLE public.listing_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  offered_price NUMERIC NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  seller_response TEXT,
  deal_id UUID REFERENCES public.deals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listing_offers ENABLE ROW LEVEL SECURITY;

-- Buyers can insert their own offers
CREATE POLICY "Buyers can insert own offers"
  ON public.listing_offers FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

-- Buyers can view own offers
CREATE POLICY "Buyers can view own offers"
  ON public.listing_offers FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- Listing owner can view all offers on their listings
CREATE POLICY "Seller views offers on own listings"
  ON public.listing_offers FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_offers.listing_id AND l.owner_id = auth.uid()
  ));

-- Listing owner can update offers on their listings (accept/reject)
CREATE POLICY "Seller updates offers on own listings"
  ON public.listing_offers FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_offers.listing_id AND l.owner_id = auth.uid()
  ));

-- Platform owner full access
CREATE POLICY "Platform owner full access offers"
  ON public.listing_offers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'));

-- Public aggregate view: anyone can see count + max price (via RPC)
CREATE OR REPLACE FUNCTION public.get_listing_offers_summary(_listing_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_build_object(
    'total_offers', count(*),
    'highest_offer', COALESCE(max(offered_price), 0),
    'lowest_offer', COALESCE(min(offered_price), 0),
    'latest_at', max(created_at)
  ), '{}')
  FROM listing_offers
  WHERE listing_id = _listing_id AND status != 'withdrawn'
$$;

-- Updated at trigger
CREATE TRIGGER update_listing_offers_updated_at
  BEFORE UPDATE ON public.listing_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
