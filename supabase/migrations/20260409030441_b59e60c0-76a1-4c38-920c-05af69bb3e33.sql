
-- Create AI user memory table for persistent preferences
CREATE TABLE public.ai_user_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferred_cities TEXT[] DEFAULT '{}',
  preferred_activities TEXT[] DEFAULT '{}',
  budget_min NUMERIC DEFAULT NULL,
  budget_max NUMERIC DEFAULT NULL,
  notes JSONB DEFAULT '[]',
  interaction_count INTEGER DEFAULT 0,
  last_search_query TEXT DEFAULT NULL,
  viewed_listings TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_user_memory ENABLE ROW LEVEL SECURITY;

-- Users can view their own memory
CREATE POLICY "Users can view own ai memory"
ON public.ai_user_memory
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own memory
CREATE POLICY "Users can insert own ai memory"
ON public.ai_user_memory
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own memory
CREATE POLICY "Users can update own ai memory"
ON public.ai_user_memory
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_ai_user_memory_updated_at
BEFORE UPDATE ON public.ai_user_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX idx_ai_user_memory_user_id ON public.ai_user_memory(user_id);
