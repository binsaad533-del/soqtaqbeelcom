DROP POLICY IF EXISTS "Users can view own confirmations" ON public.legal_confirmations;

CREATE POLICY "Deal parties can view confirmations"
ON public.legal_confirmations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.deals d
    WHERE d.id = legal_confirmations.deal_id
      AND (auth.uid() = d.buyer_id OR auth.uid() = d.seller_id)
  )
);