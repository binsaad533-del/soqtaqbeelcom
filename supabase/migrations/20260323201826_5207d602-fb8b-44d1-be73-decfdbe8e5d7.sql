
-- CRM Leads table
CREATE TABLE public.crm_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  subject TEXT NOT NULL,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'contact_form',
  status TEXT NOT NULL DEFAULT 'new',
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CRM Lead Activities table
CREATE TABLE public.crm_lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_activities ENABLE ROW LEVEL SECURITY;

-- RLS for crm_leads: owner and supervisors can do everything
CREATE POLICY "Owner views all leads" ON public.crm_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner'));

CREATE POLICY "Supervisors view all leads" ON public.crm_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Owner manages leads" ON public.crm_leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner'));

CREATE POLICY "Supervisors update leads" ON public.crm_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Anyone can insert leads" ON public.crm_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- RLS for crm_lead_activities
CREATE POLICY "Owner views all activities" ON public.crm_lead_activities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner'));

CREATE POLICY "Supervisors view all activities" ON public.crm_lead_activities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Admins insert activities" ON public.crm_lead_activities FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'platform_owner') OR public.has_role(auth.uid(), 'supervisor'));

-- Updated_at trigger
CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_lead_activities;
