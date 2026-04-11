
-- ═══ 1. Fix functions missing search_path ═══

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

-- ═══ 2. Tighten overly permissive INSERT policies ═══

-- agent_actions_log: restrict to own user_id
DROP POLICY IF EXISTS "System inserts agent actions" ON public.agent_actions_log;
CREATE POLICY "Users insert own agent actions" ON public.agent_actions_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ai_chat_actions: restrict to own user_id
DROP POLICY IF EXISTS "System inserts chat actions" ON public.ai_chat_actions;
CREATE POLICY "Users insert own chat actions" ON public.ai_chat_actions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ai_chat_messages: restrict to own user_id
DROP POLICY IF EXISTS "System inserts chat messages" ON public.ai_chat_messages;
CREATE POLICY "Users insert own chat messages" ON public.ai_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- backup_logs: only service_role (triggers/edge functions) - remove public insert
DROP POLICY IF EXISTS "System can insert backup logs" ON public.backup_logs;

-- deal_commissions: only triggers (SECURITY DEFINER) - remove public insert
DROP POLICY IF EXISTS "System inserts commissions" ON public.deal_commissions;

-- invoices: only triggers (SECURITY DEFINER) - remove public insert
DROP POLICY IF EXISTS "System inserts invoices" ON public.invoices;

-- market_alerts: only service_role/triggers - remove public insert
DROP POLICY IF EXISTS "System inserts alerts" ON public.market_alerts;

-- security_incidents: only service_role/triggers - remove public insert
DROP POLICY IF EXISTS "System inserts incidents" ON public.security_incidents;
