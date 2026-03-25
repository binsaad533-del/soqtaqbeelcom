CREATE POLICY "Deal parties can view each other profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deals d
    WHERE (
      (d.buyer_id = auth.uid() AND d.seller_id = profiles.user_id)
      OR
      (d.seller_id = auth.uid() AND d.buyer_id = profiles.user_id)
    )
  )
);