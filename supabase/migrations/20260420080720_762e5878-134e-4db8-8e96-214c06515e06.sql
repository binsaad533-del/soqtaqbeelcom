-- Remove duplicate index (idx_notifications_user_read is identical to idx_notifications_user_unread)
DROP INDEX IF EXISTS public.idx_notifications_user_read;

-- Drop the old partial index (will be replaced with a better one that includes created_at)
DROP INDEX IF EXISTS public.idx_notifications_user_unread;

-- 1) Primary index: paginated list of all notifications per user, sorted by date
-- Used by useNotifications.fetchNotifications (50 most recent per user)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

COMMENT ON INDEX public.idx_notifications_user_created IS
  'Paginated list of all user notifications sorted by date - covers fetchNotifications and Realtime filter';

-- 2) Partial index: unread notifications per user (much smaller, very fast for badge counts and markAllAsRead)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = false;

COMMENT ON INDEX public.idx_notifications_user_unread IS
  'Fast lookup of unread notifications per user (badge counts, markAllAsRead) - partial index keeps it tiny';

-- 3) Composite index for dedup checks in edge functions (commission-reminders, security-scan, agent-automations)
-- Pattern: WHERE user_id = X AND type = Y AND created_at > Z
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
  ON public.notifications (user_id, type, created_at DESC);

COMMENT ON INDEX public.idx_notifications_user_type_created IS
  'Supports dedup checks by (user_id, type, created_at) used in commission-reminders, security-scan, agent-automations';

-- Refresh statistics so the planner picks up the new indexes
ANALYZE public.notifications;