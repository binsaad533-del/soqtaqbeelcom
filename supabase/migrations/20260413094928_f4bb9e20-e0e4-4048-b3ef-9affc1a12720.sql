
-- Supervisor read-only on audit_logs
CREATE POLICY "Supervisor can read audit_logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'supervisor'::app_role));

-- Supervisor read-only on agent_actions_log
CREATE POLICY "Supervisor can read agent_actions_log"
ON public.agent_actions_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'supervisor'::app_role));

-- Supervisor read-only on otp_attempts
CREATE POLICY "Supervisor can read otp_attempts"
ON public.otp_attempts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'supervisor'::app_role));

-- Supervisor read-only on listing_reports
CREATE POLICY "Supervisor can read listing_reports"
ON public.listing_reports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'supervisor'::app_role));

-- Supervisor read-only on all notifications
CREATE POLICY "Supervisor can read all notifications"
ON public.notifications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'supervisor'::app_role));
