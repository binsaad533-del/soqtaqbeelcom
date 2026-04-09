-- Allow authenticated users to upload to ai-chat folder in chat-attachments
CREATE POLICY "Auth users can upload ai-chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = 'ai-chat'
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to read their own ai-chat attachments
CREATE POLICY "Auth users can read ai-chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = 'ai-chat'
  AND auth.uid() IS NOT NULL
);