
CREATE TABLE public.feasibility_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  study_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id)
);

ALTER TABLE public.feasibility_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feasibility studies"
  ON public.feasibility_studies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auth users can insert studies"
  ON public.feasibility_studies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Requester or owner can update studies"
  ON public.feasibility_studies FOR UPDATE
  TO authenticated
  USING (requested_by = auth.uid() OR has_role(auth.uid(), 'platform_owner'::app_role));
