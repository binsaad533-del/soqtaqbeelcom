import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import AiStar from "@/components/AiStar";
import {
  Activity, Users, FileText, Handshake, Zap, AlertTriangle,
  CheckCircle2, XCircle, Clock, Search, RefreshCw,
  TrendingUp, TrendingDown, Loader2, Shield, Landmark,
  MessageSquare, Bot,
  Monitor, Bell, ArrowRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────
interface LiveStats {
  totalUsers: number;
  activeToday: number;
  totalListings: number;
  publishedListings: number;
  draftListings: number;
  totalDeals: number;
  activeDeals: number;
  completedDeals: number;
  failedDeals: number;
  dealsToday: number;
  totalCommissions: number;
  unpaidCommissions: number;
  paidCommissions: number;
  totalCommissionValue: number;
  unpaidCommissionValue: number;
  totalMessages: number;
  messagesToday: number;
}

interface ActivityEvent {
  id: string;
  time: string;
  type: "user" | "listing" | "deal" | "message" | "commission" | "error" | "ai" | "security";
  action: string;
  userId?: string;
  userName?: string;
  resourceId?: string;
  page?: string;
  severity?: "critical" | "high" | "medium" | "low" | "info";
  status?: "success" | "failure" | "pending";
}

interface SystemAlert {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  time: string;
  resolved: boolean;
}

interface PathStep {
  label: string;
  count: number;
  dropoff: number;
}

// ─── Helpers ─────────────────────────────────────────────
const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
  info: "bg-muted text-muted-foreground border-border",
};

const EVENT_ICONS: Record<string, any> = {
  user: Users, listing: FileText, deal: Handshake, message: MessageSquare,
  commission: Landmark, error: XCircle, ai: Bot, security: Shield,
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
};

const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} س`;
  return `${Math.floor(hrs / 24)} ي`;
};

// ─── Main Component ──────────────────────────────────────
const MonitoringDashboardPage = () => {
  const { role } = useAuthContext();
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<"live" | "paths" | "ai" | "alerts">("live");
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Data Loading ────────────────────────────────────
  const loadStats = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      profilesRes, listingsRes, dealsRes, commissionsRes, msgsRes, msgsTodayRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id, is_active, last_activity, created_at"),
      supabase.from("listings").select("id, status, created_at"),
      supabase.from("deals").select("id, status, created_at, agreed_price"),
      supabase.from("deal_commissions").select("id, payment_status, commission_amount, deal_amount, created_at"),
      supabase.from("negotiation_messages").select("id", { count: "exact", head: true }),
      supabase.from("negotiation_messages").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
    ]);

    const profiles = profilesRes.data || [];
    const listings = listingsRes.data || [];
    const deals = dealsRes.data || [];
    const commissions = commissionsRes.data || [];

    const activeToday = profiles.filter(p => {
      if (p.last_activity) return new Date(p.last_activity) >= today;
      return new Date(p.created_at) >= today;
    }).length;

    const dealsToday = deals.filter(d => new Date(d.created_at) >= today).length;

    setStats({
      totalUsers: profiles.length,
      activeToday,
      totalListings: listings.length,
      publishedListings: listings.filter(l => l.status === "published").length,
      draftListings: listings.filter(l => l.status === "draft").length,
      totalDeals: deals.length,
      activeDeals: deals.filter(d => d.status === "negotiating").length,
      completedDeals: deals.filter(d => ["completed", "finalized"].includes(d.status)).length,
      failedDeals: deals.filter(d => d.status === "cancelled").length,
      dealsToday,
      totalCommissions: commissions.length,
      unpaidCommissions: commissions.filter(c => c.payment_status === "unpaid").length,
      paidCommissions: commissions.filter(c => c.payment_status === "verified").length,
      totalCommissionValue: commissions.reduce((s, c) => s + (c.commission_amount || c.deal_amount * 0.01), 0),
      unpaidCommissionValue: commissions.filter(c => c.payment_status === "unpaid").reduce((s, c) => s + (c.commission_amount || c.deal_amount * 0.01), 0),
      totalMessages: msgsRes.count || 0,
      messagesToday: msgsTodayRes.count || 0,
    });
  }, []);

  const loadEvents = useCallback(async () => {
    const [auditRes, incidentsRes] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("security_incidents").select("*").order("created_at", { ascending: false }).limit(20),
    ]);

    const auditEvents: ActivityEvent[] = (auditRes.data || []).map(a => ({
      id: a.id,
      time: a.created_at,
      type: mapResourceType(a.resource_type),
      action: mapAction(a.action, a.resource_type),
      userId: a.user_id || undefined,
      resourceId: a.resource_id || undefined,
      page: a.resource_type,
      severity: "info" as const,
      status: "success" as const,
    }));

    const incidentEvents: ActivityEvent[] = (incidentsRes.data || []).map(i => ({
      id: i.id,
      time: i.created_at,
      type: "security",
      action: i.description,
      severity: i.severity as any,
      status: i.status === "resolved" ? "success" : "failure",
    }));

    // Build alerts from incidents
    const newAlerts: SystemAlert[] = (incidentsRes.data || [])
      .filter(i => i.status !== "resolved")
      .map(i => ({
        id: i.id,
        title: i.incident_type,
        description: i.description,
        severity: i.severity as any,
        time: i.created_at,
        resolved: false,
      }));

    setEvents([...incidentEvents, ...auditEvents].sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    ).slice(0, 150));
    setAlerts(newAlerts);
  }, []);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadEvents()]);
    setRefreshing(false);
    setLoading(false);
  }, [loadStats, loadEvents]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Auto-refresh every 15s
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadAll, 15000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, loadAll]);

  // Realtime subscription for audit_logs
  useEffect(() => {
    const channel = supabase
      .channel("monitoring-audit")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, (payload) => {
        const a = payload.new as any;
        const newEvent: ActivityEvent = {
          id: a.id,
          time: a.created_at,
          type: mapResourceType(a.resource_type),
          action: mapAction(a.action, a.resource_type),
          userId: a.user_id,
          resourceId: a.resource_id,
          page: a.resource_type,
          severity: "info",
          status: "success",
        };
        setEvents(prev => [newEvent, ...prev].slice(0, 150));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "security_incidents" }, (payload) => {
        const i = payload.new as any;
        const newEvent: ActivityEvent = {
          id: i.id,
          time: i.created_at,
          type: "security",
          action: i.description,
          severity: i.severity,
          status: "failure",
        };
        setEvents(prev => [newEvent, ...prev].slice(0, 150));
        setAlerts(prev => [{
          id: i.id, title: i.incident_type, description: i.description,
          severity: i.severity, time: i.created_at, resolved: false,
        }, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ─── Path Funnel Data ────────────────────────────────
  const listingPath: PathStep[] = stats ? [
    { label: "بدأ الإعلان", count: stats.totalListings, dropoff: 0 },
    { label: "تم نشر الإعلان", count: stats.publishedListings, dropoff: stats.totalListings > 0 ? Math.round((1 - stats.publishedListings / stats.totalListings) * 100) : 0 },
  ] : [];

  const dealPath: PathStep[] = stats ? [
    { label: "بدأ التفاوض", count: stats.totalDeals, dropoff: 0 },
    { label: "تفاوض نشط", count: stats.activeDeals, dropoff: stats.totalDeals > 0 ? Math.round((1 - stats.activeDeals / stats.totalDeals) * 100) : 0 },
    { label: "صفقة مكتملة", count: stats.completedDeals, dropoff: stats.totalDeals > 0 ? Math.round((1 - stats.completedDeals / stats.totalDeals) * 100) : 0 },
  ] : [];

  const commissionPath: PathStep[] = stats ? [
    { label: "عمولة مسجلة", count: stats.totalCommissions, dropoff: 0 },
    { label: "عمولة مدفوعة", count: stats.paidCommissions, dropoff: stats.totalCommissions > 0 ? Math.round((1 - stats.paidCommissions / stats.totalCommissions) * 100) : 0 },
  ] : [];

  // Filter events
  const filteredEvents = events.filter(e => {
    if (severityFilter !== "all" && e.severity !== severityFilter) return false;
    if (searchQuery && !e.action.includes(searchQuery) && !e.userId?.includes(searchQuery)) return false;
    return true;
  });

  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const criticalAlerts = unresolvedAlerts.filter(a => a.severity === "critical" || a.severity === "high");

  if (role !== "platform_owner") {
    return (
      <div className="py-20 text-center">
        <Shield size={32} className="mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">غير مصرح لك بالوصول</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-8 container max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Monitor size={22} strokeWidth={1.5} className="text-foreground" />
            <h1 className="text-xl font-semibold">لوحة المراقبة المباشرة</h1>
            {autoRefresh && (
              <span className="flex items-center gap-1.5 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                مباشر
              </span>
            )}
            {refreshing && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn("text-xs h-7 rounded-lg", autoRefresh ? "text-green-600" : "text-muted-foreground")}
            >
              {autoRefresh ? "تحديث تلقائي ✓" : "تحديث يدوي"}
            </Button>
            <Button variant="ghost" size="sm" onClick={loadAll} className="h-7 rounded-lg">
              <RefreshCw size={13} strokeWidth={1.5} />
            </Button>
          </div>
        </div>

        {/* Critical Alert Banner */}
        {criticalAlerts.length > 0 && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-sm font-medium text-red-800">
                {criticalAlerts.length} تنبيه حرج يتطلب تدخل فوري
              </span>
            </div>
            <div className="space-y-1.5">
              {criticalAlerts.slice(0, 3).map(a => (
                <div key={a.id} className="text-xs text-red-700 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-red-500" />
                  {a.description}
                  <span className="text-red-400 mr-auto">{formatTimeAgo(a.time)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <StatCard icon={Users} label="المستخدمون" value={stats.totalUsers} sub={`${stats.activeToday} نشط اليوم`} />
            <StatCard icon={FileText} label="الإعلانات" value={stats.totalListings} sub={`${stats.publishedListings} منشور`} />
            <StatCard icon={Handshake} label="الصفقات" value={stats.totalDeals} sub={`${stats.activeDeals} نشط · ${stats.dealsToday} اليوم`} />
            <StatCard icon={CheckCircle2} label="مكتملة" value={stats.completedDeals} accent="green" />
            <StatCard icon={XCircle} label="فاشلة" value={stats.failedDeals} accent="red" />
            <StatCard icon={MessageSquare} label="الرسائل" value={stats.totalMessages} sub={`${stats.messagesToday} اليوم`} />
            <StatCard icon={Landmark} label="العمولات" value={stats.totalCommissions} sub={`${stats.unpaidCommissions} غير مدفوعة`} />
            <StatCard
              icon={TrendingUp}
              label="إجمالي العمولة"
              value={`${stats.totalCommissionValue.toLocaleString("en-US")}`}
              sub="ر.س"
              accent="green"
            />
            <StatCard
              icon={TrendingDown}
              label="غير محصلة"
              value={`${stats.unpaidCommissionValue.toLocaleString("en-US")}`}
              sub="ر.س"
              accent="red"
            />
            <StatCard icon={AlertTriangle} label="التنبيهات" value={unresolvedAlerts.length} accent={unresolvedAlerts.length > 0 ? "red" : undefined} />
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
          {[
            { id: "live" as const, label: "النشاط المباشر", icon: Activity },
            { id: "paths" as const, label: "مسارات المستخدم", icon: ArrowRight },
            { id: "ai" as const, label: "الذكاء الاصطناعي", icon: Bot },
            { id: "alerts" as const, label: `التنبيهات (${unresolvedAlerts.length})`, icon: Bell },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all",
                activeSection === tab.id
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              <tab.icon size={13} strokeWidth={1.5} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Live Activity Feed ─── */}
        {activeSection === "live" && (
          <div className="bg-card rounded-2xl border border-border/30 shadow-soft">
            <div className="p-4 border-b border-border/20 flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Activity size={15} strokeWidth={1.5} className="text-foreground" />
                <span className="text-sm font-medium">سجل النشاط المباشر</span>
                <Badge variant="secondary" className="text-[10px]">{filteredEvents.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="بحث..."
                    className="h-7 text-xs w-40 pr-8 rounded-lg"
                  />
                </div>
                <select
                  value={severityFilter}
                  onChange={e => setSeverityFilter(e.target.value)}
                  className="h-7 text-xs rounded-lg border border-border/50 bg-background px-2"
                >
                  <option value="all">الكل</option>
                  <option value="critical">حرج</option>
                  <option value="high">عالي</option>
                  <option value="medium">متوسط</option>
                  <option value="low">منخفض</option>
                  <option value="info">معلومات</option>
                </select>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-border/10">
              {filteredEvents.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">لا توجد أحداث مطابقة</div>
              )}
              {filteredEvents.map(event => {
                const Icon = EVENT_ICONS[event.type] || Activity;
                return (
                  <div key={event.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      event.status === "failure" ? "bg-red-50 text-red-500" :
                      event.type === "security" ? "bg-orange-50 text-orange-500" :
                      "bg-muted/60 text-muted-foreground"
                    )}>
                      <Icon size={13} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed">{event.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{formatTime(event.time)}</span>
                        {event.page && <span className="text-[10px] text-muted-foreground/70">{event.page}</span>}
                        {event.severity && event.severity !== "info" && (
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", SEVERITY_STYLES[event.severity])}>
                            {event.severity === "critical" ? "حرج" : event.severity === "high" ? "عالي" : event.severity === "medium" ? "متوسط" : "منخفض"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {event.status === "failure" && (
                      <XCircle size={12} className="text-red-400 shrink-0 mt-1" />
                    )}
                    {event.status === "success" && (
                      <CheckCircle2 size={12} className="text-green-400 shrink-0 mt-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── User Paths / Funnels ─── */}
        {activeSection === "paths" && (
          <div className="space-y-5">
            <FunnelCard title="مسار إنشاء الإعلان" icon={FileText} steps={listingPath} />
            <FunnelCard title="مسار التفاوض والصفقة" icon={Handshake} steps={dealPath} />
            <FunnelCard title="مسار العمولة" icon={Landmark} steps={commissionPath} />
          </div>
        )}

        {/* ─── AI Monitoring ─── */}
        {activeSection === "ai" && (
          <div className="bg-card rounded-2xl border border-border/30 shadow-soft p-5">
            <div className="flex items-center gap-2 mb-5">
              <AiStar size={18} animate={false} />
              <h3 className="text-sm font-medium">مراقبة الذكاء الاصطناعي</h3>
            </div>
            <AIMonitorSection />
          </div>
        )}

        {/* ─── Alerts ─── */}
        {activeSection === "alerts" && (
          <div className="bg-card rounded-2xl border border-border/30 shadow-soft">
            <div className="p-4 border-b border-border/20 flex items-center gap-2">
              <Bell size={15} strokeWidth={1.5} />
              <span className="text-sm font-medium">التنبيهات النشطة</span>
              <Badge variant="secondary" className="text-[10px]">{unresolvedAlerts.length}</Badge>
            </div>
            <div className="divide-y divide-border/10">
              {unresolvedAlerts.length === 0 && (
                <div className="p-8 text-center">
                  <CheckCircle2 size={24} className="mx-auto mb-2 text-green-400" />
                  <p className="text-sm text-muted-foreground">لا توجد تنبيهات نشطة</p>
                </div>
              )}
              {unresolvedAlerts.map(alert => (
                <div key={alert.id} className="p-4 flex items-start gap-3">
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0",
                    alert.severity === "critical" ? "bg-red-500" :
                    alert.severity === "high" ? "bg-orange-500" :
                    alert.severity === "medium" ? "bg-yellow-500" : "bg-blue-400"
                  )} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{alert.title}</span>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", SEVERITY_STYLES[alert.severity])}>
                        {alert.severity === "critical" ? "حرج" : alert.severity === "high" ? "عالي" : alert.severity === "medium" ? "متوسط" : "منخفض"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{alert.description}</p>
                    <span className="text-[10px] text-muted-foreground/60 mt-1 block">{formatTimeAgo(alert.time)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sub Components ──────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: number | string; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/20 p-4 shadow-soft">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} strokeWidth={1.5} className={cn(
          accent === "green" ? "text-green-500" :
          accent === "red" ? "text-red-500" : "text-muted-foreground"
        )} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div className={cn(
        "text-xl font-semibold",
        accent === "green" ? "text-green-600" :
        accent === "red" ? "text-red-600" : "text-foreground"
      )}>
        {value}
      </div>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function FunnelCard({ title, icon: Icon, steps }: { title: string; icon: any; steps: PathStep[] }) {
  if (steps.length === 0) return null;
  const maxCount = Math.max(...steps.map(s => s.count), 1);
  return (
    <div className="bg-card rounded-2xl border border-border/30 shadow-soft p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} strokeWidth={1.5} className="text-foreground" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs">{step.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{step.count}</span>
                {step.dropoff > 0 && (
                  <span className="text-[10px] text-red-500">-{step.dropoff}%</span>
                )}
              </div>
            </div>
            <Progress value={(step.count / maxCount) * 100} className="h-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AIMonitorSection() {
  const [aiStats, setAiStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [checksRes, msgsRes] = await Promise.all([
        supabase.from("deal_checks").select("id, status, created_at"),
        supabase.from("negotiation_messages").select("id, message_type, created_at")
          .in("message_type", ["ai_request", "ai_response"]),
      ]);

      const checks = checksRes.data || [];
      const aiMsgs = msgsRes.data || [];

      setAiStats({
        totalRequests: checks.length + aiMsgs.length,
        successfulChecks: checks.filter(c => c.status === "completed").length,
        failedChecks: checks.filter(c => c.status === "failed").length,
        pendingChecks: checks.filter(c => c.status === "pending").length,
        aiMessages: aiMsgs.length,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <Skeleton className="h-32" />;
  if (!aiStats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-muted/30 rounded-xl p-3 text-center">
        <Zap size={16} className="mx-auto mb-1 text-primary" />
        <div className="text-lg font-semibold">{aiStats.totalRequests}</div>
        <div className="text-[10px] text-muted-foreground">إجمالي الطلبات</div>
      </div>
      <div className="bg-green-50 rounded-xl p-3 text-center">
        <CheckCircle2 size={16} className="mx-auto mb-1 text-green-500" />
        <div className="text-lg font-semibold text-green-600">{aiStats.successfulChecks}</div>
        <div className="text-[10px] text-muted-foreground">تحليل ناجح</div>
      </div>
      <div className="bg-red-50 rounded-xl p-3 text-center">
        <XCircle size={16} className="mx-auto mb-1 text-red-500" />
        <div className="text-lg font-semibold text-red-600">{aiStats.failedChecks}</div>
        <div className="text-[10px] text-muted-foreground">تحليل فاشل</div>
      </div>
      <div className="bg-yellow-50 rounded-xl p-3 text-center">
        <Clock size={16} className="mx-auto mb-1 text-yellow-600" />
        <div className="text-lg font-semibold text-yellow-700">{aiStats.pendingChecks}</div>
        <div className="text-[10px] text-muted-foreground">معلق</div>
      </div>
    </div>
  );
}

// ─── Mapping helpers ─────────────────────────────────────
function mapResourceType(t: string): ActivityEvent["type"] {
  if (t === "auth") return "user";
  if (t === "listing") return "listing";
  if (t === "deal") return "deal";
  if (t === "message") return "message";
  if (t === "commission") return "commission";
  return "user";
}

function mapAction(action: string, resource: string): string {
  const map: Record<string, string> = {
    login: "تسجيل دخول مستخدم",
    signup: "تسجيل مستخدم جديد",
    listing_created: "تم إنشاء إعلان جديد",
    listing_updated: "تم تحديث إعلان",
    listing_published: "تم نشر إعلان",
    deal_created: "تم إنشاء صفقة جديدة",
    deal_updated: "تم تحديث صفقة",
    deal_finalized: "تم إقفال صفقة",
    agreement_created: "تم إنشاء اتفاقية",
    commission_paid: "تم دفع عمولة",
    export_data: "تصدير بيانات",
  };
  return map[action] || `${action} — ${resource}`;
}

export default MonitoringDashboardPage;
