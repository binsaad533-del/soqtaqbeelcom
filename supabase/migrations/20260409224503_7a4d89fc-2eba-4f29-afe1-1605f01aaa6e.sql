
-- Referral system
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referred_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users create own referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);
CREATE POLICY "System updates referrals" ON public.referrals FOR UPDATE USING (auth.uid() = referrer_id OR has_role(auth.uid(), 'platform_owner'::app_role));
CREATE POLICY "Owner views all referrals" ON public.referrals FOR SELECT TO authenticated USING (has_role(auth.uid(), 'platform_owner'::app_role));

CREATE INDEX idx_referrals_code ON public.referrals (referral_code);
CREATE INDEX idx_referrals_referrer ON public.referrals (referrer_id);

-- Promoted listings
CREATE TABLE public.promoted_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  promoted_by UUID NOT NULL,
  promotion_type TEXT NOT NULL DEFAULT 'featured',
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  amount_paid NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promoted_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own promotions" ON public.promoted_listings FOR SELECT USING (auth.uid() = promoted_by);
CREATE POLICY "Users create own promotions" ON public.promoted_listings FOR INSERT WITH CHECK (auth.uid() = promoted_by);
CREATE POLICY "Owner manages all promotions" ON public.promoted_listings FOR ALL TO authenticated USING (has_role(auth.uid(), 'platform_owner'::app_role)) WITH CHECK (has_role(auth.uid(), 'platform_owner'::app_role));
CREATE POLICY "Anyone views active promotions" ON public.promoted_listings FOR SELECT TO authenticated USING (is_active = true);

CREATE INDEX idx_promoted_listing ON public.promoted_listings (listing_id);
CREATE INDEX idx_promoted_active ON public.promoted_listings (is_active, expires_at);
