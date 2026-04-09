
CREATE OR REPLACE FUNCTION fn_notify_new_deal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _listing_title text;
  _buyer_name text;
BEGIN
  SELECT title INTO _listing_title FROM listings WHERE id::text = NEW.listing_id LIMIT 1;
  SELECT full_name INTO _buyer_name FROM profiles WHERE user_id = NEW.buyer_id LIMIT 1;

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
