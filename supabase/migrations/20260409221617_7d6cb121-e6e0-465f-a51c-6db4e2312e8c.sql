
CREATE OR REPLACE FUNCTION public.notify_owner_on_negative_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  neg_count integer;
  today_start timestamptz;
  owner_record record;
  already_notified boolean;
BEGIN
  IF NEW.rating NOT IN ('negative', 'bad', 'poor', '1', '2') THEN
    RETURN NEW;
  END IF;

  today_start := date_trunc('day', now());

  SELECT count(*) INTO neg_count
  FROM ai_chat_feedback
  WHERE rating IN ('negative', 'bad', 'poor', '1', '2')
    AND created_at >= today_start;

  IF neg_count >= 10 THEN
    SELECT EXISTS (
      SELECT 1 FROM notifications
      WHERE type = 'negative_feedback_alert'
        AND created_at >= today_start
        AND reference_type = 'feedback_daily_alert'
    ) INTO already_notified;

    IF NOT already_notified THEN
      FOR owner_record IN
        SELECT user_id FROM user_roles WHERE role = 'platform_owner'
      LOOP
        INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
        VALUES (
          owner_record.user_id,
          'تنبيه: تقييمات سلبية مرتفعة',
          'وصل عدد التقييمات السلبية اليوم إلى ' || neg_count || ' تقييم. يرجى مراجعة ملاحظات المستخدمين.',
          'negative_feedback_alert',
          'feedback_daily_alert',
          to_char(now(), 'YYYY-MM-DD')
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_negative_feedback_alert
AFTER INSERT ON public.ai_chat_feedback
FOR EACH ROW
EXECUTE FUNCTION public.notify_owner_on_negative_feedback();
