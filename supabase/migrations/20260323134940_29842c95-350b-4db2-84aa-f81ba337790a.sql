
-- Listings table
CREATE TABLE public.listings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  title text,
  description text,
  deal_type text NOT NULL DEFAULT 'full',
  business_activity text,
  category text,
  city text,
  district text,
  price numeric,
  annual_rent numeric,
  lease_duration text,
  lease_paid_period text,
  lease_remaining text,
  liabilities text,
  overdue_salaries text,
  overdue_rent text,
  municipality_license text,
  civil_defense_license text,
  surveillance_cameras text,
  disclosure_score integer DEFAULT 0,
  ai_summary text,
  ai_rating text,
  status text NOT NULL DEFAULT 'draft',
  inventory jsonb DEFAULT '[]'::jsonb,
  photos jsonb DEFAULT '{}'::jsonb,
  documents jsonb DEFAULT '[]'::jsonb,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with own listings
CREATE POLICY "Owner can view own listings" ON public.listings FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owner can insert own listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update own listings" ON public.listings FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner can delete draft listings" ON public.listings FOR DELETE USING (auth.uid() = owner_id AND status = 'draft');

-- Published listings visible to all authenticated users
CREATE POLICY "Published listings visible to all" ON public.listings FOR SELECT USING (status = 'published');

-- Platform owner full access
CREATE POLICY "Platform owner full access listings" ON public.listings FOR ALL USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Supervisors can view all
CREATE POLICY "Supervisors view all listings" ON public.listings FOR SELECT USING (has_role(auth.uid(), 'supervisor'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Negotiation messages table
CREATE TABLE public.negotiation_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal parties can view messages" ON public.negotiation_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM deals d WHERE d.id = negotiation_messages.deal_id AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())));

CREATE POLICY "Deal parties can send messages" ON public.negotiation_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM deals d WHERE d.id = negotiation_messages.deal_id AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())));

CREATE POLICY "Owner views all messages" ON public.negotiation_messages FOR SELECT
  USING (has_role(auth.uid(), 'platform_owner'::app_role));

CREATE POLICY "Supervisors view all messages" ON public.negotiation_messages FOR SELECT
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- Notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  reference_type text,
  reference_id text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner views all notifications" ON public.notifications FOR SELECT USING (has_role(auth.uid(), 'platform_owner'::app_role));

-- Enable realtime for messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Storage bucket for listing photos and documents
INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true);

-- Storage policies for listings bucket
CREATE POLICY "Auth users can upload listing files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listings');
CREATE POLICY "Anyone can view listing files" ON storage.objects FOR SELECT USING (bucket_id = 'listings');
CREATE POLICY "Users can update own listing files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own listing files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);
