
-- ═══ 1. Prevent privilege escalation on user_roles ═══

-- Add explicit INSERT restriction
CREATE POLICY "Only owner can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'platform_owner'));

-- Add explicit UPDATE restriction
CREATE POLICY "Only owner can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner'));

-- Add explicit DELETE restriction  
CREATE POLICY "Only owner can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner'));

-- ═══ 2. Fix listing_views: restrict SELECT ═══

DROP POLICY IF EXISTS "Anyone can read views" ON public.listing_views;

CREATE POLICY "Owner and supervisors can read views" ON public.listing_views
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_owner')
    OR public.has_role(auth.uid(), 'supervisor')
    OR user_id = auth.uid()
  );

-- Listing owners can see views on their listings
CREATE POLICY "Listing owners can read their listing views" ON public.listing_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.owner_id = auth.uid()
    )
  );

-- ═══ 3. Fix audit_logs INSERT: restrict to service_role only ═══

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;

-- Only allow inserts where user_id matches (keeps trigger/app inserts working)
-- but remove the platform_owner bypass that could allow impersonation
CREATE POLICY "Users insert own audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ═══ 4. Fix listings storage INSERT policy ═══

DROP POLICY IF EXISTS "Auth users can upload listing files" ON storage.objects;

CREATE POLICY "Users upload to own listing folder" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'listings'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
