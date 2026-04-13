
-- Create enum for attempt type
CREATE TYPE public.otp_attempt_type AS ENUM ('request', 'verify');

-- Create otp_attempts table
CREATE TABLE public.otp_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  ip_address TEXT,
  user_id UUID,
  attempt_type otp_attempt_type NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for rate limiting queries
CREATE INDEX idx_otp_attempts_phone_type_created ON public.otp_attempts (phone, attempt_type, created_at DESC);
CREATE INDEX idx_otp_attempts_user_created ON public.otp_attempts (user_id, attempt_type, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_otp_attempts_ip_created ON public.otp_attempts (ip_address, attempt_type, created_at DESC) WHERE ip_address IS NOT NULL;

-- Enable RLS
ALTER TABLE public.otp_attempts ENABLE ROW LEVEL SECURITY;

-- Users can read their own attempts
CREATE POLICY "Users can view own OTP attempts"
ON public.otp_attempts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Platform owner can read all
CREATE POLICY "Owner can view all OTP attempts"
ON public.otp_attempts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_owner'));

-- Insert allowed for service role (edge functions use service role for this)
-- No insert policy for authenticated users - edge functions use admin client

-- Trigger to alert owner on suspicious activity (10+ failed attempts per phone per day)
CREATE OR REPLACE FUNCTION public.fn_alert_otp_abuse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fail_count integer;
  today_start timestamptz;
  already_alerted boolean;
  owner_record record;
BEGIN
  IF NEW.success = true THEN RETURN NEW; END IF;

  today_start := date_trunc('day', now());

  SELECT count(*) INTO fail_count
  FROM otp_attempts
  WHERE phone = NEW.phone
    AND success = false
    AND created_at >= today_start;

  IF fail_count >= 10 THEN
    SELECT EXISTS (
      SELECT 1 FROM notifications
      WHERE type = 'otp_abuse_alert'
        AND reference_id = NEW.phone
        AND created_at >= today_start
    ) INTO already_alerted;

    IF NOT already_alerted THEN
      FOR owner_record IN
        SELECT user_id FROM user_roles WHERE role = 'platform_owner'
      LOOP
        INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
        VALUES (
          owner_record.user_id,
          'محاولة اختراق محتملة - OTP',
          'تم تسجيل ' || fail_count || ' محاولة فاشلة على الرقم ' || RIGHT(NEW.phone, 4) || ' اليوم',
          'otp_abuse_alert',
          'security',
          NEW.phone
        );
      END LOOP;

      INSERT INTO audit_logs (action, resource_type, resource_id, details)
      VALUES (
        'otp_abuse_detected',
        'security',
        NEW.phone,
        jsonb_build_object('fail_count', fail_count, 'phone_last4', RIGHT(NEW.phone, 4))
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alert_otp_abuse
AFTER INSERT ON public.otp_attempts
FOR EACH ROW
EXECUTE FUNCTION public.fn_alert_otp_abuse();
