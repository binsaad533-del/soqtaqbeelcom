
CREATE TABLE public.search_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  search_query text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  notified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.search_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own alerts"
  ON public.search_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own alerts"
  ON public.search_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON public.search_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner views all alerts"
  ON public.search_alerts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'::app_role));
