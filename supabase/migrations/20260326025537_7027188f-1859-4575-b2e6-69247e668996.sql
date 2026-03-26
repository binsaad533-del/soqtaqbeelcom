
-- Create supervisor permissions table
CREATE TABLE public.supervisor_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manage_listings boolean NOT NULL DEFAULT false,
  manage_deals boolean NOT NULL DEFAULT false,
  manage_users boolean NOT NULL DEFAULT false,
  manage_crm boolean NOT NULL DEFAULT false,
  manage_reports boolean NOT NULL DEFAULT false,
  manage_security boolean NOT NULL DEFAULT false,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.supervisor_permissions ENABLE ROW LEVEL SECURITY;

-- Owner full access
CREATE POLICY "Owner full access supervisor_permissions"
ON public.supervisor_permissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'platform_owner'))
WITH CHECK (has_role(auth.uid(), 'platform_owner'));

-- Supervisors can view their own permissions
CREATE POLICY "Supervisors view own permissions"
ON public.supervisor_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
