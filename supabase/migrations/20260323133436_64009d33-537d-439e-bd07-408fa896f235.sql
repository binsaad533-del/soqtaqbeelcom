CREATE TABLE public.deal_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id text NOT NULL,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  rating text,
  summary jsonb,
  raw_input jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deal checks"
  ON public.deal_checks FOR SELECT
  USING (auth.uid() = requested_by);

CREATE POLICY "Users can insert own deal checks"
  ON public.deal_checks FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Owner can view all deal checks"
  ON public.deal_checks FOR SELECT
  USING (has_role(auth.uid(), 'platform_owner'::app_role));

CREATE POLICY "Supervisors can view all deal checks"
  ON public.deal_checks FOR SELECT
  USING (has_role(auth.uid(), 'supervisor'::app_role));

CREATE TRIGGER deal_checks_updated_at
  BEFORE UPDATE ON public.deal_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();