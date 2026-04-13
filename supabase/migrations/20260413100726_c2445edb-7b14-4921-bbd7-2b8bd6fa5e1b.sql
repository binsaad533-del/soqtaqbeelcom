
-- Trigger function to send commission-created email via pg_net
CREATE OR REPLACE FUNCTION public.fn_notify_commission_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _listing_title text;
  _seller_email text;
  _seller_name text;
  _supabase_url text;
  _anon_key text;
  _commission_amount numeric;
  _vat_amount numeric;
  _total_with_vat numeric;
BEGIN
  -- Calculate amounts
  _commission_amount := ROUND(NEW.deal_amount * NEW.commission_rate, 2);
  _vat_amount := ROUND(_commission_amount * NEW.vat_rate, 2);
  _total_with_vat := _commission_amount + _vat_amount;

  -- Get listing title
  SELECT l.title INTO _listing_title
  FROM deals d JOIN listings l ON l.id::text = d.listing_id
  WHERE d.id = NEW.deal_id LIMIT 1;

  -- Get seller info
  SELECT p.full_name, u.email INTO _seller_name, _seller_email
  FROM profiles p JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = NEW.seller_id LIMIT 1;

  IF _seller_email IS NULL THEN RETURN NEW; END IF;

  -- Get config
  _supabase_url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1);
  _anon_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1);

  IF _supabase_url IS NOT NULL AND _anon_key IS NOT NULL THEN
    PERFORM extensions.http_post(
      url := _supabase_url || '/functions/v1/send-transactional-email',
      body := jsonb_build_object(
        'templateName', 'commission-created',
        'recipientEmail', _seller_email,
        'idempotencyKey', 'commission-created-' || NEW.id,
        'templateData', jsonb_build_object(
          'recipientName', COALESCE(_seller_name, ''),
          'listingTitle', COALESCE(_listing_title, 'صفقتك'),
          'amount', _commission_amount::text,
          'vatAmount', _vat_amount::text,
          'totalWithVat', _total_with_vat::text
        )
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _anon_key,
        'apikey', _anon_key
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on deal_commissions
DROP TRIGGER IF EXISTS trg_notify_commission_created ON public.deal_commissions;
CREATE TRIGGER trg_notify_commission_created
  AFTER INSERT ON public.deal_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_commission_created();
