
-- Create chat-attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Deal parties can upload files to their deal folder
CREATE POLICY "Deal parties can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM deals
    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
  )
);

-- RLS: Deal parties can view their deal's attachments
CREATE POLICY "Deal parties can view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM deals
    WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.has_role(auth.uid(), 'platform_owner'::public.app_role)
);
