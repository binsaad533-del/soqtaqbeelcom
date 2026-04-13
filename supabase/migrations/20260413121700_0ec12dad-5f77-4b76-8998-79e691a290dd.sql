
-- ============================================
-- 1. FIX PROFILES PII EXPOSURE
-- ============================================

-- Drop the overly permissive policies that expose ALL columns to everyone
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Anon view limited profile data" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated view public profile data" ON public.profiles;

-- Anon users should NOT have direct table access — they must use get_public_profile() RPC
-- Authenticated users who are not admins can only see their own profile
-- (Other users' public info is accessed via get_public_profile RPC)

-- ============================================
-- 2. FIX LISTING_VIEWS INSERT POLICY
-- ============================================

-- Drop existing permissive INSERT policies
DROP POLICY IF EXISTS "Anyone can record views" ON public.listing_views;
DROP POLICY IF EXISTS "Anon can record views" ON public.listing_views;
DROP POLICY IF EXISTS "Auth users can record views" ON public.listing_views;

-- Allow anon to insert views but user_id must be null
CREATE POLICY "Anon inserts views without user_id"
ON public.listing_views FOR INSERT TO anon
WITH CHECK (user_id IS NULL);

-- Authenticated users can insert views but user_id must match their own ID or be null
CREATE POLICY "Auth users insert own views"
ON public.listing_views FOR INSERT TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());
