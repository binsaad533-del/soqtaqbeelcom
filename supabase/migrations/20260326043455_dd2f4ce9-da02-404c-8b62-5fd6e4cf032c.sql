-- Create backups storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('backups', 'backups', false, 52428800, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Platform owner can read backups
CREATE POLICY "Platform owner can read backups"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'backups'
  AND public.has_role(auth.uid(), 'platform_owner')
);