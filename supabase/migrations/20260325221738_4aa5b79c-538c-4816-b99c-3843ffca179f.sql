
-- Session logs table for tracking login history
CREATE TABLE public.session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'sign_in',
  ip_address text,
  user_agent text,
  device_info text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session logs"
ON public.session_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert session logs"
ON public.session_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_session_logs_user_id ON public.session_logs(user_id, created_at DESC);
