import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Users, FileText, Handshake, TrendingUp, TrendingDown, Landmark,
  AlertTriangle, Bell, ShieldCheck, Activity, ChevronLeft, Download,
  MapPin, Store, Clock, Target, BarChart3, ArrowUp, ArrowDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import SarSymbol from "@/components/SarSymbol";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Listing } from "@/hooks/useListings";
import type { Deal } from "@/hooks/useDeals";
import type { Profile } from "@/hooks/useProfiles";
import type { Commission } from "@/hooks/useCommissions";

interface Props {
  listings: Listing[];
  deals: Deal[];
  profiles: Profile[];
  commissions: Commission[];
  getProfileName: (id: string | null) => string;
  onNavigateTab: (tab: string, filter?: string) => void;
}

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--success))", "hsl(210,80%,55%)",
  "hsl(30,80%,55%)", "hsl(280,60%,55%)", "hsl(350,70%,55%)",
  "hsl(170,60%,45%)", "hsl(45,80%,50%)"
];

type ActivityTab = "listings" | "deals" | "commissions" | "users";

const OwnerOverviewTab = ({ listings, deals, profiles, commissions, getProfileName, onNavigateTab }: Props) => {
  const [activityTab, setActivityTab] = useState<ActivityTab>("listings");
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // ── KPI calculations ──
  const publishedListings = useMemo(() => listings.filter(l => l.status === "published" && !l.deleted_at), [listings]);
  const activeDeals = useMemo(() => deals.filter(d => ["negotiating", "in_progress"].includes(d.status)), [deals]);
  const completedThisMonth = useMemo(() => deals.filter(d => ["completed", "finalized"].includes(d.status) && new Date(d.created_at) >= thisMonthStart), [deals]);
  const completedLastMonth = useMemo(() => deals.filter(d => ["completed", "finalized"].includes(d.status) && new Date(d.created_at) >= lastMonthStart && new Date(d.created_at) <= lastMonthEnd), [deals]);
  const collectedThisMonth = useMemo(() => commissions.filter(c => c.payment_status === "verified" && new Date(c.updated_at) >= thisMonthStart).reduce((s, c) => s + c.commission_amount, 0), [commissions]);
  const collectedLastMonth = useMemo(() => commissions.filter(c => c.payment_status === "verified" && new Date(c.updated_at) >= lastMonthStart && new Date(c.updated_at) <= lastMonthEnd).reduce((s, c) => s + c.commission_amount, 0), [commissions]);

  const usersThisMonth = useMemo(() => profiles.filter(p => new Date(p.created_at) >= thisMonthStart).length, [profiles]);
  const usersLastMonth = useMemo(() => profiles.filter(p => new Date(p.created_at) >= lastMonthStart && new Date(p.created_at) <= lastMonthEnd).length, [profiles]);
  const userGrowthPct = usersLastMonth > 0 ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100) : usersThisMonth > 0 ? 100 : 0;

  const conversionRate = useMemo(() => {
    if (publishedListings.length === 0) return 0;
    const allCompleted = deals.filter(d => ["completed", "finalized"].includes(d.status)).length;
    return Math.round((allCompleted / publishedListings.length) * 100);
  }, [deals, publishedListings]);

  const revenueGrowthPct = collectedLastMonth > 0 ? Math.round(((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100) : collectedThisMonth > 0 ? 100 : 0;
  const completedGrowthPct = completedLastMonth.length > 0 ? Math.round(((completedThisMonth.length - completedLastMonth.length) / completedLastMonth.length) * 100) : completedThisMonth.length > 0 ? 100 : 0;

  // ── Alerts ──
  const overdueCommissions = useMemo(() => {
    const threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return commissions.filter(c => c.payment_status !== "verified" && new Date(c.created_at) < threshold);
  }, [commissions]);
  const stalledDeals = useMemo(() => {
    const threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return deals.filter(d => ["negotiating", "in_progress"].includes(d.status) && new Date(d.updated_at) < threshold);
  }, [deals]);
  const hasAlerts = overdueCommissions.length > 0 || stalledDeals.length > 0;

  // ── 12-month user growth ──
  const userGrowthData = useMemo(() => {
    const data: { month: string; users: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const count = profiles.filter(p => new Date(p.created_at) <= endOfMonth).length;
      data.push({ month: MONTH_NAMES[d.getMonth()], users: count });
    }
    return data;
  }, [profiles]);

  // ── 12-month revenue ──
  const revenueData = useMemo(() => {
    const data: { month: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const rev = commissions.filter(c => c.payment_status === "verified" && new Date(c.updated_at) >= d && new Date(c.updated_at) <= end).reduce((s, c) => s + c.commission_amount, 0);
      data.push({ month: MONTH_NAMES[d.getMonth()], revenue: rev });
    }
    return data;
  }, [commissions]);

  // ── 30-day daily bars ──
  const dailyData = useMemo(() => {
    const data: { day: string; listings: number; deals: number; offers: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStr = `${d.getDate()}/${d.getMonth() + 1}`;
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      data.push({
        day: dayStr,
        listings: listings.filter(l => new Date(l.created_at) >= dayStart && new Date(l.created_at) < dayEnd).length,
        deals: deals.filter(dl => new Date(dl.created_at) >= dayStart && new Date(dl.created_at) < dayEnd).length,
        offers: 0, // listing_offers not available in props
      });
    }
    return data;
  }, [listings, deals]);

  // ── Pie: by activity ──
  const activityPieData = useMemo(() => {
    const map: Record<string, number> = {};
    publishedListings.forEach(l => {
      const act = l.business_activity || "غير محدد";
      map[act] = (map[act] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [publishedListings]);

  // ── Pie: by city ──
  const cityPieData = useMemo(() => {
    const map: Record<string, number> = {};
    publishedListings.forEach(l => {
      const city = l.city || "غير محدد";
      map[city] = (map[city] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [publishedListings]);

  // ── Performance metrics ──
  const avgDealTime = useMemo(() => {
    const closed = deals.filter(d => d.completed_at && ["completed", "finalized"].includes(d.status));
    if (!closed.length) return 0;
    return Math.round(closed.reduce((s, d) => s + (new Date(d.completed_at!).getTime() - new Date(d.created_at).getTime()), 0) / closed.length / 86400000);
  }, [deals]);

  const completedVsCancelled = useMemo(() => {
    const comp = deals.filter(d => ["completed", "finalized"].includes(d.status)).length;
    const canc = deals.filter(d => d.status === "cancelled").length;
    return { completed: comp, cancelled: canc };
  }, [deals]);

  const topCities = useMemo(() => {
    const map: Record<string, number> = {};
    publishedListings.forEach(l => { if (l.city) map[l.city] = (map[l.city] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [publishedListings]);

  const topActivities = useMemo(() => {
    const map: Record<string, number> = {};
    publishedListings.forEach(l => { if (l.business_activity) map[l.business_activity] = (map[l.business_activity] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [publishedListings]);

  // ── Export ──
  const handleExport = async (type: "excel" | "pdf") => {
    if (type === "excel") {
      const { utils, writeFile } = await import("xlsx");
      const wb = utils.book_new();
      const kpiData = [
        ["المؤشر", "القيمة"],
        ["إجمالي المستخدمين", profiles.length],
        ["إعلانات نشطة", publishedListings.length],
        ["صفقات جارية", activeDeals.length],
        ["صفقات مكتملة هذا الشهر", completedThisMonth.length],
        ["إيرادات محصلة هذا الشهر", collectedThisMonth],
        ["معدل التحويل", `${conversionRate}%`],
      ];
      const ws = utils.aoa_to_sheet(kpiData);
      utils.book_append_sheet(wb, ws, "KPIs");
      writeFile(wb, `تقرير_سوق_تقبيل_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait" });
      doc.setFont("helvetica");
      doc.setFontSize(16);
      doc.text("Souq Taqbeel - Dashboard Report", 105, 20, { align: "center" });
      doc.setFontSize(10);
      const rows = [
        `Total Users: ${profiles.length}`,
        `Active Listings: ${publishedListings.length}`,
        `Active Deals: ${activeDeals.length}`,
        `Completed This Month: ${completedThisMonth.length}`,
        `Revenue This Month: ${collectedThisMonth.toLocaleString("en-US")} SAR`,
        `Conversion Rate: ${conversionRate}%`,
      ];
      rows.forEach((r, i) => doc.text(r, 20, 40 + i * 8));
      doc.save(`report_${new Date().toISOString().slice(0, 10)}.pdf`);
    }
  };

  const GrowthBadge = ({ pct }: { pct: number }) => (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md",
      pct > 0 ? "bg-success/10 text-success" : pct < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
      {pct > 0 ? <ArrowUp size={10} /> : pct < 0 ? <ArrowDown size={10} /> : null}
      {pct > 0 ? "+" : ""}{pct}%
    </span>
  );

  const recentListings = useMemo(() => [...listings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10), [listings]);
  const recentDeals = useMemo(() => [...deals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10), [deals]);
  const recentCommissions = useMemo(() => [...commissions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10), [commissions]);
  const recentUsers = useMemo(() => [...profiles].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5), [profiles]);

  const stMap: Record<string, { label: string; cls: string }> = {
    negotiating: { label: "قيد التفاوض", cls: "bg-warning/10 text-warning" },
    in_progress: { label: "قيد التنفيذ", cls: "bg-primary/10 text-primary" },
    completed: { label: "مكتملة", cls: "bg-success/10 text-success" },
    finalized: { label: "نهائية", cls: "bg-primary/10 text-primary" },
    cancelled: { label: "ملغاة", cls: "bg-destructive/10 text-destructive" },
  };

  return (
    <div className="space-y-6">
      {/* ── Alerts Bar ── */}
      {hasAlerts && (
        <div className="flex flex-wrap gap-3">
          {overdueCommissions.length > 0 && (
            <div onClick={() => onNavigateTab("deals", "unpaid")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/5 border border-destructive/15 cursor-pointer hover:bg-destructive/10 transition-colors">
              <AlertTriangle size={14} className="text-destructive shrink-0" />
              <span className="text-xs font-medium text-destructive">{overdueCommissions.length} عمولة متأخرة أكثر من 30 يوم</span>
            </div>
          )}
          {stalledDeals.length > 0 && (
            <div onClick={() => onNavigateTab("deals")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warning/5 border border-warning/15 cursor-pointer hover:bg-warning/10 transition-colors">
              <Clock size={14} className="text-warning shrink-0" />
              <span className="text-xs font-medium text-warning">{stalledDeals.length} صفقة متوقفة أكثر من 7 أيام</span>
            </div>
          )}
        </div>
      )}

      {/* ── Export Button ── */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-xl" onClick={() => handleExport("excel")}>
          <Download size={13} /> تصدير Excel
        </Button>
        <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-xl" onClick={() => handleExport("pdf")}>
          <Download size={13} /> تصدير PDF
        </Button>
      </div>

      {/* ── 6 KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "إجمالي المستخدمين", value: profiles.length, icon: Users, growth: userGrowthPct, tab: "users" },
          { label: "إعلانات نشطة", value: publishedListings.length, icon: FileText, tab: "listings" },
          { label: "صفقات جارية", value: activeDeals.length, icon: Activity, tab: "deals" },
          { label: "مكتملة هذا الشهر", value: completedThisMonth.length, icon: Handshake, growth: completedGrowthPct, tab: "deals" },
          { label: "إيرادات محصلة", value: collectedThisMonth, isCurrency: true, icon: Landmark, growth: revenueGrowthPct, tab: "deals" },
          { label: "معدل التحويل", value: conversionRate, suffix: "%", icon: Target, tab: "deals" },
        ].map((card, i) => (
          <div key={i} onClick={() => onNavigateTab(card.tab)} className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 hover:shadow-soft-lg transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground font-medium leading-tight">{card.label}</span>
              <div className="w-7 h-7 rounded-xl bg-muted/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <card.icon size={13} className="text-primary shrink-0" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-xl font-bold tracking-tight">
              {card.isCurrency ? <>{card.value.toLocaleString("en-US")} <SarSymbol size={10} /></> : <>{card.value}{card.suffix || ""}</>}
            </div>
            {card.growth !== undefined && <GrowthBadge pct={card.growth} />}
          </div>
        ))}
      </div>

      {/* ── Charts Row 1: Line charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* User Growth 12m */}
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Users size={14} className="text-primary" strokeWidth={1.5} /></div>
            نمو المستخدمين
            <span className="text-[10px] text-muted-foreground font-normal mr-auto">آخر 12 شهر</span>
          </h3>
          <div className="h-[200px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={25} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, direction: 'rtl' }} formatter={(v: number) => [v, 'مستخدم']} />
                <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue 12m */}
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center"><Landmark size={14} className="text-success" strokeWidth={1.5} /></div>
            الإيرادات الشهرية
            <span className="text-[10px] text-muted-foreground font-normal mr-auto">آخر 12 شهر</span>
          </h3>
          <div className="h-[200px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={35} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, direction: 'rtl' }} formatter={(v: number) => [`${v.toLocaleString('en-US')} ﷼`, 'إيرادات']} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--success))" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Charts Row 2: Daily bars ── */}
      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><BarChart3 size={14} className="text-primary" strokeWidth={1.5} /></div>
          النشاط اليومي
          <span className="text-[10px] text-muted-foreground font-normal mr-auto">آخر 30 يوم</span>
        </h3>
        <div className="h-[220px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={20} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, direction: 'rtl' }}
                formatter={(v: number, name: string) => [v, name === 'listings' ? 'إعلانات' : 'صفقات']} />
              <Bar dataKey="listings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={8} name="listings" />
              <Bar dataKey="deals" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} barSize={8} name="deals" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-5 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /><span className="text-[10px] text-muted-foreground">إعلانات</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-success" /><span className="text-[10px] text-muted-foreground">صفقات</span></div>
        </div>
      </div>

      {/* ── Charts Row 3: Pie charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[
          { title: "توزيع حسب النشاط", icon: Store, data: activityPieData },
          { title: "توزيع حسب المدينة", icon: MapPin, data: cityPieData },
        ].map((chart, idx) => (
          <div key={idx} className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><chart.icon size={14} className="text-primary" strokeWidth={1.5} /></div>
              {chart.title}
            </h3>
            {chart.data.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="h-[180px] w-[180px] shrink-0" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2}>
                        {chart.data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, direction: 'rtl' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {chart.data.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground flex-1 truncate">{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-8">لا توجد بيانات كافية</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Performance Metrics ── */}
      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><TrendingUp size={14} className="text-primary" strokeWidth={1.5} /></div>
          أداء المنصة
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="text-xl font-bold">{avgDealTime}</div>
            <div className="text-[10px] text-muted-foreground">متوسط وقت إتمام الصفقة (يوم)</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="text-xl font-bold">{conversionRate}%</div>
            <div className="text-[10px] text-muted-foreground">معدل التحويل</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="text-xl font-bold text-success">{completedVsCancelled.completed}</div>
            <div className="text-[10px] text-muted-foreground">مكتملة vs <span className="text-destructive">{completedVsCancelled.cancelled}</span> ملغاة</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="text-xl font-bold">{publishedListings.length > 0 ? (deals.length / publishedListings.length).toFixed(1) : 0}</div>
            <div className="text-[10px] text-muted-foreground">متوسط عروض لكل إعلان</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5"><MapPin size={12} className="text-primary" /> أكثر 5 مدن نشاطاً</h4>
            <div className="space-y-1.5">
              {topCities.length > 0 ? topCities.map(([city, count], i) => (
                <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-muted/20">
                  <span className="text-muted-foreground">{city}</span>
                  <span className="font-medium">{count}</span>
                </div>
              )) : <p className="text-[11px] text-muted-foreground">لا توجد بيانات</p>}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5"><Store size={12} className="text-primary" /> أكثر 5 أنشطة طلباً</h4>
            <div className="space-y-1.5">
              {topActivities.length > 0 ? topActivities.map(([act, count], i) => (
                <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-muted/20">
                  <span className="text-muted-foreground">{act}</span>
                  <span className="font-medium">{count}</span>
                </div>
              )) : <p className="text-[11px] text-muted-foreground">لا توجد بيانات</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Activity Table with Tabs ── */}
      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">آخر النشاط</h3>
          <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
            {([
              { id: "listings" as const, label: "إعلانات" },
              { id: "deals" as const, label: "صفقات" },
              { id: "commissions" as const, label: "عمولات" },
              { id: "users" as const, label: "مستخدمين" },
            ]).map(t => (
              <button key={t.id} onClick={() => setActivityTab(t.id)}
                className={cn("px-3 py-1 rounded-md text-[11px] transition-all", activityTab === t.id ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground")}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {activityTab === "listings" && recentListings.map(l => (
            <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all group">
              <div>
                <div className="text-xs font-medium group-hover:text-primary transition-colors">{l.title || "بدون عنوان"}</div>
                <div className="text-[10px] text-muted-foreground">{l.city || "—"} · {new Date(l.created_at).toLocaleDateString("en-GB")}</div>
              </div>
              <Badge variant="outline" className={cn("text-[10px]", l.status === "published" ? "border-success/30 text-success" : "")}>
                {l.status === "published" ? "منشور" : "مسودة"}
              </Badge>
            </Link>
          ))}

          {activityTab === "deals" && recentDeals.map(d => {
            const st = stMap[d.status] || { label: d.status, cls: "bg-muted text-muted-foreground" };
            return (
              <Link key={d.id} to={`/negotiate/${d.id}`} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all group">
                <div>
                  <div className="text-xs font-medium group-hover:text-primary transition-colors">{getProfileName(d.seller_id)} ← {getProfileName(d.buyer_id)}</div>
                  <div className="text-[10px] text-muted-foreground">{d.agreed_price ? <>{Number(d.agreed_price).toLocaleString("en-US")} <SarSymbol size={8} /></> : "—"} · {new Date(d.created_at).toLocaleDateString("en-GB")}</div>
                </div>
                <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
              </Link>
            );
          })}

          {activityTab === "commissions" && recentCommissions.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
              <div>
                <div className="text-xs font-medium">{c.commission_amount.toLocaleString("en-US")} <SarSymbol size={8} /></div>
                <div className="text-[10px] text-muted-foreground">{getProfileName(c.seller_id)} · {new Date(c.created_at).toLocaleDateString("en-GB")}</div>
              </div>
              <Badge variant="outline" className={cn("text-[10px]",
                c.payment_status === "verified" ? "border-success/30 text-success" :
                c.payment_status === "unpaid" ? "border-destructive/30 text-destructive" : "border-warning/30 text-warning"
              )}>
                {c.payment_status === "verified" ? "محصلة" : c.payment_status === "unpaid" ? "غير مدفوعة" : "قيد المراجعة"}
              </Badge>
            </div>
          ))}

          {activityTab === "users" && recentUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
              <div>
                <div className="text-xs font-medium">{u.full_name || "بدون اسم"}</div>
                <div className="text-[10px] text-muted-foreground">{u.email || "—"} · {new Date(u.created_at).toLocaleDateString("en-GB")}</div>
              </div>
              <Badge variant="outline" className={cn("text-[10px]", u.is_verified ? "border-success/30 text-success" : "")}>
                {u.is_verified ? "موثق" : "غير موثق"}
              </Badge>
            </div>
          ))}

          {((activityTab === "listings" && recentListings.length === 0) ||
            (activityTab === "deals" && recentDeals.length === 0) ||
            (activityTab === "commissions" && recentCommissions.length === 0) ||
            (activityTab === "users" && recentUsers.length === 0)) && (
            <p className="text-center text-xs text-muted-foreground py-8">لا توجد بيانات</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerOverviewTab;
