CREATE POLICY "Supervisors can update deals"
ON public.deals
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'supervisor'::app_role));