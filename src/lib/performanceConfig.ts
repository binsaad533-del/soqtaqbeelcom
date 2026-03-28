/**
 * ═══════════════════════════════════════════════════════════
 * Platform Performance & Resource-Safe Mode Configuration
 * ═══════════════════════════════════════════════════════════
 * 
 * Controls logging, realtime, AI, and refresh behavior.
 * Resource-safe mode automatically reduces non-essential activity.
 */

// ─── Resource-Safe Mode ────────────────────────────────────
let _resourceSafeMode = false;

export function isResourceSafeMode(): boolean {
  return _resourceSafeMode;
}

export function setResourceSafeMode(enabled: boolean) {
  _resourceSafeMode = enabled;
  if (enabled) {
    console.info("[PerfConfig] Resource-safe mode ENABLED — reducing background activity");
  }
}

// Auto-detect based on slow responses
let _slowResponseCount = 0;
export function reportSlowResponse() {
  _slowResponseCount++;
  if (_slowResponseCount >= 3 && !_resourceSafeMode) {
    setResourceSafeMode(true);
  }
}

export function reportFastResponse() {
  if (_slowResponseCount > 0) _slowResponseCount--;
  if (_slowResponseCount === 0 && _resourceSafeMode) {
    setResourceSafeMode(false);
  }
}

// ─── Refresh Intervals ─────────────────────────────────────
export function getRefreshInterval(): number {
  return _resourceSafeMode ? 60_000 : 30_000; // 60s safe, 30s normal
}

export function getMonitoringRefreshInterval(): number {
  return _resourceSafeMode ? 60_000 : 30_000; // was 15s, now 30s normal
}

// ─── Logging Config ────────────────────────────────────────

/** Actions that are ALWAYS worth logging */
const CRITICAL_ACTIONS = new Set([
  // Listings
  "listing_created", "listing_updated", "listing_published", "listing_deleted",
  "listing_soft_deleted",
  // Deals
  "deal_created", "negotiation_started", "deal_status_changed", "deal_completed",
  "deal_finalized", "deal_cancelled", "deal_suspended", "deal_activated",
  "deal_deleted_by_admin", "deal_locked",
  // Admin
  "admin_action", "user_suspended", "user_activated", "role_changed",
  "supervisor_promoted", "supervisor_demoted",
  // Payments
  "commission_verified", "commission_paid", "payment_confirmed",
  // Security
  "login", "session_timeout", "failed_login", "security_incident",
  "account_deleted", "password_changed",
  // AI (high-value only)
  "ai_deal_analysis", "ai_document_extraction", "ai_listing_summary",
  "ai_risk_analysis",
  // Complaints
  "listing_reported", "message_reported",
]);

/** Actions we skip entirely to reduce I/O */
const SKIPPED_ACTIONS = new Set([
  "page_view", "scroll", "click", "filter_change", "search",
  "tab_switch", "modal_open", "modal_close", "tooltip_shown",
  "theme_toggle", "language_toggle", "currency_toggle",
]);

export function shouldLog(action: string): boolean {
  if (SKIPPED_ACTIONS.has(action)) return false;
  if (CRITICAL_ACTIONS.has(action)) return true;
  // In resource-safe mode, only log critical
  if (_resourceSafeMode) return false;
  // Default: allow but with dedup
  return true;
}

// ─── Deduplication ─────────────────────────────────────────
const _recentLogs = new Map<string, number>();
const DEDUP_WINDOW_MS = 10_000; // 10 seconds

export function isDuplicateLog(action: string, resourceId?: string): boolean {
  const key = `${action}:${resourceId || ""}`;
  const now = Date.now();
  const last = _recentLogs.get(key);
  if (last && now - last < DEDUP_WINDOW_MS) return true;
  _recentLogs.set(key, now);
  // Cleanup old entries periodically
  if (_recentLogs.size > 100) {
    for (const [k, v] of _recentLogs) {
      if (now - v > DEDUP_WINDOW_MS * 2) _recentLogs.delete(k);
    }
  }
  return false;
}

// ─── AI Rate Limiting ──────────────────────────────────────
const _aiCallCache = new Map<string, { result: any; timestamp: number }>();
const AI_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedAiResult(cacheKey: string): any | null {
  const cached = _aiCallCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > AI_CACHE_TTL_MS) {
    _aiCallCache.delete(cacheKey);
    return null;
  }
  return cached.result;
}

export function setCachedAiResult(cacheKey: string, result: any) {
  _aiCallCache.set(cacheKey, { result, timestamp: Date.now() });
  // Cap cache size
  if (_aiCallCache.size > 50) {
    const oldest = [..._aiCallCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) _aiCallCache.delete(oldest[0]);
  }
}

const _aiCallTimestamps = new Map<string, number>();
const AI_DEBOUNCE_MS = 3000;

export function isAiCallThrottled(callId: string): boolean {
  const last = _aiCallTimestamps.get(callId);
  const now = Date.now();
  if (last && now - last < AI_DEBOUNCE_MS) return true;
  _aiCallTimestamps.set(callId, now);
  return false;
}

// ─── Dashboard Load Limits ─────────────────────────────────
export function getDashboardPageSize(): number {
  return _resourceSafeMode ? 25 : 50;
}

export function getAuditLogLimit(): number {
  return _resourceSafeMode ? 30 : 100;
}

// ─── Autosave Debounce ─────────────────────────────────────
export function getAutosaveDelay(): number {
  return _resourceSafeMode ? 10_000 : 5_000; // 10s safe, 5s normal
}

// ─── Performance Metrics (in-memory) ───────────────────────
interface PerfMetric {
  action: string;
  count: number;
  totalMs: number;
  lastAt: number;
}

const _metrics = new Map<string, PerfMetric>();

export function trackPerf(action: string, durationMs: number) {
  const existing = _metrics.get(action);
  if (existing) {
    existing.count++;
    existing.totalMs += durationMs;
    existing.lastAt = Date.now();
  } else {
    _metrics.set(action, { action, count: 1, totalMs: durationMs, lastAt: Date.now() });
  }
}

export function getPerfMetrics(): PerfMetric[] {
  return [..._metrics.values()].sort((a, b) => b.count - a.count);
}

export function getRealtimeChannelCount(): number {
  // This is tracked externally
  return _activeChannels;
}

let _activeChannels = 0;
export function registerChannel() { _activeChannels++; }
export function unregisterChannel() { _activeChannels = Math.max(0, _activeChannels - 1); }
