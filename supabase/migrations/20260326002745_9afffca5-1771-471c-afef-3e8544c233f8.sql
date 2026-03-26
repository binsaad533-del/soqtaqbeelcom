
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  -- Mandatory notifications (always sent, user cannot disable)
  -- deal_status_change, legal_confirmation, security_alert, account_verification
  
  -- Optional notification channels
  deals_sms boolean NOT NULL DEFAULT true,
  deals_email boolean NOT NULL DEFAULT true,
  offers_sms boolean NOT NULL DEFAULT true,
  offers_email boolean NOT NULL DEFAULT true,
  messages_sms boolean NOT NULL DEFAULT false,
  messages_email boolean NOT NULL DEFAULT true,
  marketing_sms boolean NOT NULL DEFAULT false,
  marketing_email boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner views all preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'));

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
