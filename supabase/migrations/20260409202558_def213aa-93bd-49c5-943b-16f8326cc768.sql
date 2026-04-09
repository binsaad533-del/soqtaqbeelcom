
-- Chat messages log
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL DEFAULT gen_random_uuid()::text,
  user_message text NOT NULL,
  ai_response text,
  detected_intent text,
  executed_action text,
  status text NOT NULL DEFAULT 'success',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_messages_user ON public.ai_chat_messages(user_id);
CREATE INDEX idx_ai_chat_messages_session ON public.ai_chat_messages(session_id);
CREATE INDEX idx_ai_chat_messages_created ON public.ai_chat_messages(created_at DESC);
CREATE INDEX idx_ai_chat_messages_action ON public.ai_chat_messages(executed_action);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own chat messages"
  ON public.ai_chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System inserts chat messages"
  ON public.ai_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owner views all chat messages"
  ON public.ai_chat_messages FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'::app_role));

CREATE POLICY "Supervisor views all chat messages"
  ON public.ai_chat_messages FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- AI actions audit trail
CREATE TABLE public.ai_chat_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chat_message_id uuid REFERENCES public.ai_chat_messages(id),
  action_type text NOT NULL,
  triggered_by text NOT NULL DEFAULT 'ai',
  source text NOT NULL DEFAULT 'ai_chat',
  before_data jsonb DEFAULT '{}'::jsonb,
  after_data jsonb DEFAULT '{}'::jsonb,
  confirmed boolean DEFAULT false,
  reference_type text,
  reference_id text,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_actions_user ON public.ai_chat_actions(user_id);
CREATE INDEX idx_ai_chat_actions_type ON public.ai_chat_actions(action_type);
CREATE INDEX idx_ai_chat_actions_ref ON public.ai_chat_actions(reference_type, reference_id);
CREATE INDEX idx_ai_chat_actions_executed ON public.ai_chat_actions(executed_at DESC);

ALTER TABLE public.ai_chat_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own chat actions"
  ON public.ai_chat_actions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System inserts chat actions"
  ON public.ai_chat_actions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owner views all chat actions"
  ON public.ai_chat_actions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'::app_role));

CREATE POLICY "Supervisor views all chat actions"
  ON public.ai_chat_actions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));
