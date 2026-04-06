
-- Create deal_files table
CREATE TABLE public.deal_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_files ENABLE ROW LEVEL SECURITY;

-- Deal parties can view files
CREATE POLICY "Deal parties can view files" ON public.deal_files
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = deal_files.deal_id
      AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())
    )
  );

-- Deal parties can upload files
CREATE POLICY "Deal parties can upload files" ON public.deal_files
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = deal_files.deal_id
      AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())
    )
  );

-- Owner/supervisor can view all files
CREATE POLICY "Owner views all deal files" ON public.deal_files
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'::app_role));

CREATE POLICY "Supervisor views all deal files" ON public.deal_files
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- Deal parties can delete own uploads
CREATE POLICY "Users can delete own uploads" ON public.deal_files
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-files', 'deal-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Deal parties upload files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deal-files');

CREATE POLICY "Deal parties read files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'deal-files');

CREATE POLICY "Users delete own deal files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'deal-files' AND (storage.foldername(name))[1] = auth.uid()::text);
