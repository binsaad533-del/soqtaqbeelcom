
-- Fix the overly permissive INSERT policy on notifications
DROP POLICY "System can insert notifications" ON public.notifications;

-- Only authenticated users or service role can insert notifications
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
