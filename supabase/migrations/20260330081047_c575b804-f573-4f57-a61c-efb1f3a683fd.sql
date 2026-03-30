
CREATE TABLE public.seller_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  business_name text,
  commercial_register_number text,
  id_type text NOT NULL DEFAULT 'national_id',
  id_number text NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending',
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  rejection_reason text
);

ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

-- Seller views own verifications
CREATE POLICY "Seller views own verifications" ON public.seller_verifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Seller submits verification
CREATE POLICY "Seller inserts own verification" ON public.seller_verifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Owner full access
CREATE POLICY "Owner full access verifications" ON public.seller_verifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_owner'::app_role));

-- Supervisor can view and update
CREATE POLICY "Supervisor views verifications" ON public.seller_verifications
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisor updates verifications" ON public.seller_verifications
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));
