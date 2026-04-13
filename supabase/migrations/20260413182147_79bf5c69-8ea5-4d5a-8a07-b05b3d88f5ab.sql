
-- Create expense category enum
CREATE TYPE public.expense_category AS ENUM ('hosting', 'ai', 'sms', 'email', 'other');

-- Create platform_expenses table
CREATE TABLE public.platform_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category expense_category NOT NULL DEFAULT 'other',
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_expenses ENABLE ROW LEVEL SECURITY;

-- RLS: only platform_owner and financial_manager
CREATE POLICY "Owners and finance managers can view expenses"
ON public.platform_expenses FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'platform_owner') OR
  public.has_role(auth.uid(), 'financial_manager')
);

CREATE POLICY "Owners and finance managers can insert expenses"
ON public.platform_expenses FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'platform_owner') OR
  public.has_role(auth.uid(), 'financial_manager')
);

CREATE POLICY "Owners and finance managers can update expenses"
ON public.platform_expenses FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'platform_owner') OR
  public.has_role(auth.uid(), 'financial_manager')
);

CREATE POLICY "Owners and finance managers can delete expenses"
ON public.platform_expenses FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'platform_owner') OR
  public.has_role(auth.uid(), 'financial_manager')
);

-- Timestamp trigger
CREATE TRIGGER update_platform_expenses_updated_at
BEFORE UPDATE ON public.platform_expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
