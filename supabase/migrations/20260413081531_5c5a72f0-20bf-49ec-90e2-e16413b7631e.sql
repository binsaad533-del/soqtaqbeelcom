
-- Add VAT columns to deal_commissions
ALTER TABLE public.deal_commissions
  ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS vat_amount numeric GENERATED ALWAYS AS (deal_amount * commission_rate * 0.15) STORED,
  ADD COLUMN IF NOT EXISTS total_with_vat numeric GENERATED ALWAYS AS (deal_amount * commission_rate * 1.15) STORED;

-- Add VAT columns to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS vat_amount numeric GENERATED ALWAYS AS (deal_amount * commission_rate * 0.15) STORED,
  ADD COLUMN IF NOT EXISTS total_with_vat numeric GENERATED ALWAYS AS (deal_amount * commission_rate * 1.15) STORED;
