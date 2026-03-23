
-- Track failed login attempts for brute-force detection
CREATE TABLE public.failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only owners/supervisors can read
CREATE POLICY "Owner views failed logins" ON public.failed_login_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner'));

CREATE POLICY "Insert failed logins" ON public.failed_login_attempts
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Security incidents table
CREATE TABLE public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  affected_user_id uuid,
  affected_resource_type text,
  affected_resource_id text,
  description text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  recommended_actions jsonb DEFAULT '[]'::jsonb,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views all incidents" ON public.security_incidents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner'));

CREATE POLICY "Supervisors view incidents" ON public.security_incidents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "System inserts incidents" ON public.security_incidents
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Owner updates incidents" ON public.security_incidents
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner'));

-- Enable realtime for incidents
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_incidents;

-- Trigger to update updated_at
CREATE TRIGGER update_security_incidents_updated_at
  BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
