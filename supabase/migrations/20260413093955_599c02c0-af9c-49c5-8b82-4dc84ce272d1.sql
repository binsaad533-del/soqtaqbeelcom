
-- financial_manager can view all commissions
CREATE POLICY "Financial manager views all commissions"
ON public.deal_commissions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'financial_manager'::app_role));

-- financial_manager can update commissions (verify payments)
CREATE POLICY "Financial manager updates commissions"
ON public.deal_commissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'financial_manager'::app_role));

-- financial_manager can view all invoices
CREATE POLICY "Financial manager views all invoices"
ON public.invoices FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'financial_manager'::app_role));

-- financial_manager can view audit logs
CREATE POLICY "Financial manager views audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'financial_manager'::app_role));

-- financial_manager can insert audit logs
CREATE POLICY "Financial manager inserts audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'financial_manager'::app_role) AND auth.uid() = user_id);

-- financial_manager can view profiles (for seller names)
CREATE POLICY "Financial manager views profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'financial_manager'::app_role));

-- financial_manager can view deals (for deal info)
CREATE POLICY "Financial manager views deals"
ON public.deals FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'financial_manager'::app_role));

-- financial_manager can view listings (for titles)
CREATE POLICY "Financial manager views listings"
ON public.listings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'financial_manager'::app_role));
