-- 1. Drop the exposed INSERT policy on failed_login_attempts
DROP POLICY IF EXISTS "Insert failed logins" ON public.failed_login_attempts;

-- 2. Ensure RLS is enabled and FORCED on both tables
ALTER TABLE public.otp_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_attempts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts FORCE ROW LEVEL SECURITY;

-- 3. Documentation comments to prevent future regressions
COMMENT ON TABLE public.otp_attempts IS
'OTP rate limiting table. INSERT is INTENTIONALLY restricted to service_role only (via Edge Functions: send-otp, verify-otp, reset-password-send-otp, reset-password-verify). DO NOT add INSERT policy for authenticated users — this would allow rate limit poisoning attacks.';

COMMENT ON TABLE public.failed_login_attempts IS
'Failed login tracking table. INSERT is INTENTIONALLY restricted to service_role only (via detect-incidents Edge Function and auth hooks). DO NOT add INSERT policy for authenticated users — this would corrupt security analytics and allow attackers to hide their trails.';