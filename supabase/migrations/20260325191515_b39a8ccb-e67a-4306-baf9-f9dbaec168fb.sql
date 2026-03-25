CREATE OR REPLACE FUNCTION public.fn_check_dual_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  buyer_confirmed boolean;
  seller_confirmed boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.legal_confirmations
    WHERE deal_id = NEW.deal_id AND party_role = 'buyer' AND invalidated_at IS NULL
  ) INTO buyer_confirmed;

  SELECT EXISTS (
    SELECT 1 FROM public.legal_confirmations
    WHERE deal_id = NEW.deal_id AND party_role = 'seller' AND invalidated_at IS NULL
  ) INTO seller_confirmed;

  IF buyer_confirmed AND seller_confirmed THEN
    UPDATE public.deals
    SET locked = true, status = 'finalized', updated_at = now()
    WHERE id = NEW.deal_id;

    -- Auto-approve the agreement for both parties
    UPDATE public.deal_agreements
    SET 
      buyer_approved = true,
      buyer_approved_at = COALESCE(buyer_approved_at, now()),
      seller_approved = true,
      seller_approved_at = COALESCE(seller_approved_at, now()),
      status = 'active'
    WHERE deal_id = NEW.deal_id
      AND status = 'active';

    INSERT INTO public.deal_history (deal_id, action, actor_id, details)
    VALUES (
      NEW.deal_id,
      'deal_locked',
      NEW.user_id,
      jsonb_build_object('reason', 'dual_legal_confirmation')
    );

    INSERT INTO public.audit_logs (action, resource_type, resource_id, user_id, details)
    VALUES (
      'deal_finalized',
      'deal',
      NEW.deal_id::text,
      NEW.user_id,
      jsonb_build_object('locked_by_dual_approval', true)
    );
  END IF;

  RETURN NEW;
END;
$function$;