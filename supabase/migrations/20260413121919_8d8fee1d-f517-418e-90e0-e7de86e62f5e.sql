
-- Deal parties can view each other's profiles (for agreements, invoices, etc.)
CREATE POLICY "Deal parties view counterparty profile"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE (d.buyer_id = auth.uid() AND d.seller_id = profiles.user_id)
       OR (d.seller_id = auth.uid() AND d.buyer_id = profiles.user_id)
  )
);
