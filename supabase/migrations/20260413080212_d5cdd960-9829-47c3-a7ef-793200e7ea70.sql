
ALTER TABLE public.listing_agent_settings
ADD COLUMN IF NOT EXISTS auto_reply_delay_minutes integer NOT NULL DEFAULT 30;
