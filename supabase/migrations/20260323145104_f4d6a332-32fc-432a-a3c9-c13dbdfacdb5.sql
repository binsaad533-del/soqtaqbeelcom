
CREATE TABLE public.backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  size_bytes bigint,
  tables_included jsonb DEFAULT '[]'::jsonb,
  error_message text,
  initiated_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views all backup logs" ON public.backup_logs
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'platform_owner'::app_role));

CREATE POLICY "Supervisors view backup logs" ON public.backup_logs
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "System can insert backup logs" ON public.backup_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owner can update backup logs" ON public.backup_logs
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'platform_owner'::app_role));
