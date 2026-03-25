import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import PhoneVerificationFlow from "@/components/PhoneVerificationFlow";
import { cn } from "@/lib/utils";
import {
  Plus, FileText, MessageSquare, AlertCircle,
  CheckCircle, Loader2, Activity, Clock,
  DollarSign, Eye, Camera, Pencil,
  Check, X as XIcon, Phone, UserCheck, Shield, Bell,
  Store, Briefcase, ChevronLeft, Wallet, TrendingUp,
  ArrowUpRight, RefreshCw, Mail, Search
} from "lucide-react";
import { toast } from "sonner";
import { toEnglishNumerals, toDigitsOnly } from "@/lib/arabicNumerals";

/* ── Status helpers ── */
const statusBadge = (s: string) => {
  const m: Record<string, { label: string; cls: string }> = {
    draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
    published: { label: "منشور", cls: "bg-success/15 text-success" },
    under_review: { label: "مراجعة", cls: "bg-warning/15 text-warning" },
    negotiating: { label: "تفاوض", cls: "bg-primary/15 text-primary" },
    completed: { label: "مكتمل", cls: "bg-success/15 text-success" },
    finalized: { label: "مكتمل", cls: "bg-success/15 text-success" },
    new: { label: "جديدة", cls: "bg-muted text-muted-foreground" },
    agreement: { label: "اتفاقية", cls: "bg-accent text-accent-foreground" },
    cancelled: { label: "ملغية", cls: "bg-destructive/15 text-destructive" },
  };
  return m[s] || { label: s, cls: "bg-muted text-muted-foreground" };
};

const fmtCurrency = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString("en-US");

const CustomerDashboardPage = () => {
  const { profile, user } = useAuthContext();
  const { getMyListings } = useListings();
  const { getMyDeals } = useDeals();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"deals" | "listings">("deals");

  const [searchQuery, setSearchQuery] = useState("");
  const [dealStatusFilter, setDealStatusFilter] = useState<string>("all");
  const [listingStatusFilter, setListingStatusFilter] = useState<string>("all");
  /* ── Profile editing ── */
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const userEmail = user?.email || null;
  const hasRealEmail = !!(userEmail && !userEmail.endsWith("@phone.souqtaqbeel.app"));
  const isPhoneVerified = !!(profile as any)?.phone_verified;

  const startEdit = (field: string, val: string) => { setEditingField(field); setEditValue(val || ""); };
  const cancelEdit = () => { setEditingField(null); setEditValue(""); };

  const saveField = useCallback(async (field: string, value: string) => {
    if (!profile?.user_id) return;
    setSaving(true);
    try {
      if (field === "email") {
        const { error } = await supabase.auth.updateUser({ email: value });
        if (error) throw error;
        toast.success("تم إرسال رابط التحقق إلى بريدك الجديد");
      } else {
        const { error } = await supabase.from("profiles").update({ [field]: field === "phone" ? toDigitsOnly(value) : value }).eq("user_id", profile.user_id);
        if (error) throw error;
        toast.success("تم التحديث");
      }
    } catch (err: any) { toast.error(err?.message || "فشل التحديث"); }
    finally { setSaving(false); cancelEdit(); }
  }, [profile?.user_id]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.user_id) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("الحد الأقصى 5 ميغا"); return; }
    setSaving(true);
    try {
      const path = `avatars/${profile.user_id}.${file.name.split(".").pop()}`;
      await supabase.storage.from("listings").upload(path, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("listings").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", profile.user_id);
      toast.success("تم تحديث الصورة");
    } catch (err: any) { toast.error(err?.message || "فشل الرفع"); }
    finally { setSaving(false); }
  }, [profile?.user_id]);

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const errs: string[] = [];
    let l: Listing[] = [], d: Deal[] = [];
    try { l = await getMyListings(); } catch { errs.push("الإعلانات"); }
    try { d = await getMyDeals(); } catch { errs.push("الصفقات"); }
    setListings(l); setDeals(d);
    if (errs.length) setLoadError(`فشل تحميل: ${errs.join("، ")}`);
    setLoading(false);
  }, [getMyListings, getMyDeals]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Realtime sync ── */
  const [feed, setFeed] = useState<{ id: string; text: string; time: string }[]>([]);
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("customer-dash-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, (p) => {
        const d = p.new as any;
        if (d?.buyer_id === user.id || d?.seller_id === user.id) {
          setFeed(prev => [{ id: crypto.randomUUID(), text: p.eventType === "INSERT" ? "صفقة جديدة" : "تحديث صفقة", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 6));
          loadData();
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "negotiation_messages" }, (p) => {
        const msg = p.new as any;
        setFeed(prev => [{ id: crypto.randomUUID(), text: "رسالة تفاوض جديدة", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 6));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, (p) => {
        const l = p.new as any;
        if (l?.owner_id === user.id) {
          setFeed(prev => [{ id: crypto.randomUUID(), text: p.eventType === "INSERT" ? "إعلان جديد" : "تحديث إعلان", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 6));
          loadData();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadData]);

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const active = deals.filter(d => !["completed", "finalized", "cancelled"].includes(d.status)).length;
    const waiting = deals.filter(d => ["under_review", "review"].includes(d.status)).length;
    const completed = deals.filter(d => ["completed", "finalized"].includes(d.status)).length;
    const totalVal = deals.reduce((s, d) => s + (Number(d.agreed_price) || 0), 0);
    return { active, waiting, completed, totalVal, commission: totalVal * 0.01 };
  }, [deals]);

  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    return Math.round(([profile.full_name, profile.phone, profile.avatar_url, hasRealEmail, isPhoneVerified].filter(Boolean).length / 5) * 100);
  }, [profile, hasRealEmail, isPhoneVerified]);

  const dealLink = (d: Deal) => ["completed", "finalized"].includes(d.status) ? `/agreement/${d.id}` : `/negotiate/${d.id}`;

  /* ── Filtered data ── */
  const filteredDeals = useMemo(() => {
    let result = deals;
    if (dealStatusFilter !== "all") {
      if (dealStatusFilter === "active") result = result.filter(d => ["negotiating", "new"].includes(d.status));
      else if (dealStatusFilter === "waiting") result = result.filter(d => ["under_review", "review", "agreement"].includes(d.status));
      else if (dealStatusFilter === "completed") result = result.filter(d => ["completed", "finalized"].includes(d.status));
      else if (dealStatusFilter === "cancelled") result = result.filter(d => d.status === "cancelled");
      else result = result.filter(d => d.status === dealStatusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(d => d.id.toLowerCase().includes(q) || String(d.agreed_price || "").includes(q) || (d.deal_type || "").toLowerCase().includes(q));
    }
    return result;
  }, [deals, dealStatusFilter, searchQuery]);

  const filteredListings = useMemo(() => {
    let result = listings;
    if (listingStatusFilter !== "all") result = result.filter(l => l.status === listingStatusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(l => (l.title || "").toLowerCase().includes(q) || (l.city || "").toLowerCase().includes(q) || (l.business_activity || "").toLowerCase().includes(q));
    }
    return result;
  }, [listings, listingStatusFilter, searchQuery]);

  const monthlyChart = useMemo(() => {
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const now = new Date();
    const data: { name: string; total: number; completed: number; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const inMonth = deals.filter(deal => { const c = new Date(deal.created_at); return c.getMonth() === m && c.getFullYear() === y; });
      const comp = inMonth.filter(deal => ["completed", "finalized"].includes(deal.status));
      data.push({ name: months[m], total: inMonth.length, completed: comp.length, value: inMonth.reduce((s, deal) => s + (Number(deal.agreed_price) || 0), 0) });
    }
    return data;
  }, [deals]);

  /* ── Pie chart data ── */
  const statusPie = useMemo(() => {
    const groups: Record<string, { label: string; color: string }> = {
      active: { label: "نشطة", color: "hsl(var(--primary))" },
      waiting: { label: "بانتظار", color: "hsl(var(--warning))" },
      completed: { label: "مكتملة", color: "hsl(var(--success))" },
      cancelled: { label: "ملغية", color: "hsl(var(--destructive))" },
    };
    const counts = {
      active: deals.filter(d => ["negotiating", "new"].includes(d.status)).length,
      waiting: deals.filter(d => ["under_review", "review", "agreement"].includes(d.status)).length,
      completed: deals.filter(d => ["completed", "finalized"].includes(d.status)).length,
      cancelled: deals.filter(d => d.status === "cancelled").length,
    };
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: groups[k].label, value: v, color: groups[k].color }));
  }, [deals]);

  /* ── Smart suggestions ── */
  const suggestions = useMemo(() => {
    const s: { text: string; link: string; icon: any; priority: "high" | "medium" }[] = [];
    if (profileCompleteness < 100) s.push({ text: "أكمل ملفك الشخصي لزيادة الثقة", link: "#profile", icon: UserCheck, priority: "high" });
    if (deals.some(d => d.status === "negotiating")) s.push({ text: "لديك صفقات بانتظار ردك", link: "#", icon: MessageSquare, priority: "high" });
    if (listings.length === 0) s.push({ text: "أنشئ أول إعلان لك", link: "/create-listing", icon: Plus, priority: "medium" });
    if (listings.some(l => l.status === "draft")) s.push({ text: "لديك إعلانات مسودة - انشرها", link: "#", icon: FileText, priority: "medium" });
    return s.slice(0, 3);
  }, [profileCompleteness, deals, listings]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={22} className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-[80vh] bg-background py-6">
      <div className="container max-w-6xl">

        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">مرحباً {profile?.full_name || "بك"}</h1>
            <p className="text-sm text-muted-foreground">لوحة التحكم الشخصية</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
              <RefreshCw size={13} className="text-muted-foreground" />
            </button>
            <Link to="/create-listing" className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors">
              <Plus size={13} /> إعلان جديد
            </Link>
          </div>
        </div>

        {loadError && (
          <div className="p-3 rounded-xl bg-destructive/10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><AlertCircle size={14} className="text-destructive" /><span className="text-xs text-destructive">{loadError}</span></div>
            <button onClick={loadData} className="text-xs text-destructive hover:underline">إعادة المحاولة</button>
          </div>
        )}

        {/* ═══ KPI ROW ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "صفقات نشطة", value: stats.active, icon: TrendingUp, accent: "text-primary" },
            { label: "بانتظار الرد", value: stats.waiting, icon: Clock, accent: "text-warning" },
            { label: "مكتملة", value: stats.completed, icon: CheckCircle, accent: "text-success" },
            { label: "إجمالي القيمة", value: fmtCurrency(stats.totalVal), icon: Wallet, accent: "text-primary", sub: "ر.س" },
            { label: "العمولة (1%)", value: fmtCurrency(stats.commission), icon: DollarSign, accent: "text-muted-foreground", sub: "ر.س" },
          ].map((kpi, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-200 animate-reveal" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-muted-foreground">{kpi.label}</span>
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", `${kpi.accent}/10`)}>
                  <kpi.icon size={14} strokeWidth={1.5} className={kpi.accent} />
                </div>
              </div>
              <div className="text-xl font-bold tracking-tight">
                {kpi.value}
                {"sub" in kpi && <span className="text-xs font-normal text-muted-foreground mr-1">{kpi.sub}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* ═══ MONTHLY CHART ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 animate-reveal" style={{ animationDelay: '320ms' }}>
            <h3 className="text-xs font-medium text-muted-foreground mb-4">الصفقات الشهرية</h3>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, direction: 'rtl' }} />
                  <Area type="monotone" dataKey="total" name="إجمالي" stroke="hsl(var(--primary))" fill="url(#fillTotal)" strokeWidth={2} />
                  <Area type="monotone" dataKey="completed" name="مكتملة" stroke="hsl(var(--success))" fill="url(#fillCompleted)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 animate-reveal" style={{ animationDelay: '380ms' }}>
            <h3 className="text-xs font-medium text-muted-foreground mb-4">قيمة الصفقات الشهرية (ر.س)</h3>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChart} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, direction: 'rtl' }} formatter={(v: number) => [v.toLocaleString('en-US') + ' ر.س', 'القيمة']} />
                  <Area type="monotone" dataKey="value" name="القيمة" stroke="hsl(var(--warning))" fill="url(#fillValue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          </div>
          {/* Pie Chart */}
          <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 animate-reveal" style={{ animationDelay: '440ms' }}>
            <h3 className="text-xs font-medium text-muted-foreground mb-4">توزيع حالات الصفقات</h3>
            <div className="h-[160px] flex items-center justify-center">
              {statusPie.length === 0 ? (
                <p className="text-xs text-muted-foreground">لا توجد صفقات</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3} strokeWidth={0}>
                      {statusPie.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, direction: 'rtl' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {statusPie.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] text-muted-foreground">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </div>

        {/* ═══ SMART SUGGESTIONS ═══ */}
        {suggestions.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 animate-reveal" style={{ animationDelay: '350ms' }}>
            {suggestions.map((s, i) => (
              <Link key={i} to={s.link} className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs whitespace-nowrap transition-all shrink-0",
                s.priority === "high" ? "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}>
                <s.icon size={13} strokeWidth={1.5} />
                {s.text}
                <ArrowUpRight size={11} className="opacity-50" />
              </Link>
            ))}
          </div>
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-reveal" style={{ animationDelay: '420ms' }}>

          {/* ── Right: Sidebar (1 col) — rendered first for RTL ── */}
          <div className="space-y-4 lg:order-none order-last">

            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
                {[
                  { id: "deals" as const, label: "صفقاتي", icon: Briefcase, count: deals.length },
                  { id: "listings" as const, label: "إعلاناتي", icon: Store, count: listings.length },
                ].map(tab => (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }} className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all",
                    activeTab === tab.id ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                  )}>
                    <tab.icon size={13} strokeWidth={1.3} />
                    {tab.label}
                    <span className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-md">{tab.count}</span>
                  </button>
                ))}
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={activeTab === "deals" ? "ابحث في الصفقات..." : "ابحث في الإعلانات..."}
                  className="w-full bg-muted/40 border-0 rounded-lg py-2 pr-9 pl-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Status filter chips */}
            {activeTab === "deals" && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: "all", label: "الكل" },
                  { id: "active", label: "نشطة" },
                  { id: "waiting", label: "بانتظار" },
                  { id: "completed", label: "مكتملة" },
                  { id: "cancelled", label: "ملغية" },
                ].map(f => (
                  <button key={f.id} onClick={() => setDealStatusFilter(f.id)} className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap transition-all",
                    dealStatusFilter === f.id ? "bg-primary/10 text-primary font-medium" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  )}>{f.label}</button>
                ))}
              </div>
            )}
            {activeTab === "listings" && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: "all", label: "الكل" },
                  { id: "draft", label: "مسودة" },
                  { id: "published", label: "منشور" },
                  { id: "under_review", label: "مراجعة" },
                ].map(f => (
                  <button key={f.id} onClick={() => setListingStatusFilter(f.id)} className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap transition-all",
                    listingStatusFilter === f.id ? "bg-primary/10 text-primary font-medium" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  )}>{f.label}</button>
                ))}
              </div>
            )}

            {/* Deals list */}
            {activeTab === "deals" && (
              <div className="space-y-2">
                {filteredDeals.length === 0 ? (
                  <div className="bg-card rounded-2xl p-12 shadow-soft border border-border/30 text-center">
                    <MessageSquare size={32} className="mx-auto mb-3 text-muted-foreground/20" strokeWidth={1} />
                    <p className="text-sm text-muted-foreground mb-2">{deals.length === 0 ? "لا توجد صفقات بعد" : "لا توجد نتائج"}</p>
                    {deals.length === 0 && <Link to="/marketplace" className="text-xs text-primary hover:underline">تصفح السوق وابدأ أول صفقة</Link>}
                  </div>
                ) : (
                  filteredDeals.map(deal => {
                    const st = statusBadge(deal.status);
                    return (
                      <Link key={deal.id} to={dealLink(deal)} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/30 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-200 group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                            <Briefcase size={16} className="text-muted-foreground" strokeWidth={1.3} />
                          </div>
                          <div>
                            <div className="text-sm font-medium group-hover:text-primary transition-colors">صفقة #{deal.id.slice(0, 6)}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {deal.agreed_price ? `${Number(deal.agreed_price).toLocaleString("en-US")} ر.س` : "بدون سعر"}
                              {" · "}
                              {new Date(deal.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                          <ChevronLeft size={14} className="text-muted-foreground/40" />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}

            {/* Listings list */}
            {activeTab === "listings" && (
              <div className="space-y-2">
                {filteredListings.length === 0 ? (
                  <div className="bg-card rounded-2xl p-12 shadow-soft border border-border/30 text-center">
                    <Store size={32} className="mx-auto mb-3 text-muted-foreground/20" strokeWidth={1} />
                    <p className="text-sm text-muted-foreground mb-2">{listings.length === 0 ? "لا توجد إعلانات" : "لا توجد نتائج"}</p>
                    {listings.length === 0 && <Link to="/create-listing" className="text-xs text-primary hover:underline">أنشئ أول إعلان</Link>}
                  </div>
                ) : (
                  filteredListings.map(listing => {
                    const st = statusBadge(listing.status);
                    return (
                      <Link key={listing.id} to={`/listing/${listing.id}`} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/30 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-200 group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                            <Store size={16} className="text-muted-foreground" strokeWidth={1.3} />
                          </div>
                          <div>
                            <div className="text-sm font-medium group-hover:text-primary transition-colors">{listing.title || "بدون عنوان"}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {listing.city || "—"}
                              {listing.price ? ` · ${Number(listing.price).toLocaleString("en-US")} ر.س` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                          <ChevronLeft size={14} className="text-muted-foreground/40" />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ── Main content area (2 cols) ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Profile card */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
              <div className="flex items-center gap-3 mb-4">
                <label className="relative w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base cursor-pointer group overflow-hidden ring-2 ring-background shadow-sm shrink-0">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    : (profile?.full_name?.charAt(0) || "؟")}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera size={14} className="text-white" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={saving} />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{profile?.full_name || "مستخدم"}</div>
                  <span className={cn("text-[10px] flex items-center gap-1", isPhoneVerified ? "text-success" : "text-warning")}>
                    {isPhoneVerified ? <><UserCheck size={10} /> موثّق</> : <><Shield size={10} /> غير موثّق</>}
                  </span>
                </div>
                <div className="relative w-11 h-11 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" className="stroke-muted" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15" fill="none" className="stroke-primary" strokeWidth="2.5" strokeDasharray={`${profileCompleteness} ${100 - profileCompleteness}`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">{profileCompleteness}%</span>
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-2.5 text-[11px]">
                {/* Email */}
                <div className="flex items-center justify-between gap-2">
                  <Mail size={11} className="text-muted-foreground shrink-0" />
                  {editingField === "email" ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input type="email" dir="ltr" className="bg-muted/50 rounded-lg px-2 py-1 w-full border border-border/50 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                      <button onClick={() => saveField("email", editValue)} disabled={saving} className="text-success"><Check size={12} /></button>
                      <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit("email", hasRealEmail ? (userEmail || "") : "")} className="text-muted-foreground hover:text-primary truncate flex items-center gap-1" dir="ltr">
                      {hasRealEmail ? <span className="truncate max-w-[140px]">{userEmail}</span> : <span className="text-warning">إضافة بريد</span>}
                      <Pencil size={9} className="shrink-0 opacity-40" />
                    </button>
                  )}
                </div>
                {/* Phone */}
                <div className="flex items-center justify-between gap-2">
                  <Phone size={11} className="text-muted-foreground shrink-0" />
                  {editingField === "phone" ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input dir="ltr" inputMode="numeric" className="bg-muted/50 rounded-lg px-2 py-1 w-24 border border-border/50 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(toDigitsOnly(e.target.value))} autoFocus />
                      <button onClick={() => saveField("phone", editValue)} disabled={saving} className="text-success"><Check size={12} /></button>
                      <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit("phone", profile?.phone || "")} className="text-muted-foreground hover:text-primary flex items-center gap-1" dir="ltr">
                      {profile?.phone ? toEnglishNumerals(profile.phone) : <span className="text-warning">إضافة جوال</span>}
                      <Pencil size={9} className="shrink-0 opacity-40" />
                    </button>
                  )}
                </div>
              </div>

              {!isPhoneVerified && profile?.phone && (
                <div className="mt-3 pt-3 border-t border-border/20">
                  <PhoneVerificationFlow initialPhone={profile.phone} onVerified={() => window.location.reload()} />
                </div>
              )}
            </div>

            {/* Activity feed */}
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
                  {feed.slice(0, 5).map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-muted-foreground flex-1 truncate">{f.text}</span>
                      <span className="text-[9px] text-muted-foreground/40 shrink-0">{f.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold flex items-center gap-1.5">
                  <Bell size={13} /> الإشعارات
                  {unreadCount > 0 && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                </h3>
                {unreadCount > 0 && <button onClick={markAllAsRead} className="text-[10px] text-primary hover:underline">قراءة الكل</button>}
              </div>
              {notifications.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-4">لا توجد إشعارات</p>
              ) : (
                <div className="space-y-2">
                  {notifications.slice(0, 5).map(n => (
                    <button key={n.id} onClick={() => markAsRead(n.id)} className="w-full text-right flex items-start gap-2 text-[11px] hover:bg-muted/30 p-2 rounded-lg transition-colors">
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className={cn("block truncate", n.is_read ? "text-muted-foreground" : "text-foreground font-medium")}>{n.title}</span>
                        {n.body && <span className="text-[10px] text-muted-foreground truncate block">{n.body}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
              <h3 className="text-xs font-semibold mb-3">إجراءات سريعة</h3>
              <div className="space-y-1.5">
                <Link to="/create-listing" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors text-xs text-primary">
                  <Plus size={13} /> إضافة إعلان جديد
                </Link>
                <Link to="/marketplace" className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors text-xs text-muted-foreground">
                  <Eye size={13} /> تصفح السوق
                </Link>
                <Link to="/contact" className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors text-xs text-muted-foreground">
                  <MessageSquare size={13} /> تواصل مع الدعم
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
