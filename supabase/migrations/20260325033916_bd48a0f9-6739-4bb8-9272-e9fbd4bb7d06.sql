
ALTER TABLE public.search_alerts
  ADD COLUMN notify_email text,
  ADD COLUMN notify_phone text;
