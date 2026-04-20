-- 1) Create cleanup_logs table (append-only audit trail)
CREATE TABLE IF NOT EXISTS public.cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  status text NOT NULL DEFAULT 'success',
  deleted_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors jsonb DEFAULT '[]'::jsonb,
  triggered_by text NOT NULL DEFAULT 'cron'
);

CREATE INDEX IF NOT EXISTS idx_cleanup_logs_started_at
  ON public.cleanup_logs (started_at DESC);

COMMENT ON TABLE public.cleanup_logs IS
  'Append-only audit log of cleanup_old_logs() executions. No UPDATE/DELETE policies = immutable.';

-- 2) Enable RLS — append-only, read restricted to platform_owner & supervisor
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and supervisors read cleanup logs"
  ON public.cleanup_logs
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'platform_owner'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
  );

-- No INSERT/UPDATE/DELETE policies → only SECURITY DEFINER functions can write,
-- and nothing (not even owners) can modify or delete entries.

-- 3) Replace cleanup_old_logs to:
--    - return jsonb summary
--    - add failed_login_attempts (30d) + otp_attempts (7d)
--    - per-table BEGIN/EXCEPTION isolation
--    - self-prune cleanup_logs > 180 days
--    - record execution into cleanup_logs
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(_triggered_by text DEFAULT 'cron')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _started_at timestamptz := clock_timestamp();
  _counts jsonb := '{}'::jsonb;
  _errors jsonb := '[]'::jsonb;
  _status text := 'success';
  _deleted integer;
  _result jsonb;
BEGIN
  -- session_logs: 7 days
  BEGIN
    DELETE FROM public.session_logs
    WHERE created_at < now() - interval '7 days';
    GET DIAGNOSTICS _deleted = ROW_COUNT;
    _counts := _counts || jsonb_build_object('session_logs', _deleted);
  EXCEPTION WHEN OTHERS THEN
    _errors := _errors || jsonb_build_array(jsonb_build_object('table','session_logs','error',SQLERRM));
    _status := 'partial_failure';
  END;

  -- audit_logs: 30 days, exclude critical actions
  BEGIN
    DELETE FROM public.audit_logs
    WHERE created_at < now() - interval '30 days'
      AND action NOT IN (
        'deal_created', 'deal_completed', 'deal_finalized', 'deal_cancelled',
        'deal_suspended', 'deal_deleted_by_admin', 'deal_locked',
        'listing_published', 'listing_deleted', 'listing_soft_deleted',
        'commission_verified', 'payment_confirmed',
        'user_suspended', 'role_changed', 'account_deleted',
        'security_incident', 'failed_login'
      );
    GET DIAGNOSTICS _deleted = ROW_COUNT;
    _counts := _counts || jsonb_build_object('audit_logs', _deleted);
  EXCEPTION WHEN OTHERS THEN
    _errors := _errors || jsonb_build_array(jsonb_build_object('table','audit_logs','error',SQLERRM));
    _status := 'partial_failure';
  END;

  -- notifications: read & older than 30 days (NEVER unread)
  BEGIN
    DELETE FROM public.notifications
    WHERE is_read = true AND created_at < now() - interval '30 days';
    GET DIAGNOSTICS _deleted = ROW_COUNT;
    _counts := _counts || jsonb_build_object('notifications_read', _deleted);
  EXCEPTION WHEN OTHERS THEN
    _errors := _errors || jsonb_build_array(jsonb_build_object('table','notifications','error',SQLERRM));
    _status := 'partial_failure';
  END;

  -- failed_login_attempts: 30 days
  BEGIN
    DELETE FROM public.failed_login_attempts
    WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS _deleted = ROW_COUNT;
    _counts := _counts || jsonb_build_object('failed_login_attempts', _deleted);
  EXCEPTION WHEN OTHERS THEN
    _errors := _errors || jsonb_build_array(jsonb_build_object('table','failed_login_attempts','error',SQLERRM));
    _status := 'partial_failure';
  END;

  -- otp_attempts: 7 days
  BEGIN
    DELETE FROM public.otp_attempts
    WHERE created_at < now() - interval '7 days';
    GET DIAGNOSTICS _deleted = ROW_COUNT;
    _counts := _counts || jsonb_build_object('otp_attempts', _deleted);
  EXCEPTION WHEN OTHERS THEN
    _errors := _errors || jsonb_build_array(jsonb_build_object('table','otp_attempts','error',SQLERRM));
    _status := 'partial_failure';
  END;

  -- self-prune cleanup_logs > 180 days
  BEGIN
    DELETE FROM public.cleanup_logs
    WHERE started_at < now() - interval '180 days';
    GET DIAGNOSTICS _deleted = ROW_COUNT;
    _counts := _counts || jsonb_build_object('cleanup_logs_pruned', _deleted);
  EXCEPTION WHEN OTHERS THEN
    _errors := _errors || jsonb_build_array(jsonb_build_object('table','cleanup_logs','error',SQLERRM));
    _status := 'partial_failure';
  END;

  _result := jsonb_build_object(
    'status', _status,
    'started_at', _started_at,
    'completed_at', clock_timestamp(),
    'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - _started_at))::integer,
    'deleted_counts', _counts,
    'errors', _errors,
    'triggered_by', _triggered_by
  );

  -- Record execution (immutable audit entry)
  INSERT INTO public.cleanup_logs (started_at, completed_at, duration_ms, status, deleted_counts, errors, triggered_by)
  VALUES (
    _started_at,
    clock_timestamp(),
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - _started_at))::integer,
    _status,
    _counts,
    _errors,
    _triggered_by
  );

  RETURN _result;
END;
$function$;

COMMENT ON FUNCTION public.cleanup_old_logs(text) IS
  'Daily log cleanup. Retention: session_logs 7d, notifications(read) 30d, audit_logs(non-critical) 30d, failed_login_attempts 30d, otp_attempts 7d, cleanup_logs 180d. Returns jsonb summary and self-records into cleanup_logs.';