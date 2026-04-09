
-- Market alerts table for AI-driven proactive notifications
CREATE TABLE public.market_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL DEFAULT 'opportunity',
  priority text NOT NULL DEFAULT 'normal',
  title text NOT NULL,
  message text NOT NULL,
  reference_type text,
  reference_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.market_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own alerts" ON public.market_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own alerts" ON public.market_alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System inserts alerts" ON public.market_alerts
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_market_alerts_user ON public.market_alerts(user_id, is_read, created_at DESC);

-- Agent settings table
CREATE TABLE public.agent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT false,
  auto_reply_inquiries boolean NOT NULL DEFAULT false,
  auto_evaluate_offers boolean NOT NULL DEFAULT false,
  min_acceptable_price numeric,
  max_budget numeric,
  preferred_response_tone text DEFAULT 'professional',
  auto_reject_below_min boolean NOT NULL DEFAULT false,
  daily_summary boolean NOT NULL DEFAULT true,
  agent_rules jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent settings" ON public.agent_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Agent actions log
CREATE TABLE public.agent_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  action_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  result text,
  reference_type text,
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own agent actions" ON public.agent_actions_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System inserts agent actions" ON public.agent_actions_log
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_agent_actions_user ON public.agent_actions_log(user_id, created_at DESC);
