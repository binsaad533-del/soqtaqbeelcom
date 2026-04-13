
-- Add is_commission_suspended to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_commission_suspended boolean NOT NULL DEFAULT false;

-- Create commission-receipts storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('commission-receipts', 'commission-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Seller can upload to own folder
CREATE POLICY "Seller uploads own receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'commission-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seller can read own receipts
CREATE POLICY "Seller reads own receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'commission-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Platform owner reads all receipts
CREATE POLICY "Owner reads all receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'commission-receipts' AND has_role(auth.uid(), 'platform_owner'::app_role));

-- Financial manager reads all receipts
CREATE POLICY "Financial manager reads all receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'commission-receipts' AND has_role(auth.uid(), 'financial_manager'::app_role));

-- Supervisor reads all receipts
CREATE POLICY "Supervisor reads all receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'commission-receipts' AND has_role(auth.uid(), 'supervisor'::app_role));

-- Only owner can delete receipts
CREATE POLICY "Owner deletes receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'commission-receipts' AND has_role(auth.uid(), 'platform_owner'::app_role));
