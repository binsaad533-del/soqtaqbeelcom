
-- Update deal status change trigger to also send Email + SMS
CREATE OR REPLACE FUNCTION public.fn_notify_deal_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _listing_title text;
  _status_label text;
  _supabase_url text;
  _anon_key text;
  _party_id uuid;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  SELECT l.title INTO _listing_title
  FROM listings l WHERE l.id::text = NEW.listing_id LIMIT 1;

  _status_label := CASE NEW.status
    WHEN 'negotiating' THEN 'قيد التفاوض'
    WHEN 'pending_payment' THEN 'بانتظار الدفع'
    WHEN 'in_progress' THEN 'قيد التنفيذ'
    WHEN 'completed' THEN 'مكتملة'
    WHEN 'finalized' THEN 'مؤكدة نهائياً'
    WHEN 'cancelled' THEN 'ملغاة'
    WHEN 'suspended' THEN 'معلّقة'
    ELSE NEW.status
  END;

  -- Get config
  _supabase_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1);
  _anon_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1);

  -- Notify buyer
  IF NEW.buyer_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
    VALUES (
      NEW.buyer_id,
      'تحديث حالة الصفقة',
      'صفقة ' || COALESCE(_listing_title, '') || ' أصبحت: ' || _status_label,
      'deal',
      'deal',
      NEW.id::text
    );

    -- Email + SMS via pg_net
    IF _supabase_url IS NOT NULL AND _anon_key IS NOT NULL THEN
      PERFORM extensions.http_post(
        url := _supabase_url || '/functions/v1/notify-user',
        body := jsonb_build_object(
          'userId', NEW.buyer_id,
          'category', 'deals',
          'templateName', 'deal-status-change',
          'idempotencyKey', 'deal-status-' || NEW.id || '-buyer-' || NEW.status,
          'templateData', jsonb_build_object('dealTitle', COALESCE(_listing_title, ''), 'newStatus', _status_label)
        ),
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _anon_key, 'apikey', _anon_key)
      );
      PERFORM extensions.http_post(
        url := _supabase_url || '/functions/v1/notify-sms',
        body := jsonb_build_object(
          'user_id', NEW.buyer_id,
          'event_type', 'deal_status_change',
          'data', jsonb_build_object('title', COALESCE(_listing_title, ''), 'newStatusLabel', _status_label)
        ),
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _anon_key, 'apikey', _anon_key)
      );
    END IF;
  END IF;

  -- Notify seller
  IF NEW.seller_id IS NOT NULL AND NEW.seller_id IS DISTINCT FROM NEW.buyer_id THEN
    INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
    VALUES (
      NEW.seller_id,
      'تحديث حالة الصفقة',
      'صفقة ' || COALESCE(_listing_title, '') || ' أصبحت: ' || _status_label,
      'deal',
      'deal',
      NEW.id::text
    );

    IF _supabase_url IS NOT NULL AND _anon_key IS NOT NULL THEN
      PERFORM extensions.http_post(
        url := _supabase_url || '/functions/v1/notify-user',
        body := jsonb_build_object(
          'userId', NEW.seller_id,
          'category', 'deals',
          'templateName', 'deal-status-change',
          'idempotencyKey', 'deal-status-' || NEW.id || '-seller-' || NEW.status,
          'templateData', jsonb_build_object('dealTitle', COALESCE(_listing_title, ''), 'newStatus', _status_label)
        ),
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _anon_key, 'apikey', _anon_key)
      );
      PERFORM extensions.http_post(
        url := _supabase_url || '/functions/v1/notify-sms',
        body := jsonb_build_object(
          'user_id', NEW.seller_id,
          'event_type', 'deal_status_change',
          'data', jsonb_build_object('title', COALESCE(_listing_title, ''), 'newStatusLabel', _status_label)
        ),
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _anon_key, 'apikey', _anon_key)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


-- Update smart match trigger to also send Email + SMS
CREATE OR REPLACE FUNCTION public.fn_smart_match_on_publish()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _alert record;
  _count integer := 0;
  _supabase_url text;
  _anon_key text;
BEGIN
  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'published') THEN
    _supabase_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1);
    _anon_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1);

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

      -- Email
      IF _supabase_url IS NOT NULL AND _anon_key IS NOT NULL THEN
        PERFORM extensions.http_post(
          url := _supabase_url || '/functions/v1/notify-user',
          body := jsonb_build_object(
            'userId', _alert.user_id,
            'category', 'marketing',
            'templateName', 'search-alert-match',
            'idempotencyKey', 'match-' || _alert.alert_id || '-' || NEW.id,
            'templateData', jsonb_build_object('listingTitle', COALESCE(NEW.title, ''), 'city', COALESCE(NEW.city, ''), 'price', COALESCE(NEW.price::text, ''))
          ),
          headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _anon_key, 'apikey', _anon_key)
        );
        -- SMS
        PERFORM extensions.http_post(
          url := _supabase_url || '/functions/v1/notify-sms',
          body := jsonb_build_object(
            'user_id', _alert.user_id,
            'event_type', 'search_alert_match',
            'data', jsonb_build_object('title', COALESCE(NEW.title, ''), 'price', COALESCE(NEW.price::text, ''))
          ),
          headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _anon_key, 'apikey', _anon_key)
        );
      END IF;

      _count := _count + 1;
    END LOOP;
    IF _count > 0 THEN
      INSERT INTO agent_actions_log (user_id, action_type, action_details, result, reference_type, reference_id)
      VALUES (NEW.owner_id, 'smart_match', jsonb_build_object('matches_sent', _count), 'success', 'listing', NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
