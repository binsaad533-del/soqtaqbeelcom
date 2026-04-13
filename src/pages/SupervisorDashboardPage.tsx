import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { useSupervisorPermissions, type SupervisorPermissions } from "@/hooks/useSupervisorPermissions";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { cn } from "@/lib/utils";
import {
  FileText, AlertTriangle, CheckCircle,
  ChevronLeft, Loader2, Eye, Users, Handshake, TrendingUp,
  Search, Bell, Activity, RefreshCw, Shield, ShieldAlert, UserCheck, User,
  ClipboardList, Download, BarChart3, LifeBuoy
} from "lucide-react";
import FraudMonitorPanel from "@/components/FraudMonitorPanel";
import SupportTicketsPanel from "@/components/SupportTicketsPanel";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";
import AccountSettingsPanel from "@/components/AccountSettingsPanel";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import * as XLSX from "xlsx";

type Tab = "overview" | "listings" | "deals" | "users" | "reports" | "monitoring" | "support" | "account";

const ALL_TABS: { id: Tab; label: string; icon: any; perm?: string }[] = [
  { id: "overview", label: "نظرة عامة", icon: Eye },
  { id: "listings", label: "الإعلانات", icon: FileText, perm: "manage_listings" },
  { id: "deals", label: "الصفقات", icon: Handshake, perm: "manage_deals" },
  { id: "users", label: "المستخدمون", icon: Users, perm: "manage_users" },
  { id: "reports", label: "البلاغات", icon: AlertTriangle, perm: "manage_reports" },
  { id: "monitoring", label: "المراقبة والتدقيق", icon: ClipboardList },
  { id: "support", label: "الدعم الفني", icon: LifeBuoy },
  { id: "account", label: "حسابي", icon: User },
];

const statusLabel = (s: string) => {
  const m: Record<string, { label: string; cls: string }> = {
    draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
    published: { label: "منشور", cls: "bg-success/10 text-success" },
    negotiating: { label: "تفاوض", cls: "bg-primary/10 text-primary" },
    completed: { label: "مكتملة", cls: "bg-success/10 text-success" },
    finalized: { label: "نهائية", cls: "bg-primary/10 text-primary" },
    cancelled: { label: "ملغاة", cls: "bg-destructive/10 text-destructive" },
    suspended: { label: "معلّقة", cls: "bg-warning/10 text-warning" },
  };
  return m[s] || { label: s, cls: "bg-muted text-muted-foreground" };
};

/* ── Monitoring Tab Component ── */
const MonitoringTab = ({ profiles }: { profiles: Profile[] }) => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [agentLogs, setAgentLogs] = useState<any[]>([]);
  const [otpAttempts, setOtpAttempts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [stalledDeals, setStalledDeals] = useState<any[]>([]);
  const [overdueCommissions, setOverdueCommissions] = useState(0);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [otpAbuse, setOtpAbuse] = useState<any[]>([]);
  const [zeroViewListings, setZeroViewListings] = useState(0);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [weeklySummary, setWeeklySummary] = useState({ newListings: 0, completedDeals: 0, collectedCommissions: 0, reportsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [auditFilter, setAuditFilter] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("");

  const getProfileName = useCallback((userId: string | null) => {
    if (!userId) return "—";
    return profiles.find(p => p.user_id === userId)?.full_name || userId.slice(0, 8);
  }, [profiles]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 3600000).toISOString();
        const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 3600000).toISOString();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

        const [
          auditRes, agentRes, otpRes, reportsRes,
          stalledRes, overdueRes, pendingReportsRes,
          pendingVerRes, otpAbuseRes, zeroViewRes,
          weekListingsRes, weekDealsRes, weekCommRes, weekReportsRes
        ] = await Promise.all([
          supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
          supabase.from("agent_actions_log").select("*").order("created_at", { ascending: false }).limit(100),
          supabase.from("otp_attempts").select("*").eq("success", false).order("created_at", { ascending: false }).limit(20),
          supabase.from("listing_reports").select("*").order("created_at", { ascending: false }).limit(10),
          // Stalled deals > 7 days
          supabase.from("deals").select("id, status, updated_at, listing_id").eq("status", "negotiating").lt("updated_at", sevenDaysAgo),
          // Overdue commissions > 30 days
          supabase.from("deal_commissions").select("id", { count: "exact", head: true }).eq("payment_status", "pending").lt("created_at", thirtyDaysAgo),
          // Pending reports > 48h
          supabase.from("listing_reports").select("*").eq("status", "pending").lt("created_at", fortyEightHoursAgo),
          // Pending verifications > 72h (profiles awaiting verification)
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_level", "pending").lt("created_at", seventyTwoHoursAgo),
          // OTP abuse today
          Promise.resolve({ data: null as any }),
          // Zero view listings > 7 days
          supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published").lt("published_at", sevenDaysAgo),
          // Weekly: new listings
          supabase.from("listings").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
          // Weekly: completed deals
          supabase.from("deals").select("id", { count: "exact", head: true }).in("status", ["completed", "finalized"]).gte("updated_at", weekStart),
          // Weekly: collected commissions
          supabase.from("deal_commissions").select("id", { count: "exact", head: true }).eq("payment_status", "verified").gte("updated_at", weekStart),
          // Weekly: reports
          supabase.from("listing_reports").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
        ]);

        setAuditLogs(auditRes.data || []);
        setAgentLogs(agentRes.data || []);
        setOtpAttempts(otpRes.data || []);
        setReports(reportsRes.data || []);
        setStalledDeals(stalledRes.data || []);
        setOverdueCommissions(overdueRes.count || 0);
        setPendingReports(pendingReportsRes.data || []);
        setPendingVerifications(pendingVerRes.count || 0);
        setZeroViewListings(zeroViewRes.count || 0);
        setWeeklySummary({
          newListings: weekListingsRes.count || 0,
          completedDeals: weekDealsRes.count || 0,
          collectedCommissions: weekCommRes.count || 0,
          reportsCount: weekReportsRes.count || 0,
        });

        // OTP abuse: group by phone where fail >= 10 today
        if (!otpAbuseRes.data) {
          // Fallback: check from otp_attempts directly
          const { data: otpToday } = await supabase
            .from("otp_attempts")
            .select("phone")
            .eq("success", false)
            .gte("created_at", todayStart);
          if (otpToday) {
            const phoneCounts: Record<string, number> = {};
            otpToday.forEach((a: any) => { phoneCounts[a.phone] = (phoneCounts[a.phone] || 0) + 1; });
            setOtpAbuse(Object.entries(phoneCounts).filter(([, c]) => c >= 10).map(([phone, count]) => ({ phone, count })));
          }
        } else {
          setOtpAbuse(otpAbuseRes.data || []);
        }

        // Activity chart: last 30 days
        const days: any[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400000);
          days.push({ date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" }), dateISO: d.toISOString().slice(0, 10) });
        }

        const [listingsActivity, dealsActivity, offersActivity] = await Promise.all([
          supabase.from("listings").select("created_at").gte("created_at", thirtyDaysAgo),
          supabase.from("deals").select("created_at").gte("created_at", thirtyDaysAgo),
          supabase.from("listing_offers").select("created_at").gte("created_at", thirtyDaysAgo),
        ]);

        const countByDay = (items: any[]) => {
          const map: Record<string, number> = {};
          items?.forEach(item => {
            const day = item.created_at?.slice(0, 10);
            if (day) map[day] = (map[day] || 0) + 1;
          });
          return map;
        };

        const listingsMap = countByDay(listingsActivity.data || []);
        const dealsMap = countByDay(dealsActivity.data || []);
        const offersMap = countByDay(offersActivity.data || []);

        setActivityData(days.map(d => ({
          date: d.date,
          إعلانات: listingsMap[d.dateISO] || 0,
          صفقات: dealsMap[d.dateISO] || 0,
          عروض: offersMap[d.dateISO] || 0,
        })));

      } catch (err) {
        console.error("Monitoring load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredAuditLogs = useMemo(() => {
    let logs = auditLogs;
    if (auditFilter) logs = logs.filter(l => l.action === auditFilter);
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      logs = logs.filter(l =>
        l.action?.toLowerCase().includes(q) ||
        l.resource_type?.toLowerCase().includes(q) ||
        getProfileName(l.user_id).toLowerCase().includes(q)
      );
    }
    return logs;
  }, [auditLogs, auditFilter, auditSearch, getProfileName]);

  const filteredAgentLogs = useMemo(() => {
    if (!agentFilter) return agentLogs;
    return agentLogs.filter(l => l.action_type === agentFilter);
  }, [agentLogs, agentFilter]);

  const auditActionTypes = useMemo(() => [...new Set(auditLogs.map(l => l.action))], [auditLogs]);
  const agentActionTypes = useMemo(() => [...new Set(agentLogs.map(l => l.action_type))], [agentLogs]);

  const exportExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success("تم التصدير بنجاح");
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  return (
    <div className="space-y-6">
      {/* Section 1: Monitoring Alerts */}
      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Bell size={15} className="text-destructive" /> تنبيهات المراقبة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "صفقات متوقفة > 7 أيام", value: stalledDeals.length, color: "bg-destructive/10 text-destructive", icon: "🔴" },
            { label: "عمولات متأخرة > 30 يوم", value: overdueCommissions, color: "bg-destructive/10 text-destructive", icon: "🔴" },
            { label: "بلاغات بدون رد > 48 ساعة", value: pendingReports.length, color: "bg-warning/10 text-warning", icon: "🟠" },
            { label: "توثيقات بانتظار > 72 ساعة", value: pendingVerifications, color: "bg-warning/10 text-warning", icon: "🟠" },
            { label: "محاولات OTP مشبوهة اليوم", value: otpAbuse.length, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: "🟡" },
            { label: "إعلانات بدون مشاهدات > 7 أيام", value: zeroViewListings, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: "🟡" },
          ].map((alert, i) => (
            <div key={i} className={cn("rounded-xl p-3 flex items-center justify-between", alert.color)}>
              <span className="text-xs font-medium">{alert.label}</span>
              <span className="text-lg font-bold">{alert.value}</span>
            </div>
          ))}
        </div>
        {/* Stalled deals list */}
        {stalledDeals.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">صفقات متوقفة:</p>
            {stalledDeals.slice(0, 5).map(d => (
              <div key={d.id} className="text-[11px] text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                صفقة #{d.id.slice(0, 6)} — آخر نشاط: {new Date(d.updated_at).toLocaleDateString("en-GB")}
              </div>
            ))}
          </div>
        )}
        {pendingReports.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">بلاغات بدون رد:</p>
            {pendingReports.slice(0, 5).map(r => (
              <div key={r.id} className="text-[11px] text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                بلاغ على إعلان #{r.listing_id?.slice(0, 6)} — السبب: {r.reason} — {new Date(r.created_at).toLocaleDateString("en-GB")}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Audit Log */}
      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield size={15} className="text-primary" /> سجل التدقيق
          </h3>
          <button onClick={() => exportExcel(filteredAuditLogs.map(l => ({
            التاريخ: new Date(l.created_at).toLocaleString("en-GB"),
            المستخدم: getProfileName(l.user_id),
            الإجراء: l.action,
            المورد: l.resource_type,
            التفاصيل: JSON.stringify(l.details),
          })), "audit_logs")} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
            <Download size={12} /> تصدير Excel
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="بحث..." className="pr-8 text-xs h-8 rounded-lg" />
          </div>
          <select value={auditFilter} onChange={e => setAuditFilter(e.target.value)} className="text-xs h-8 rounded-lg border border-border bg-background px-2">
            <option value="">كل الإجراءات</option>
            {auditActionTypes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">التاريخ</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">المستخدم</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">الإجراء</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">المورد</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuditLogs.slice(0, 50).map(log => (
                <tr key={log.id} className="border-b border-border/10 hover:bg-muted/20">
                  <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-2 px-2">{getProfileName(log.user_id)}</td>
                  <td className="py-2 px-2"><span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{log.action}</span></td>
                  <td className="py-2 px-2 text-muted-foreground">{log.resource_type}</td>
                  <td className="py-2 px-2 text-muted-foreground max-w-[200px] truncate">{log.details ? JSON.stringify(log.details).slice(0, 60) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAuditLogs.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">لا توجد سجلات</p>}
        </div>
      </div>

      {/* Section 3: Agent Actions Log */}
      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity size={15} className="text-success" /> سجل مقبل (الوكيل الذكي)
          </h3>
        </div>
        <div className="mb-3">
          <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} className="text-xs h-8 rounded-lg border border-border bg-background px-2">
            <option value="">كل الإجراءات</option>
            {agentActionTypes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">التاريخ</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">المستخدم</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">نوع الإجراء</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">التفاصيل</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">النتيجة</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgentLogs.slice(0, 50).map(log => (
                <tr key={log.id} className="border-b border-border/10 hover:bg-muted/20">
                  <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-2 px-2">{getProfileName(log.user_id)}</td>
                  <td className="py-2 px-2"><span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">{log.action_type}</span></td>
                  <td className="py-2 px-2 text-muted-foreground max-w-[200px] truncate">{log.action_details ? JSON.stringify(log.action_details).slice(0, 60) : "—"}</td>
                  <td className="py-2 px-2">
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px]",
                      log.result === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}>{log.result || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAgentLogs.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">لا توجد إجراءات</p>}
        </div>
      </div>

      {/* Section 4: Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* OTP attempts */}
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield size={15} className="text-warning" /> محاولات OTP الفاشلة
          </h3>
          <div className="space-y-1.5">
            {otpAttempts.slice(0, 20).map((a, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">****{a.phone?.slice(-4)}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{a.ip_address?.slice(0, 15) || "—"}</span>
                  <span>{new Date(a.created_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            ))}
            {otpAttempts.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد محاولات</p>}
          </div>
        </div>

        {/* Recent reports */}
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-destructive" /> آخر البلاغات
          </h3>
          <div className="space-y-1.5">
            {reports.slice(0, 10).map(r => (
              <div key={r.id} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full", r.status === "pending" ? "bg-warning" : r.status === "resolved" ? "bg-success" : "bg-muted-foreground")} />
                  <span>إعلان #{r.listing_id?.slice(0, 6)}</span>
                  <span className="text-muted-foreground">— {r.reason}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px]",
                    r.status === "pending" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                  )}>{r.status === "pending" ? "معلّق" : r.status === "resolved" ? "تم الحل" : r.status}</span>
                  <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-GB")}</span>
                </div>
              </div>
            ))}
            {reports.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد بلاغات</p>}
          </div>
        </div>
      </div>

      {/* Section 5: Fraud Detection */}
      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <ShieldAlert size={15} className="text-destructive" /> كشف الاحتيال
        </h3>
        <FraudMonitorPanel profiles={profiles} />
      </div>

      {/* Section 6: Weekly Activity Report */}
      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 size={15} className="text-primary" /> تقرير النشاط
          </h3>
          <button onClick={() => exportExcel(activityData, "weekly_activity")} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
            <Download size={12} /> تصدير التقرير
          </button>
        </div>

        {/* Weekly summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "إعلانات جديدة", value: weeklySummary.newListings, cls: "text-primary" },
            { label: "صفقات مكتملة", value: weeklySummary.completedDeals, cls: "text-success" },
            { label: "عمولات محصّلة", value: weeklySummary.collectedCommissions, cls: "text-primary" },
            { label: "بلاغات", value: weeklySummary.reportsCount, cls: "text-warning" },
          ].map((s, i) => (
            <div key={i} className="bg-muted/30 rounded-xl p-3 text-center">
              <div className={cn("text-xl font-bold", s.cls)}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{s.label} (هذا الأسبوع)</div>
            </div>
          ))}
        </div>

        {/* Activity chart */}
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ fontSize: 11, direction: "rtl", borderRadius: 12 }} />
              <Line type="monotone" dataKey="إعلانات" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="صفقات" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="عروض" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const SupervisorDashboardPage = () => {
  useSEO({ title: "لوحة مشرف التشغيل", description: "لوحة تحكم مشرف التشغيل — متابعة الإعلانات والصفقات والمراقبة على سوق تقبيل", canonical: "/supervisor-dashboard" });
  const { profile, signOut } = useAuthContext();
  const { getAllListings } = useListings();
  const { getAllDeals } = useDeals();
  const { getAllProfiles } = useProfiles();
  const { getMyPermissions } = useSupervisorPermissions();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [myPerms, setMyPerms] = useState<SupervisorPermissions | null>(null);

  const TABS = useMemo(() => {
    if (!myPerms) return ALL_TABS;
    return ALL_TABS.filter(t => !t.perm || (myPerms as any)[t.perm]);
  }, [myPerms]);

  const [feed, setFeed] = useState<{ id: string; text: string; time: string; type: string }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [l, d, p, perms] = await Promise.all([
        getAllListings().catch(() => [] as Listing[]),
        getAllDeals().catch(() => [] as Deal[]),
        getAllProfiles().catch(() => [] as Profile[]),
        getMyPermissions().catch(() => null),
      ]);
      setListings(l || []); setDeals(d || []); setProfiles(p || []);
      setMyPerms(perms);
    } catch (err) {
      console.error("Supervisor dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [getAllListings, getAllDeals, getAllProfiles, getMyPermissions]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const ch = supabase.channel("supervisor-dash-critical")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "security_incidents" }, () => {
        setFeed(prev => [{ id: crypto.randomUUID(), text: "⚠️ حادثة أمنية جديدة", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }), type: "incident" }, ...prev].slice(0, 8));
        toast.warning("تنبيه: حادثة أمنية جديدة");
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const completedDeals = useMemo(() => deals.filter(d => ["completed", "finalized"].includes(d.status)), [deals]);
  const activeDeals = useMemo(() => deals.filter(d => d.status === "negotiating"), [deals]);
  const newListings = useMemo(() => listings.filter(l => l.status === "draft"), [listings]);
  const newUsers = useMemo(() => profiles.filter(p => {
    const created = new Date(p.created_at);
    const week = new Date(); week.setDate(week.getDate() - 7);
    return created >= week;
  }), [profiles]);

  const getProfileName = (userId: string | null) => {
    if (!userId) return "—";
    return profiles.find(p => p.user_id === userId)?.full_name || "—";
  };

  const filteredListings = useMemo(() => {
    if (!searchQuery) return listings;
    const q = searchQuery.toLowerCase();
    return listings.filter(l => l.title?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q));
  }, [listings, searchQuery]);

  const filteredDeals = useMemo(() => {
    if (!searchQuery) return deals;
    const q = searchQuery.toLowerCase();
    return deals.filter(d => d.id.includes(q) || getProfileName(d.buyer_id).toLowerCase().includes(q) || getProfileName(d.seller_id).toLowerCase().includes(q));
  }, [deals, searchQuery]);

  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(p => p.full_name?.toLowerCase().includes(q) || p.phone?.includes(searchQuery));
  }, [profiles, searchQuery]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={24} className="animate-spin text-primary" /></div>;

  return (
    <div className="py-6">
      <div className="container max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">لوحة مشرف التشغيل</h1>
            <p className="text-sm text-muted-foreground">مرحباً {profile?.full_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
              <RefreshCw size={13} className="text-muted-foreground" />
            </button>
            <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/50">خروج</button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "الإعلانات", value: listings.length, icon: FileText, accent: "text-primary" },
            { label: "الصفقات النشطة", value: activeDeals.length, icon: TrendingUp, accent: "text-primary" },
            { label: "مكتملة", value: completedDeals.length, icon: CheckCircle, accent: "text-success" },
            { label: "مستخدمون جدد", value: newUsers.length, icon: Users, accent: "text-warning", sub: "هذا الأسبوع" },
          ].map((kpi, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 hover:shadow-soft-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-muted-foreground">{kpi.label}</span>
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", `${kpi.accent}/10`)}>
                  <kpi.icon size={14} strokeWidth={1.5} className={kpi.accent} />
                </div>
              </div>
              <div className="text-xl font-bold tracking-tight">{kpi.value}</div>
              {"sub" in kpi && <span className="text-[9px] text-muted-foreground">{kpi.sub}</span>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }} className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs whitespace-nowrap transition-all",
              activeTab === tab.id ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            )}>
              <tab.icon size={13} strokeWidth={1.3} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ CONTENT ═══ */}
        {activeTab === "monitoring" ? (
          <MonitoringTab profiles={profiles} />
        ) : activeTab === "support" ? (
          <SupportTicketsPanel />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">

              {["listings", "deals", "users"].includes(activeTab) && (
                <div className="relative">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="pr-9 text-sm rounded-xl" />
                </div>
              )}

              {/* Overview */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><FileText size={14} className="text-primary" strokeWidth={1.5} /></div>
                        آخر الإعلانات
                      </h3>
                      <button onClick={() => setActiveTab("listings")} className="text-[10px] text-primary hover:underline">عرض الكل</button>
                    </div>
                    <div className="space-y-2">
                      {listings.slice(0, 6).map(l => {
                        const st = statusLabel(l.status);
                        return (
                          <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <FileText size={14} className="text-muted-foreground" strokeWidth={1.3} />
                              </div>
                              <div>
                                <div className="text-xs font-medium group-hover:text-primary transition-colors">{l.title || "بدون عنوان"}</div>
                                <div className="text-[10px] text-muted-foreground">{l.city || "—"} {l.price ? <>· {Number(l.price).toLocaleString("en-US")} <SarSymbol size={8} /></> : ""}</div>
                              </div>
                            </div>
                            <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                          </Link>
                        );
                      })}
                      {listings.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">لا توجد إعلانات</p>}
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center"><Handshake size={14} className="text-success" strokeWidth={1.5} /></div>
                        آخر الصفقات
                      </h3>
                      <button onClick={() => setActiveTab("deals")} className="text-[10px] text-primary hover:underline">عرض الكل</button>
                    </div>
                    <div className="space-y-2">
                      {deals.slice(0, 6).map(d => {
                        const st = statusLabel(d.status);
                        return (
                          <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Handshake size={14} className="text-muted-foreground" strokeWidth={1.3} />
                              </div>
                              <div>
                                <div className="text-xs font-medium">صفقة #{d.id.slice(0, 6)}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {getProfileName(d.seller_id)} ← {getProfileName(d.buyer_id)}
                                  {d.agreed_price ? <> · {Number(d.agreed_price).toLocaleString("en-US")} <SarSymbol size={8} /></> : ""}
                                </div>
                              </div>
                            </div>
                            <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                          </div>
                        );
                      })}
                      {deals.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">لا توجد صفقات</p>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "listings" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">{filteredListings.length} إعلان</p>
                  {filteredListings.map(l => {
                    const st = statusLabel(l.status);
                    return (
                      <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/30 hover:shadow-soft transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0"><FileText size={16} className="text-muted-foreground" strokeWidth={1.3} /></div>
                          <div>
                            <div className="text-sm font-medium group-hover:text-primary transition-colors">{l.title || "بدون عنوان"}</div>
                            <div className="text-[11px] text-muted-foreground">{l.city || "—"} · {l.business_activity || "—"} {l.price ? <>· {Number(l.price).toLocaleString("en-US")} <SarSymbol size={9} /></> : ""}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                          <ChevronLeft size={14} className="text-muted-foreground/40" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {activeTab === "deals" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">{filteredDeals.length} صفقة</p>
                  {filteredDeals.map(d => {
                    const st = statusLabel(d.status);
                    return (
                      <div key={d.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/30 hover:shadow-soft transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0"><Handshake size={16} className="text-muted-foreground" strokeWidth={1.3} /></div>
                          <div>
                            <div className="text-sm font-medium">صفقة #{d.id.slice(0, 6)}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {getProfileName(d.seller_id)} ← {getProfileName(d.buyer_id)}
                              {d.agreed_price ? <> · {Number(d.agreed_price).toLocaleString("en-US")} <SarSymbol size={8} /></> : ""}
                              {" · "}{new Date(d.created_at).toLocaleDateString("en-GB")}
                            </div>
                          </div>
                        </div>
                        <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                      </div>
                    );
                  })}
                  {filteredDeals.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">لا توجد صفقات</p>}
                </div>
              )}

              {activeTab === "users" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">{filteredProfiles.length} مستخدم</p>
                  {filteredProfiles.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                          {p.full_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{p.full_name || "—"}</span>
                            {p.is_verified && <UserCheck size={12} className="text-success" />}
                            {p.is_suspended && <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">معلّق</span>}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {p.phone || "—"} · {p.email || "—"} · {p.city || "—"} · {p.completed_deals} صفقة مكتملة
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        ثقة: {p.trust_score}%
                      </div>
                    </div>
                  ))}
                  {filteredProfiles.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">لا يوجد مستخدمون</p>}
                </div>
              )}

              {activeTab === "reports" && (
                <div className="bg-card rounded-2xl p-12 shadow-soft border border-border/30 text-center">
                  <AlertTriangle size={32} className="mx-auto mb-3 text-muted-foreground/20" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground">لا توجد بلاغات حالياً</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">ستظهر هنا أي بلاغات جديدة فور وصولها</p>
                </div>
              )}

              {activeTab === "account" && <AccountSettingsPanel />}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <Activity size={13} className="text-success" /> النشاط المباشر
                  </h3>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span className="text-[9px] text-muted-foreground">مباشر</span>
                  </span>
                </div>
                {feed.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-4">لا يوجد نشاط حالياً</p>
                ) : (
                  <div className="space-y-2.5">
                    {feed.slice(0, 6).map(f => (
                      <div key={f.id} className="flex items-center gap-2 text-[11px]">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                          f.type === "incident" ? "bg-destructive" : f.type === "deal" ? "bg-success" : "bg-primary"
                        )} />
                        <span className="text-muted-foreground flex-1 truncate">{f.text}</span>
                        <span className="text-[9px] text-muted-foreground/40 shrink-0">{f.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                  <Shield size={13} className="text-primary" /> ملخص سريع
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "إعلانات مسودة", value: newListings.length, cls: newListings.length > 0 ? "text-warning" : "text-muted-foreground" },
                    { label: "صفقات قيد التفاوض", value: activeDeals.length, cls: "text-primary" },
                    { label: "صفقات مكتملة", value: completedDeals.length, cls: "text-success" },
                    { label: "إجمالي المستخدمين", value: profiles.length, cls: "text-muted-foreground" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{s.label}</span>
                      <span className={cn("text-sm font-semibold", s.cls)}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <h3 className="text-xs font-semibold mb-3">روابط سريعة</h3>
                <div className="space-y-1.5">
                  <button onClick={() => setActiveTab("listings")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors text-xs text-muted-foreground text-right">
                    <FileText size={13} /> مراجعة الإعلانات
                  </button>
                  <button onClick={() => setActiveTab("deals")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors text-xs text-muted-foreground text-right">
                    <Handshake size={13} /> متابعة الصفقات
                  </button>
                  <button onClick={() => setActiveTab("monitoring")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors text-xs text-muted-foreground text-right">
                    <ClipboardList size={13} /> المراقبة والتدقيق
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboardPage;
