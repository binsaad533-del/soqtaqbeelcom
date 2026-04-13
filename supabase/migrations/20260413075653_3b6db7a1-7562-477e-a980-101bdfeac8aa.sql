
-- 1) New columns (IF NOT EXISTS handles duplicates from prior partial runs)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS last_reminder_sent timestamptz,
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS renew_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.listing_offers
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS last_activity_alert timestamptz;

ALTER TABLE public.listing_agent_settings
  ADD COLUMN IF NOT EXISTS notify_missing_data boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_low_views boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_pending_offers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_stale_deals boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_renew_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekly_report_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_market_price boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reject_very_low boolean NOT NULL DEFAULT false;

-- Add city/activity/price columns to search_alerts for matching
ALTER TABLE public.search_alerts
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS business_activity text,
  ADD COLUMN IF NOT EXISTS min_price numeric,
  ADD COLUMN IF NOT EXISTS max_price numeric;

-- 2) New tables
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  report_data jsonb NOT NULL DEFAULT '{}',
  week_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "wr_select" ON public.weekly_reports FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "wr_insert" ON public.weekly_reports FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.match_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES public.search_alerts(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  notified_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.match_notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "mn_select" ON public.match_notifications FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "mn_insert" ON public.match_notifications FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_match_notifications_listing ON public.match_notifications(listing_id);
CREATE INDEX IF NOT EXISTS idx_match_notifications_alert ON public.match_notifications(alert_id);

CREATE TABLE IF NOT EXISTS public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  market_avg numeric NOT NULL,
  current_price numeric NOT NULL,
  difference_pct numeric,
  alert_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "pa_select" ON public.price_alerts FOR SELECT USING (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND owner_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pa_insert" ON public.price_alerts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND owner_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.post_deal_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  buyer_notified boolean NOT NULL DEFAULT false,
  seller_notified boolean NOT NULL DEFAULT false,
  followup_date timestamptz NOT NULL,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_deal_followups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "pdf_select" ON public.post_deal_followups FOR SELECT USING (EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pdf_insert" ON public.post_deal_followups FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.deal_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  rater_id uuid NOT NULL,
  rated_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deal_id, rater_id)
);
ALTER TABLE public.deal_ratings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "dr_select" ON public.deal_ratings FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "dr_insert" ON public.deal_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = rater_id AND EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Triggers

CREATE OR REPLACE FUNCTION public.fn_auto_reject_very_low_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _min_price numeric; _auto_reject_very_low boolean; _listing_title text; _seller_id uuid;
BEGIN
  SELECT owner_id, title INTO _seller_id, _listing_title FROM listings WHERE id = NEW.listing_id LIMIT 1;
  IF _seller_id IS NULL THEN RETURN NEW; END IF;
  SELECT min_acceptable_price, auto_reject_very_low INTO _min_price, _auto_reject_very_low
  FROM listing_agent_settings WHERE listing_id = NEW.listing_id AND is_active = true LIMIT 1;
  IF COALESCE(_auto_reject_very_low, false) AND _min_price IS NOT NULL AND _min_price > 0 AND NEW.offered_price < (_min_price * 0.7) THEN
    NEW.status := 'rejected';
    NEW.seller_response := 'تم الرفض تلقائياً — العرض أقل بكثير من الحد الأدنى';
    INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id) VALUES
      (NEW.buyer_id, 'تم رفض عرضك تلقائياً', 'عرضك بقيمة ' || NEW.offered_price || ' ر.س على ' || COALESCE(_listing_title, 'الإعلان') || ' تم رفضه تلقائياً', 'offer', 'listing', NEW.listing_id::text),
      (_seller_id, 'تم رفض عرض تلقائياً', 'تم رفض عرض ' || NEW.offered_price || ' ر.س تلقائياً (أقل من الحد الأدنى بـ 30%+)', 'offer', 'listing', NEW.listing_id::text);
    INSERT INTO agent_actions_log (user_id, action_type, action_details, result, reference_type, reference_id)
    VALUES (_seller_id, 'auto_reject_very_low', jsonb_build_object('offered_price', NEW.offered_price, 'min_price', _min_price), 'auto_rejected', 'offer', NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_reject_very_low_offer ON public.listing_offers;
CREATE TRIGGER trg_auto_reject_very_low_offer BEFORE INSERT ON public.listing_offers FOR EACH ROW EXECUTE FUNCTION public.fn_auto_reject_very_low_offer();

CREATE OR REPLACE FUNCTION public.fn_auto_renew_listing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _settings_renew boolean; _renew_count integer;
BEGIN
  IF NEW.status = 'expired' AND OLD.status IS DISTINCT FROM 'expired' THEN
    _renew_count := COALESCE(NEW.renew_count, 0);
    SELECT auto_renew_enabled INTO _settings_renew FROM listing_agent_settings WHERE listing_id = NEW.id AND is_active = true LIMIT 1;
    IF (COALESCE(NEW.auto_renew, false) OR COALESCE(_settings_renew, false)) AND _renew_count < 3 THEN
      NEW.status := 'published'; NEW.published_at := now(); NEW.renew_count := _renew_count + 1;
      INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
      VALUES (NEW.owner_id, 'تم إعادة نشر إعلانك تلقائياً', 'تم إعادة نشر "' || COALESCE(NEW.title, '') || '" (المرة ' || NEW.renew_count || ' من 3)', 'listing', 'listing', NEW.id::text);
      INSERT INTO agent_actions_log (user_id, action_type, action_details, result, reference_type, reference_id)
      VALUES (NEW.owner_id, 'auto_renew', jsonb_build_object('title', NEW.title, 'renew_count', NEW.renew_count), 'success', 'listing', NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_renew_listing ON public.listings;
CREATE TRIGGER trg_auto_renew_listing BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.fn_auto_renew_listing();

CREATE OR REPLACE FUNCTION public.fn_schedule_post_deal_followup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    INSERT INTO post_deal_followups (deal_id, followup_date) VALUES (NEW.id, now() + interval '7 days') ON CONFLICT (deal_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_schedule_post_deal_followup ON public.deals;
CREATE TRIGGER trg_schedule_post_deal_followup AFTER UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.fn_schedule_post_deal_followup();

CREATE OR REPLACE FUNCTION public.fn_smart_match_on_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _alert record; _count integer := 0;
BEGIN
  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'published') THEN
    FOR _alert IN
      SELECT sa.id AS alert_id, sa.user_id FROM search_alerts sa
      WHERE sa.is_active = true AND sa.user_id != NEW.owner_id
        AND (sa.city IS NULL OR sa.city = NEW.city)
        AND (sa.business_activity IS NULL OR sa.business_activity = NEW.business_activity)
        AND (sa.min_price IS NULL OR NEW.price >= sa.min_price)
        AND (sa.max_price IS NULL OR NEW.price <= sa.max_price)
        AND NOT EXISTS (SELECT 1 FROM match_notifications mn WHERE mn.alert_id = sa.id AND mn.listing_id = NEW.id)
      LIMIT 10
    LOOP
      INSERT INTO match_notifications (alert_id, listing_id, user_id) VALUES (_alert.alert_id, NEW.id, _alert.user_id);
      INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
      VALUES (_alert.user_id, 'فرصة جديدة تطابق بحثك', COALESCE(NEW.title, '') || ' في ' || COALESCE(NEW.city, '') || ' بسعر ' || COALESCE(NEW.price::text, '—') || ' ر.س', 'match', 'listing', NEW.id::text);
      _count := _count + 1;
    END LOOP;
    IF _count > 0 THEN
      INSERT INTO agent_actions_log (user_id, action_type, action_details, result, reference_type, reference_id)
      VALUES (NEW.owner_id, 'smart_match', jsonb_build_object('matches_sent', _count), 'success', 'listing', NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_smart_match_on_publish ON public.listings;
CREATE TRIGGER trg_smart_match_on_publish AFTER INSERT OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.fn_smart_match_on_publish();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_listings_status_owner ON public.listings(status, owner_id);
CREATE INDEX IF NOT EXISTS idx_listing_offers_status_created ON public.listing_offers(status, created_at);
CREATE INDEX IF NOT EXISTS idx_deals_status_updated ON public.deals(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_search_alerts_active ON public.search_alerts(is_active, city, business_activity);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_week ON public.weekly_reports(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_post_deal_followups_date ON public.post_deal_followups(followup_date) WHERE notified_at IS NULL;
