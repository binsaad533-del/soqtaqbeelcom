
-- Create per-listing agent settings table
CREATE TABLE public.listing_agent_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  auto_reply_inquiries BOOLEAN NOT NULL DEFAULT false,
  auto_evaluate_offers BOOLEAN NOT NULL DEFAULT false,
  min_acceptable_price NUMERIC NULL,
  auto_reject_below_min BOOLEAN NOT NULL DEFAULT false,
  daily_summary BOOLEAN NOT NULL DEFAULT true,
  preferred_response_tone TEXT DEFAULT 'professional',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (listing_id)
);

-- Enable RLS
ALTER TABLE public.listing_agent_settings ENABLE ROW LEVEL SECURITY;

-- Owner of the listing can manage settings
CREATE POLICY "Listing owner manages agent settings"
ON public.listing_agent_settings
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Platform owner views all
CREATE POLICY "Platform owner views all listing agent settings"
ON public.listing_agent_settings
FOR SELECT
USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Supervisor views all
CREATE POLICY "Supervisor views all listing agent settings"
ON public.listing_agent_settings
FOR SELECT
USING (has_role(auth.uid(), 'supervisor'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_listing_agent_settings_updated_at
BEFORE UPDATE ON public.listing_agent_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
