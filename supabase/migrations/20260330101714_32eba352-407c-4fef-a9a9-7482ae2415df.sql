
-- Trigger: auto-create notification when a new deal is created (new interest)
CREATE OR REPLACE FUNCTION public.fn_notify_new_deal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _listing_title text;
  _buyer_name text;
BEGIN
  -- Get listing title
  SELECT title INTO _listing_title FROM listings WHERE id::text = NEW.listing_id LIMIT 1;
  -- Get buyer name
  SELECT full_name INTO _buyer_name FROM profiles WHERE user_id = NEW.buyer_id LIMIT 1;

  -- Notify seller about new interest
  IF NEW.seller_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
    VALUES (
      NEW.seller_id,
      'اهتمام جديد بإعلانك',
      COALESCE(_buyer_name, 'مشتري') || ' أبدى اهتمامه بـ ' || COALESCE(_listing_title, 'إعلانك'),
      'deal',
      'deal',
      NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_deal
AFTER INSERT ON deals
FOR EACH ROW
EXECUTE FUNCTION fn_notify_new_deal();

-- Trigger: auto-create notification when a new negotiation message is sent
CREATE OR REPLACE FUNCTION public.fn_notify_new_negotiation_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _other_party_id uuid;
  _sender_name text;
  _deal_title text;
BEGIN
  -- Skip system messages
  IF NEW.sender_type != 'user' THEN RETURN NEW; END IF;

  -- Find the other party
  SELECT
    CASE WHEN d.buyer_id = NEW.sender_id THEN d.seller_id ELSE d.buyer_id END
  INTO _other_party_id
  FROM deals d WHERE d.id = NEW.deal_id;

  IF _other_party_id IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO _sender_name FROM profiles WHERE user_id = NEW.sender_id LIMIT 1;

  -- Get listing title via deal
  SELECT l.title INTO _deal_title
  FROM deals d JOIN listings l ON l.id::text = d.listing_id
  WHERE d.id = NEW.deal_id LIMIT 1;

  INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
  VALUES (
    _other_party_id,
    'رسالة جديدة في التفاوض',
    COALESCE(_sender_name, 'مستخدم') || ': ' || LEFT(NEW.message, 80),
    'message',
    'deal',
    NEW.deal_id::text
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_negotiation_message
AFTER INSERT ON negotiation_messages
FOR EACH ROW
EXECUTE FUNCTION fn_notify_new_negotiation_message();

-- Trigger: auto-create notification when a new listing offer is made
CREATE OR REPLACE FUNCTION public.fn_notify_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _seller_id uuid;
  _listing_title text;
  _buyer_name text;
BEGIN
  -- Get listing owner and title
  SELECT owner_id, title INTO _seller_id, _listing_title
  FROM listings WHERE id = NEW.listing_id LIMIT 1;

  IF _seller_id IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO _buyer_name FROM profiles WHERE user_id = NEW.buyer_id LIMIT 1;

  INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
  VALUES (
    _seller_id,
    'عرض سعر جديد',
    COALESCE(_buyer_name, 'مشتري') || ' قدم عرض ' || NEW.offered_price || ' ر.س على ' || COALESCE(_listing_title, 'إعلانك'),
    'offer',
    'listing',
    NEW.listing_id::text
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_offer
AFTER INSERT ON listing_offers
FOR EACH ROW
EXECUTE FUNCTION fn_notify_new_offer();

-- Trigger: auto-create notification when deal status changes
CREATE OR REPLACE FUNCTION public.fn_notify_deal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _listing_title text;
  _status_label text;
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
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_deal_status_change
AFTER UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION fn_notify_deal_status_change();
