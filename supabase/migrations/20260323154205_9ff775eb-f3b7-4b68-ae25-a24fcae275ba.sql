
-- Commission tracking table
CREATE TABLE public.deal_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
  seller_id uuid NOT NULL,
  deal_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.01,
  commission_amount numeric GENERATED ALWAYS AS (deal_amount * commission_rate) STORED,
  payment_status text NOT NULL DEFAULT 'unpaid',
  receipt_path text,
  paid_at timestamp with time zone,
  marked_paid_at timestamp with time zone,
  reminder_count integer NOT NULL DEFAULT 0,
  last_reminder_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(deal_id)
);

-- Enable RLS
ALTER TABLE public.deal_commissions ENABLE ROW LEVEL SECURITY;

-- Seller can view own commissions
CREATE POLICY "Seller views own commissions" ON public.deal_commissions
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

-- Seller can update own commissions (mark paid, upload receipt)
CREATE POLICY "Seller updates own commissions" ON public.deal_commissions
  FOR UPDATE TO authenticated
  USING (seller_id = auth.uid());

-- Platform owner views all
CREATE POLICY "Owner views all commissions" ON public.deal_commissions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'));

-- Owner can update all
CREATE POLICY "Owner updates all commissions" ON public.deal_commissions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'));

-- System insert
CREATE POLICY "System inserts commissions" ON public.deal_commissions
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Buyer can view commission for their deals
CREATE POLICY "Buyer views deal commissions" ON public.deal_commissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM deals d WHERE d.id = deal_id AND d.buyer_id = auth.uid()));

-- Supervisor views all
CREATE POLICY "Supervisor views all commissions" ON public.deal_commissions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'supervisor'));

-- No delete allowed (implicit)

-- Trigger to auto-create commission when deal is completed/finalized
CREATE OR REPLACE FUNCTION public.fn_create_commission_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.status IN ('completed', 'finalized') AND OLD.status NOT IN ('completed', 'finalized')) THEN
    INSERT INTO public.deal_commissions (deal_id, seller_id, deal_amount)
    VALUES (NEW.id, NEW.seller_id, COALESCE(NEW.agreed_price, 0))
    ON CONFLICT (deal_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_commission
  AFTER UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_create_commission_on_completion();

-- Updated_at trigger
CREATE TRIGGER trg_commission_updated_at
  BEFORE UPDATE ON public.deal_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add commission receipt storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('commission-receipts', 'commission-receipts', false)
ON CONFLICT DO NOTHING;

-- Storage policies for commission receipts
CREATE POLICY "Sellers upload receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'commission-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Sellers view own receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'commission-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner views all receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'commission-receipts' AND has_role(auth.uid(), 'platform_owner'));
