
CREATE TABLE public.ai_chat_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chat_message_id uuid REFERENCES public.ai_chat_messages(id),
  rating text NOT NULL CHECK (rating IN ('positive', 'negative')),
  comment text,
  error_category text,
  user_message_snapshot text,
  ai_response_snapshot text,
  detected_intent text,
  action_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_feedback_user ON public.ai_chat_feedback(user_id);
CREATE INDEX idx_ai_feedback_rating ON public.ai_chat_feedback(rating);
CREATE INDEX idx_ai_feedback_created ON public.ai_chat_feedback(created_at DESC);
CREATE INDEX idx_ai_feedback_intent ON public.ai_chat_feedback(detected_intent);
CREATE INDEX idx_ai_feedback_msg ON public.ai_chat_feedback(chat_message_id);

ALTER TABLE public.ai_chat_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own feedback"
  ON public.ai_chat_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own feedback"
  ON public.ai_chat_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner views all feedback"
  ON public.ai_chat_feedback FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_owner'::app_role));

CREATE POLICY "Supervisor views all feedback"
  ON public.ai_chat_feedback FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'supervisor'::app_role));

-- Unique constraint: one rating per message per user
CREATE UNIQUE INDEX idx_ai_feedback_unique ON public.ai_chat_feedback(chat_message_id, user_id);
