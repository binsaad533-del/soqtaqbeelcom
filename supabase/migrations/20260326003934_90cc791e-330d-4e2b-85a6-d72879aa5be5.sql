
CREATE TABLE public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- Reporter can insert
CREATE POLICY "Users can report messages"
  ON public.message_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Reporter can view own reports
CREATE POLICY "Users can view own reports"
  ON public.message_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- Owner views all
CREATE POLICY "Owner views all reports"
  ON public.message_reports FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Owner can update
CREATE POLICY "Owner updates reports"
  ON public.message_reports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Supervisors view all
CREATE POLICY "Supervisors view reports"
  ON public.message_reports FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));
