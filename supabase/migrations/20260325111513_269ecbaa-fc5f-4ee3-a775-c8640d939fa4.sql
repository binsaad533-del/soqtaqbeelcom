CREATE OR REPLACE FUNCTION public.get_deal_confirmation_status(_deal_id uuid)
RETURNS TABLE (
  buyer_confirmed boolean,
  seller_confirmed boolean,
  current_user_confirmed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.legal_confirmations lc
      JOIN public.deals d ON d.id = lc.deal_id
      WHERE lc.deal_id = _deal_id
        AND lc.invalidated_at IS NULL
        AND lc.party_role = 'buyer'
        AND (auth.uid() = d.buyer_id OR auth.uid() = d.seller_id)
    ) AS buyer_confirmed,
    EXISTS (
      SELECT 1
      FROM public.legal_confirmations lc
      JOIN public.deals d ON d.id = lc.deal_id
      WHERE lc.deal_id = _deal_id
        AND lc.invalidated_at IS NULL
        AND lc.party_role = 'seller'
        AND (auth.uid() = d.buyer_id OR auth.uid() = d.seller_id)
    ) AS seller_confirmed,
    EXISTS (
      SELECT 1
      FROM public.legal_confirmations lc
      JOIN public.deals d ON d.id = lc.deal_id
      WHERE lc.deal_id = _deal_id
        AND lc.invalidated_at IS NULL
        AND lc.user_id = auth.uid()
        AND (auth.uid() = d.buyer_id OR auth.uid() = d.seller_id)
    ) AS current_user_confirmed;
$$;