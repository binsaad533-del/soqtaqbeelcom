
-- ============================================================
-- P0 Security Fix: PII Protection on profiles table
-- Strategy: 3 dedicated RPC functions + RLS hardening
-- ============================================================

-- 1) Public profile (everyone, anonymous OK) — NO contact info
CREATE OR REPLACE FUNCTION public.get_public_profile_v2(target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  city text,
  trust_score integer,
  is_verified boolean,
  verification_level text,
  completed_deals integer,
  cancelled_deals integer,
  member_since timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.city,
    p.trust_score,
    p.is_verified,
    p.verification_level,
    p.completed_deals,
    p.cancelled_deals,
    p.created_at AS member_since
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- 2) Counterparty SAFE — masked phone, requires shared deal
CREATE OR REPLACE FUNCTION public.get_counterparty_profile_safe(target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  city text,
  trust_score integer,
  is_verified boolean,
  verification_level text,
  completed_deals integer,
  member_since timestamptz,
  masked_phone text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _is_party boolean;
BEGIN
  IF _viewer IS NULL OR target_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Self lookup → return own data with masked phone
  IF _viewer = target_user_id THEN
    RETURN QUERY
      SELECT p.user_id, p.full_name, p.avatar_url, p.city, p.trust_score,
             p.is_verified, p.verification_level, p.completed_deals,
             p.created_at,
             CASE WHEN p.phone IS NOT NULL AND length(p.phone) >= 4
                  THEN '****' || right(p.phone, 4) ELSE NULL END
      FROM public.profiles p WHERE p.user_id = target_user_id;
    RETURN;
  END IF;

  -- Verify shared deal exists
  SELECT EXISTS (
    SELECT 1 FROM public.deals d
    WHERE (d.buyer_id = _viewer AND d.seller_id = target_user_id)
       OR (d.seller_id = _viewer AND d.buyer_id = target_user_id)
  ) INTO _is_party;

  IF NOT _is_party THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT p.user_id, p.full_name, p.avatar_url, p.city, p.trust_score,
           p.is_verified, p.verification_level, p.completed_deals,
           p.created_at,
           CASE WHEN p.phone IS NOT NULL AND length(p.phone) >= 4
                THEN '****' || right(p.phone, 4) ELSE NULL END
    FROM public.profiles p WHERE p.user_id = target_user_id;
END;
$$;

-- 3) Counterparty LEGAL — full phone, requires signed legal_confirmation
CREATE OR REPLACE FUNCTION public.get_counterparty_profile_legal(
  target_user_id uuid,
  target_deal_id uuid
)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  city text,
  trust_score integer,
  is_verified boolean,
  verification_level text,
  phone text,
  member_since timestamptz
)
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _is_party boolean;
  _counterparty_signed boolean;
  _deal_status text;
BEGIN
  IF _viewer IS NULL OR target_user_id IS NULL OR target_deal_id IS NULL THEN
    INSERT INTO public.audit_logs(user_id, action, resource_type, resource_id, details)
    VALUES (_viewer, 'attempted_legal_contact_access', 'profile',
            COALESCE(target_user_id::text, 'null'),
            jsonb_build_object('reason', 'missing_params', 'deal_id', target_deal_id));
    RETURN;
  END IF;

  -- Condition (a): viewer must be a party in the deal
  SELECT
    ((d.buyer_id = _viewer AND d.seller_id = target_user_id)
      OR (d.seller_id = _viewer AND d.buyer_id = target_user_id)),
    d.status
  INTO _is_party, _deal_status
  FROM public.deals d
  WHERE d.id = target_deal_id;

  IF NOT COALESCE(_is_party, false) THEN
    INSERT INTO public.audit_logs(user_id, action, resource_type, resource_id, details)
    VALUES (_viewer, 'attempted_legal_contact_access', 'profile', target_user_id::text,
            jsonb_build_object('reason', 'not_party', 'deal_id', target_deal_id));
    RETURN;
  END IF;

  -- Condition (c): deal must not be cancelled/rejected
  IF _deal_status IN ('cancelled', 'rejected') THEN
    INSERT INTO public.audit_logs(user_id, action, resource_type, resource_id, details)
    VALUES (_viewer, 'attempted_legal_contact_access', 'profile', target_user_id::text,
            jsonb_build_object('reason', 'deal_inactive', 'deal_id', target_deal_id, 'status', _deal_status));
    RETURN;
  END IF;

  -- Condition (b): counterparty must have an active legal_confirmation
  SELECT EXISTS (
    SELECT 1 FROM public.legal_confirmations lc
    WHERE lc.deal_id = target_deal_id
      AND lc.user_id = target_user_id
      AND lc.invalidated_at IS NULL
  ) INTO _counterparty_signed;

  IF NOT _counterparty_signed THEN
    INSERT INTO public.audit_logs(user_id, action, resource_type, resource_id, details)
    VALUES (_viewer, 'attempted_legal_contact_access', 'profile', target_user_id::text,
            jsonb_build_object('reason', 'no_legal_confirmation', 'deal_id', target_deal_id));
    RETURN;
  END IF;

  -- All checks passed → log successful disclosure & return full data
  INSERT INTO public.audit_logs(user_id, action, resource_type, resource_id, details)
  VALUES (_viewer, 'viewed_legal_contact', 'profile', target_user_id::text,
          jsonb_build_object('deal_id', target_deal_id, 'timestamp', now()));

  RETURN QUERY
    SELECT p.user_id, p.full_name, p.avatar_url, p.city, p.trust_score,
           p.is_verified, p.verification_level, p.phone, p.created_at
    FROM public.profiles p WHERE p.user_id = target_user_id;
END;
$$;

-- ============================================================
-- Grants
-- ============================================================
REVOKE ALL ON FUNCTION public.get_public_profile_v2(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_v2(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_counterparty_profile_safe(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_counterparty_profile_safe(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_counterparty_profile_legal(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_counterparty_profile_legal(uuid, uuid) TO authenticated;

-- ============================================================
-- RLS Hardening: remove direct counterparty access to PII
-- (Owner/supervisor/financial_manager policies remain intact)
-- ============================================================
DROP POLICY IF EXISTS "Deal parties view counterparty profile" ON public.profiles;
DROP POLICY IF EXISTS "Deal parties can view each other profiles" ON public.profiles;
