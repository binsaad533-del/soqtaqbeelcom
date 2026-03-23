-- Deals table to track deal lifecycle
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id text NOT NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'negotiating',
  deal_type text,
  agreed_price numeric,
  deal_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  locked boolean NOT NULL DEFAULT false
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view own deals" ON public.deals FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Owner views all deals" ON public.deals FOR SELECT
  USING (has_role(auth.uid(), 'platform_owner'::app_role));
CREATE POLICY "Supervisors view all deals" ON public.deals FOR SELECT
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Auth users can create deals" ON public.deals FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Parties can update unlocked deals" ON public.deals FOR UPDATE
  USING ((auth.uid() = buyer_id OR auth.uid() = seller_id) AND locked = false);
CREATE POLICY "Owner can update deals" ON public.deals FOR UPDATE
  USING (has_role(auth.uid(), 'platform_owner'::app_role));

CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Non-deletable agreement records
CREATE TABLE public.deal_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1,
  agreement_number text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  buyer_name text,
  buyer_contact text,
  seller_name text,
  seller_contact text,
  deal_title text,
  deal_type text,
  location text,
  business_activity text,
  included_assets jsonb DEFAULT '[]'::jsonb,
  excluded_assets jsonb DEFAULT '[]'::jsonb,
  financial_terms jsonb DEFAULT '{}'::jsonb,
  declarations jsonb DEFAULT '{}'::jsonb,
  documents_referenced jsonb DEFAULT '[]'::jsonb,
  liabilities jsonb DEFAULT '{}'::jsonb,
  important_notes jsonb DEFAULT '[]'::jsonb,
  license_status jsonb DEFAULT '{}'::jsonb,
  lease_details jsonb DEFAULT '{}'::jsonb,
  buyer_approved boolean NOT NULL DEFAULT false,
  buyer_approved_at timestamptz,
  seller_approved boolean NOT NULL DEFAULT false,
  seller_approved_at timestamptz,
  pdf_path text,
  previous_version_id uuid REFERENCES public.deal_agreements(id),
  amendment_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deal_id, version)
);

ALTER TABLE public.deal_agreements ENABLE ROW LEVEL SECURITY;

-- No DELETE policy at all — agreements are non-deletable
CREATE POLICY "Parties can view own agreements" ON public.deal_agreements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())
  ));
CREATE POLICY "Owner views all agreements" ON public.deal_agreements FOR SELECT
  USING (has_role(auth.uid(), 'platform_owner'::app_role));
CREATE POLICY "Supervisors view all agreements" ON public.deal_agreements FOR SELECT
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "System can insert agreements" ON public.deal_agreements FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())
  ));
-- Only allow updating approval fields
CREATE POLICY "Parties can approve agreements" ON public.deal_agreements FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())
  ));

-- Deal history / audit trail (non-deletable)
CREATE TABLE public.deal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view own deal history" ON public.deal_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())
  ));
CREATE POLICY "Owner views all deal history" ON public.deal_history FOR SELECT
  USING (has_role(auth.uid(), 'platform_owner'::app_role));
CREATE POLICY "Supervisors view all deal history" ON public.deal_history FOR SELECT
  USING (has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "System can insert deal history" ON public.deal_history FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

-- Storage bucket for agreement PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('agreements', 'agreements', false);

CREATE POLICY "Parties can read own agreement PDFs" ON storage.objects FOR SELECT
  USING (bucket_id = 'agreements' AND auth.uid() IS NOT NULL);
CREATE POLICY "System can upload agreement PDFs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'agreements' AND auth.uid() IS NOT NULL);