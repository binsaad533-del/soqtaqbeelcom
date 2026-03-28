
-- ═══════════════════════════════════════════════════════════
-- Performance Optimization: Indexes + Log Retention Functions
-- ═══════════════════════════════════════════════════════════

-- 1) Indexes for most common query patterns (reduce disk reads)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_session_logs_created_at ON public.session_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_logs_user_id ON public.session_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_messages_deal_id ON public.negotiation_messages (deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals (status);
CREATE INDEX IF NOT EXISTS idx_deals_buyer_seller ON public.deals (buyer_id, seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_listings_owner ON public.listings (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_deal_commissions_seller ON public.deal_commissions (seller_id);
CREATE INDEX IF NOT EXISTS idx_deal_commissions_status ON public.deal_commissions (payment_status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- 2) Log retention: function to clean old logs
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Session logs: delete after 7 days
  DELETE FROM public.session_logs 
  WHERE created_at < now() - interval '7 days';

  -- Audit logs: delete non-critical after 30 days
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

  -- Notification cleanup: delete read notifications older than 30 days
  DELETE FROM public.notifications
  WHERE is_read = true AND created_at < now() - interval '30 days';
END;
$$;

-- 3) Deduplication prevention: function to check for recent duplicate audit entries
CREATE OR REPLACE FUNCTION public.fn_prevent_duplicate_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Skip if identical action+resource logged in last 10 seconds
  IF EXISTS (
    SELECT 1 FROM public.audit_logs
    WHERE action = NEW.action
      AND resource_type = NEW.resource_type
      AND COALESCE(resource_id, '') = COALESCE(NEW.resource_id, '')
      AND COALESCE(user_id, '00000000-0000-0000-0000-000000000000') = COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000')
      AND created_at > now() - interval '10 seconds'
  ) THEN
    RETURN NULL; -- Skip insert
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_duplicate_audit
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_duplicate_audit();
