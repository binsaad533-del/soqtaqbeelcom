
-- Legal confirmations table to store dual-approval consent records
CREATE TABLE public.legal_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) NOT NULL,
  user_id uuid NOT NULL,
  party_role text NOT NULL CHECK (party_role IN ('buyer', 'seller')),
  confirmations jsonb NOT NULL DEFAULT '[]',
  deal_snapshot jsonb NOT NULL DEFAULT '{}',
  ip_address text,
  user_agent text,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  invalidated_at timestamptz,
  invalidation_reason text,
  version integer NOT NULL DEFAULT 1
);

ALTER TABLE public.legal_confirmations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own confirmations
CREATE POLICY "Users can view own confirmations"
  ON public.legal_confirmations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own confirmations
CREATE POLICY "Users can insert own confirmations"
  ON public.legal_confirmations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all confirmations"
  ON public.legal_confirmations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner'));

-- Trigger: when both parties confirm, lock the deal
CREATE OR REPLACE FUNCTION public.fn_check_dual_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_confirmed boolean;
  seller_confirmed boolean;
  deal_record record;
BEGIN
  SELECT * INTO deal_record FROM deals WHERE id = NEW.deal_id;
  
  SELECT EXISTS (
    SELECT 1 FROM legal_confirmations
    WHERE deal_id = NEW.deal_id AND party_role = 'buyer' AND invalidated_at IS NULL
  ) INTO buyer_confirmed;
  
  SELECT EXISTS (
    SELECT 1 FROM legal_confirmations
    WHERE deal_id = NEW.deal_id AND party_role = 'seller' AND invalidated_at IS NULL
  ) INTO seller_confirmed;
  
  IF buyer_confirmed AND seller_confirmed THEN
    UPDATE deals SET locked = true, status = 'finalized', updated_at = now() WHERE id = NEW.deal_id;
    
    INSERT INTO deal_history (deal_id, action, actor_id, details)
    VALUES (NEW.deal_id, 'deal_locked', NEW.user_id, jsonb_build_object('reason', 'dual_legal_confirmation'));
    
    INSERT INTO audit_logs (action, resource_type, resource_id, user_id, details)
    VALUES ('deal_finalized', 'deal', NEW.deal_id::text, NEW.user_id::text, 
      jsonb_build_object('locked_by_dual_approval', true));
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_dual_approval
  AFTER INSERT ON public.legal_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_dual_approval();

-- Trigger: invalidate confirmations when deal changes
CREATE OR REPLACE FUNCTION public.fn_invalidate_confirmations_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.locked = false AND (
    NEW.agreed_price IS DISTINCT FROM OLD.agreed_price OR
    NEW.deal_type IS DISTINCT FROM OLD.deal_type OR
    NEW.deal_details IS DISTINCT FROM OLD.deal_details
  ) THEN
    UPDATE legal_confirmations
    SET invalidated_at = now(), invalidation_reason = 'deal_modified'
    WHERE deal_id = NEW.id AND invalidated_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invalidate_confirmations
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_invalidate_confirmations_on_change();
