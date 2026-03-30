
-- Create invoice status type
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  invoice_number serial NOT NULL UNIQUE,
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  listing_title text,
  deal_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.01,
  commission_amount numeric GENERATED ALWAYS AS (deal_amount * commission_rate) STORED,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Seller can view own invoices
CREATE POLICY "Seller views own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

-- Buyer can view own invoices
CREATE POLICY "Buyer views own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

-- Platform owner full access
CREATE POLICY "Owner full access invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_owner'::app_role));

-- Supervisor can view all
CREATE POLICY "Supervisor views all invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- System can insert invoices
CREATE POLICY "System inserts invoices" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create trigger to auto-generate invoice on deal completion
CREATE OR REPLACE FUNCTION public.fn_create_invoice_on_completion()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _listing_title text;
BEGIN
  IF (NEW.status IN ('completed', 'finalized') AND OLD.status NOT IN ('completed', 'finalized')) THEN
    SELECT title INTO _listing_title FROM public.listings WHERE id::text = NEW.listing_id LIMIT 1;
    
    INSERT INTO public.invoices (deal_id, seller_id, buyer_id, listing_title, deal_amount, total_amount)
    VALUES (
      NEW.id,
      COALESCE(NEW.seller_id, '00000000-0000-0000-0000-000000000000'),
      COALESCE(NEW.buyer_id, '00000000-0000-0000-0000-000000000000'),
      COALESCE(_listing_title, 'بدون عنوان'),
      COALESCE(NEW.agreed_price, 0),
      COALESCE(NEW.agreed_price, 0)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_invoice_on_completion
  AFTER UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_create_invoice_on_completion();
