import { useState, useEffect, useMemo, useCallback } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { useCommissions, type Commission, COMMISSION_STATUS_LABELS, COMMISSION_STATUS_COLORS, type CommissionStatus } from "@/hooks/useCommissions";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { registerChannel, unregisterChannel } from "@/lib/performanceConfig";
import TrustBadge from "@/components/TrustBadge";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, FileText, Handshake, Settings, BarChart3, Search,
  Loader2, AlertTriangle, Landmark, ChevronLeft, ShieldCheck,
  ArrowUpDown, ImageOff, Bell, Shield, TrendingUp, Eye,
  Activity, RefreshCw, UserCheck, User
} from "lucide-react";
import OwnerSettingsPanel from "@/components/OwnerSettingsPanel";
import SecurityIncidentPanel from "@/components/SecurityIncidentPanel";
import AccountSettingsPanel from "@/components/AccountSettingsPanel";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";
import CrmDashboard from "@/components/crm/CrmDashboard";
import AiAnalyticsDashboard from "@/components/AiAnalyticsDashboard";
import SupervisorPermissionsDialog from "@/components/SupervisorPermissionsDialog";
import { useSupervisorPermissions, type SupervisorPermissions } from "@/hooks/useSupervisorPermissions";
import MoqbilAuditPanel from "@/components/MoqbilAuditPanel";

type Tab = "overview" | "ai-analytics" | "moqbil-audit" | "crm" | "deals" | "users" | "listings" | "security" | "account" | "settings";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "نظرة عامة", icon: BarChart3 },
  { id: "ai-analytics", label: "ذكاء السوق", icon: TrendingUp },
  { id: "moqbil-audit", label: "سجل مقبل", icon: Activity },
  { id: "crm", label: "العملاء المحتملين", icon: Users },
  { id: "deals", label: "الصفقات والعمولات", icon: Handshake },
  { id: "users", label: "المستخدمون", icon: Users },
  { id: "listings", label: "الإعلانات", icon: FileText },
  { id: "security", label: "الأمان", icon: Shield },
  { id: "account", label: "حسابي", icon: User },
  { id: "settings", label: "إعدادات المنصة", icon: Settings },
];

const OwnerDashboardPage = () => {
  useSEO({ title: "لوحة مالك المنصة", description: "لوحة تحكم مالك المنصة — إدارة شاملة لسوق تقبيل", canonical: "/owner-dashboard" });
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const { getAllListings } = useListings();
  const { getAllDeals } = useDeals();
  const { getAllProfiles, getAllRoles, updateProfile } = useProfiles();
  const { getAllCommissions, verifyCommission } = useCommissions();
  const { getAllPermissions, promoteToSupervisor, demoteToCustomer, upsertPermissions, suspendSupervisor, enableSupervisor } = useSupervisorPermissions();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dealFilter, setDealFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [dealSort, setDealSort] = useState<"date" | "value">("date");
  const [supervisorPerms, setSupervisorPerms] = useState<SupervisorPermissions[]>([]);
  const [permDialogUser, setPermDialogUser] = useState<Profile | null>(null);

  /* ── Realtime feed ── */
  const [feed, setFeed] = useState<{ id: string; text: string; time: string; type: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, d, p, r, c, sp] = await Promise.all([
        getAllListings().catch(() => []),
        getAllDeals().catch(() => []),
        getAllProfiles().catch(() => []),
        getAllRoles().catch(() => []),
        getAllCommissions().catch(() => []),
        getAllPermissions().catch(() => []),
      ]);
      setListings(l || []); setDeals(d || []); setProfiles(p || []); setRoles(r || []); setCommissions(c || []); setSupervisorPerms(sp || []);
    } catch (err) {
      console.error("Owner dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [getAllListings, getAllDeals, getAllProfiles, getAllRoles, getAllCommissions, getAllPermissions]);

  useEffect(() => { load(); }, [load]);

  /* ── Realtime: only security incidents (critical). Others use debounced polling ── */
  useEffect(() => {
    const ch = supabase.channel("owner-dash-critical")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "security_incidents" }, () => {
        setFeed(prev => [{ id: crypto.randomUUID(), text: "⚠️ حادثة أمنية جديدة", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }), type: "incident" }, ...prev].slice(0, 10));
        toast.warning("تنبيه: حادثة أمنية جديدة");
      })
      .subscribe();
    registerChannel();
    return () => { supabase.removeChannel(ch); unregisterChannel(); };
  }, []);

  const getUserRole = (userId: string) => roles.find((r: any) => r.user_id === userId)?.role || "customer";
  const getProfileName = (userId: string | null) => {
    if (!userId) return "—";
    return profiles.find(p => p.user_id === userId)?.full_name || "—";
  };
  /** Normalize phone to 05xxxxxxxx format */
  const formatPhone = (phone: string | null | undefined): string => {
    if (!phone) return "—";
    let cleaned = phone.replace(/[^\d+]/g, "");
    // +966 or 00966 → 0
    if (cleaned.startsWith("+966")) cleaned = "0" + cleaned.slice(4);
    else if (cleaned.startsWith("00966")) cleaned = "0" + cleaned.slice(5);
    else if (cleaned.startsWith("966") && cleaned.length > 9) cleaned = "0" + cleaned.slice(3);
    // Ensure starts with 0
    if (!cleaned.startsWith("0") && cleaned.length === 9) cleaned = "0" + cleaned;
    return cleaned || "—";
  };

  const getProfilePhone = (userId: string | null) => {
    if (!userId) return "—";
    const phone = profiles.find(p => p.user_id === userId)?.phone;
    return formatPhone(phone);
  };
  const getProfileEmail = (userId: string | null) => {
    if (!userId) return "—";
    return profiles.find(p => p.user_id === userId)?.email || "—";
  };

  const completedDeals = useMemo(() => deals.filter(d => ["completed", "finalized"].includes(d.status)), [deals]);
  const activeDeals = useMemo(() => deals.filter(d => d.status === "negotiating"), [deals]);
  const totalDealValue = useMemo(() => deals.reduce((s, d) => s + (Number(d.agreed_price) || 0), 0), [deals]);
  const totalCommissionDue = useMemo(() => commissions.reduce((s, c) => s + c.commission_amount, 0), [commissions]);
  const totalCollected = useMemo(() => commissions.filter(c => c.payment_status === "verified").reduce((s, c) => s + c.commission_amount, 0), [commissions]);
  const totalUncollected = totalCommissionDue - totalCollected;

  const unpaidCompleted = useMemo(() => commissions.filter(c => !["verified", "paid_proof_uploaded"].includes(c.payment_status)), [commissions]);

  /* ── Performance KPIs ── */
  const avgClosureTimeDays = useMemo(() => {
    const closed = deals.filter(d => d.completed_at && ["completed", "finalized"].includes(d.status));
    if (closed.length === 0) return 0;
    const totalMs = closed.reduce((sum, d) => {
      return sum + (new Date(d.completed_at!).getTime() - new Date(d.created_at).getTime());
    }, 0);
    return Math.round(totalMs / closed.length / (1000 * 60 * 60 * 24));
  }, [deals]);

  const completionRate = useMemo(() => {
    if (deals.length === 0) return 0;
    const completed = deals.filter(d => ["completed", "finalized"].includes(d.status)).length;
    return Math.round((completed / deals.length) * 100);
  }, [deals]);

  const avgResponseTimeHours = useMemo(() => {
    // Estimate response rate from deal creation to first status change (completion)
    const responded = deals.filter(d => d.updated_at && d.updated_at !== d.created_at);
    if (responded.length === 0) return 0;
    const totalMs = responded.reduce((sum, d) => {
      return sum + (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime());
    }, 0);
    const hours = totalMs / responded.length / (1000 * 60 * 60);
    return hours < 1 ? Math.round(hours * 60) : Math.round(hours); // minutes if < 1h
  }, [deals]);

  const avgResponseIsMinutes = useMemo(() => {
    const responded = deals.filter(d => d.updated_at && d.updated_at !== d.created_at);
    if (responded.length === 0) return false;
    const totalMs = responded.reduce((sum, d) => sum + (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()), 0);
    return (totalMs / responded.length / (1000 * 60 * 60)) < 1;
  }, [deals]);
  const listingsNoPhotos = useMemo(() => listings.filter(l => {
    const photos = l.photos as any;
    if (!photos) return true;
    if (Array.isArray(photos)) return photos.length === 0;
    if (typeof photos === "object") {
      const allFiles = Object.values(photos).flat();
      return allFiles.length === 0;
    }
    return true;
  }), [listings]);

  const dealTableData = useMemo(() => {
    const listingMap = new Map(listings.map(l => [l.id, l]));
    const commMap = new Map(commissions.map(c => [c.deal_id, c]));

    let rows = deals.map(d => {
      const listing = listingMap.get(d.listing_id);
      const comm = commMap.get(d.id);
      return {
        ...d,
        listingTitle: listing?.title || "بدون عنوان",
        sellerName: getProfileName(d.seller_id),
        buyerName: getProfileName(d.buyer_id),
        commission: comm,
        commissionAmount: comm?.commission_amount || (Number(d.agreed_price) || 0) * 0.01,
        commissionStatus: comm?.payment_status || "unpaid",
      };
    });

    if (dealFilter === "paid") rows = rows.filter(r => r.commissionStatus === "verified");
    if (dealFilter === "unpaid") rows = rows.filter(r => r.commissionStatus !== "verified");
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r => r.listingTitle.toLowerCase().includes(q) || r.sellerName.toLowerCase().includes(q) || r.buyerName.toLowerCase().includes(q));
    }
    rows.sort((a, b) => {
      if (dealSort === "value") return (Number(b.agreed_price) || 0) - (Number(a.agreed_price) || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return rows;
  }, [deals, listings, commissions, profiles, dealFilter, dealSort, searchQuery]);

  const handleVerify = async (commId: string) => {
    const { error } = await verifyCommission(commId);
    if (!error) { toast.success("تم التحقق من العمولة"); load(); }
    else toast.error("فشل التحقق");
  };

  const toggleSuspend = async (p: Profile) => {
    await updateProfile(p.user_id, { is_suspended: !p.is_suspended });
    setProfiles(prev => prev.map(pr => pr.user_id === p.user_id ? { ...pr, is_suspended: !pr.is_suspended } : pr));
  };

  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(p => p.full_name?.toLowerCase().includes(q) || p.phone?.includes(searchQuery));
  }, [profiles, searchQuery]);

  /* ── Monthly chart data ── */
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; deals: number; completed: number; value: number; commission: number; collected: number; uncollected: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      months[key] = { month: monthNames[d.getMonth()], deals: 0, completed: 0, value: 0, commission: 0, collected: 0, uncollected: 0 };
    }
    const commMap = new Map(commissions.map(c => [c.deal_id, c]));
    deals.forEach(d => {
      const date = new Date(d.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].deals++;
        if (['completed', 'finalized'].includes(d.status)) months[key].completed++;
        const price = Number(d.agreed_price) || 0;
        months[key].value += price;
        const comm = commMap.get(d.id);
        const commAmount = comm ? Number(comm.commission_amount) : price * 0.01;
        months[key].commission += commAmount;
        if (comm && comm.payment_status === 'verified') {
          months[key].collected += commAmount;
        } else {
          months[key].uncollected += commAmount;
        }
      }
    });
    return Object.values(months);
  }, [deals, commissions]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={24} className="animate-spin text-primary" /></div>;

  return (
    <div className="py-6">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">لوحة تحكم المنصة</h1>
            <p className="text-sm text-muted-foreground">مرحباً {profile?.full_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
              <RefreshCw size={13} className="text-muted-foreground" />
            </button>
            <Link to="/monitoring" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted/50 px-3 py-2 rounded-xl">
              <Eye size={13} strokeWidth={1.5} /> المراقبة المباشرة
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
              className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs whitespace-nowrap transition-all",
                activeTab === tab.id ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
              <tab.icon size={14} strokeWidth={1.3} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Row 1: Counts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "إجمالي المستخدمين", value: profiles.length, icon: Users, accent: "text-primary", tab: "users" as Tab },
                { label: "الإعلانات", value: listings.length, icon: FileText, accent: "text-primary", tab: "listings" as Tab },
                { label: "صفقات مكتملة", value: completedDeals.length, icon: Handshake, accent: "text-success", tab: "deals" as Tab },
                { label: "صفقات جارية", value: activeDeals.length, icon: TrendingUp, accent: "text-primary", tab: "deals" as Tab },
              ].map((s, i) => (
                <div key={i} onClick={() => { setActiveTab(s.tab); setSearchQuery(""); }} className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 hover:shadow-soft-lg transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-muted-foreground font-medium group-hover:text-primary transition-colors">{s.label}</span>
                    <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <s.icon size={15} className={cn("shrink-0", s.accent)} strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold tracking-tight">{s.value}</div>
                </div>
              ))}
            </div>

            {/* KPI Row 2: Financial */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "إجمالي قيمة الصفقات", value: <>{totalDealValue.toLocaleString("en-US")} <SarSymbol size={12} /></>, icon: BarChart3, accent: "text-primary", action: () => { setActiveTab("deals"); setDealFilter("all"); setSearchQuery(""); } },
                { label: "العمولة المستحقة (1%)", value: <>{totalCommissionDue.toLocaleString("en-US")} <SarSymbol size={12} /></>, icon: Landmark, accent: "text-primary", action: () => { setActiveTab("deals"); setDealFilter("all"); setSearchQuery(""); } },
                { label: "العمولة المحصلة", value: <>{totalCollected.toLocaleString("en-US")} <SarSymbol size={12} /></>, icon: ShieldCheck, accent: "text-success", action: () => { setActiveTab("deals"); setDealFilter("paid"); setSearchQuery(""); } },
                { label: "العمولة غير المحصلة", value: <>{totalUncollected.toLocaleString("en-US")} <SarSymbol size={12} /></>, icon: AlertTriangle, accent: totalUncollected > 0 ? "text-warning" : "text-muted-foreground", action: () => { setActiveTab("deals"); setDealFilter("unpaid"); setSearchQuery(""); } },
              ].map((s, i) => (
                <div key={i} onClick={s.action} className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 hover:shadow-soft-lg transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-muted-foreground font-medium group-hover:text-foreground transition-colors">{s.label}</span>
                    <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center">
                      <s.icon size={15} className={cn("shrink-0", s.accent)} strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="text-lg font-bold tracking-tight">{s.value}</div>
                  <span className="block text-[10px] text-muted-foreground/60 group-hover:text-primary group-hover:underline mt-1 transition-colors">عرض التفاصيل ←</span>
                </div>
              ))}
            </div>

            {/* KPI Row 3: Performance */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-muted-foreground font-medium">متوسط وقت الإغلاق</span>
                  <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center">
                    <Activity size={15} className="text-primary shrink-0" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">{avgClosureTimeDays}</div>
                <span className="text-[10px] text-muted-foreground/60 mt-1">يوم</span>
              </div>

              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-muted-foreground font-medium">معدل الإتمام</span>
                  <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center">
                    <UserCheck size={15} className={cn("shrink-0", completionRate >= 50 ? "text-success" : "text-warning")} strokeWidth={1.5} />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">{completionRate}%</div>
                <div className="w-full bg-muted/50 rounded-full h-1.5 mt-2">
                  <div className={cn("h-1.5 rounded-full transition-all", completionRate >= 50 ? "bg-success" : "bg-warning")} style={{ width: `${completionRate}%` }} />
                </div>
              </div>

              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-muted-foreground font-medium">متوسط وقت الاستجابة</span>
                  <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center">
                    <RefreshCw size={15} className="text-primary shrink-0" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">{avgResponseTimeHours}</div>
                <span className="text-[10px] text-muted-foreground/60 mt-1">{avgResponseIsMinutes ? "دقيقة" : "ساعة"}</span>
              </div>

              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-muted-foreground font-medium">معدل تحصيل العمولات</span>
                  <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center">
                    <ShieldCheck size={15} className={cn("shrink-0", totalCommissionDue > 0 && totalCollected / totalCommissionDue >= 0.5 ? "text-success" : "text-warning")} strokeWidth={1.5} />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">{totalCommissionDue > 0 ? Math.round((totalCollected / totalCommissionDue) * 100) : 0}%</div>
                <div className="w-full bg-muted/50 rounded-full h-1.5 mt-2">
                  <div className={cn("h-1.5 rounded-full transition-all", totalCommissionDue > 0 && totalCollected / totalCommissionDue >= 0.5 ? "bg-success" : "bg-warning")} style={{ width: `${totalCommissionDue > 0 ? Math.round((totalCollected / totalCommissionDue) * 100) : 0}%` }} />
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><TrendingUp size={14} className="text-primary" strokeWidth={1.5} /></div>
                    تطور الصفقات
                  </h3>
                  <span className="text-[10px] text-muted-foreground">آخر 6 أشهر</span>
                </div>
                <div className="h-[200px]" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dealGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, direction: 'rtl' }}
                        formatter={(value: number, name: string) => [value, name === 'deals' ? 'إجمالي الصفقات' : 'مكتملة']} />
                      <Area type="monotone" dataKey="deals" stroke="hsl(var(--primary))" fill="url(#dealGrad)" strokeWidth={2} name="deals" />
                      <Area type="monotone" dataKey="completed" stroke="hsl(var(--success))" fill="url(#completedGrad)" strokeWidth={2} name="completed" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-5 mt-3">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /><span className="text-[10px] text-muted-foreground">إجمالي الصفقات</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-success" /><span className="text-[10px] text-muted-foreground">مكتملة</span></div>
                </div>
              </div>

              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center"><Landmark size={14} className="text-success" strokeWidth={1.5} /></div>
                    العمولات: محصلة مقابل غير محصلة
                  </h3>
                  <span className="text-[10px] text-muted-foreground">آخر 6 أشهر</span>
                </div>
                <div className="h-[200px]" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40}
                        tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, direction: 'rtl' }}
                        formatter={(value: number, name: string) => [`${value.toLocaleString('en-US')} ﷼`, name === 'collected' ? 'محصلة' : 'غير محصلة']} />
                      <Bar dataKey="collected" stackId="comm" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} barSize={28} name="collected" />
                      <Bar dataKey="uncollected" stackId="comm" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} barSize={28} name="uncollected" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-5 mt-3">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-success" /><span className="text-[10px] text-muted-foreground">محصلة</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-warning" /><span className="text-[10px] text-muted-foreground">غير محصلة</span></div>
                </div>
              </div>
            </div>

            {/* Alerts + Activity + Recent */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Alerts */}
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center"><Bell size={14} className="text-warning" strokeWidth={1.5} /></div>
                  تنبيهات ذكية
                </h3>
                <div className="space-y-2.5">
                  {unpaidCompleted.length > 0 && (
                    <div onClick={() => { setActiveTab("deals"); setDealFilter("unpaid"); setSearchQuery(""); }} className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10 cursor-pointer hover:bg-destructive/10 transition-colors group">
                      <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <span className="text-xs font-medium text-destructive">{unpaidCompleted.length} عمولة غير محصلة</span>
                        <span className="block text-[10px] text-destructive/70 group-hover:underline mt-0.5">عرض التفاصيل ←</span>
                      </div>
                      <ChevronLeft size={14} className="text-destructive/50 mt-0.5 shrink-0" />
                    </div>
                  )}
                  {listingsNoPhotos.length > 0 && (
                    <div onClick={() => { setActiveTab("listings"); setSearchQuery(""); }} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors group">
                      <ImageOff size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{listingsNoPhotos.length} إعلان بدون صور مرفقة</span>
                        <span className="block text-[10px] text-muted-foreground/70 group-hover:underline mt-0.5">مراجعة الإعلانات ←</span>
                      </div>
                      <ChevronLeft size={14} className="text-muted-foreground/50 mt-0.5 shrink-0 mr-auto" />
                    </div>
                  )}
                  {unpaidCompleted.length === 0 && listingsNoPhotos.length === 0 && (
                    <div className="text-center py-4">
                      <ShieldCheck size={20} className="mx-auto mb-2 text-success" />
                      <p className="text-xs text-muted-foreground">كل شيء على ما يرام</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Live activity */}
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Activity size={14} className="text-success" /> النشاط المباشر
                  </h3>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /><span className="text-[9px] text-muted-foreground">مباشر</span></span>
                </div>
                {feed.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-4">لا يوجد نشاط حالياً</p>
                ) : (
                  <div className="space-y-2.5">
                    {feed.slice(0, 6).map(f => (
                      <div key={f.id} className="flex items-center gap-2 text-[11px]">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                          f.type === "incident" ? "bg-destructive" : f.type === "deal" ? "bg-success" : f.type === "crm" ? "bg-warning" : "bg-primary"
                        )} />
                        <span className="text-muted-foreground flex-1 truncate">{f.text}</span>
                        <span className="text-[9px] text-muted-foreground/40 shrink-0">{f.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Performance */}
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><BarChart3 size={14} className="text-primary" strokeWidth={1.5} /></div>
                  أداء المنصة
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "معدل إكمال الصفقات", value: deals.length > 0 ? Math.round((completedDeals.length / deals.length) * 100) : 0 },
                    { label: "نسبة تحصيل العمولات", value: totalCommissionDue > 0 ? Math.round((totalCollected / totalCommissionDue) * 100) : 0 },
                    { label: "المستخدمون النشطون", value: profiles.length > 0 ? Math.round((profiles.filter(p => p.is_active && !p.is_suspended).length / profiles.length) * 100) : 0 },
                  ].map((stat, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-muted-foreground">{stat.label}</span>
                        <span className="text-xs font-semibold">{stat.value}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${Math.min(stat.value, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent listings + deals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><FileText size={14} className="text-primary" strokeWidth={1.5} /></div>
                    آخر الإعلانات
                  </h3>
                  <button onClick={() => setActiveTab("listings")} className="text-[10px] text-primary hover:underline">عرض الكل</button>
                </div>
                <div className="space-y-2">
                  {listings.slice(0, 5).map(l => (
                    <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><FileText size={14} className="text-muted-foreground" strokeWidth={1.3} /></div>
                        <div>
                          <div className="text-xs font-medium group-hover:text-primary transition-colors">{l.title || "بدون عنوان"}</div>
                          <div className="text-[10px] text-muted-foreground">{l.city || "—"} {l.price ? <>· {Number(l.price).toLocaleString("en-US")} <SarSymbol size={8} /></> : ""}</div>
                        </div>
                      </div>
                      <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", l.status === "published" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                        {l.status === "published" ? "منشور" : "مسودة"}
                      </span>
                    </Link>
                  ))}
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
                  {deals.slice(0, 5).map(d => {
                    const stMap: Record<string, { label: string; cls: string }> = {
                      negotiating: { label: "قيد التفاوض", cls: "bg-warning/10 text-warning" },
                      completed: { label: "مكتملة", cls: "bg-success/10 text-success" },
                      finalized: { label: "نهائية", cls: "bg-primary/10 text-primary" },
                      cancelled: { label: "ملغاة", cls: "bg-destructive/10 text-destructive" },
                    };
                    const st = stMap[d.status] || { label: d.status, cls: "bg-muted text-muted-foreground" };
                    return (
                      <Link key={d.id} to={`/negotiate/${d.id}`} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><Handshake size={14} className="text-muted-foreground" strokeWidth={1.3} /></div>
                          <div>
                            <div className="text-xs font-medium group-hover:text-primary transition-colors">{getProfileName(d.seller_id)} ← {getProfileName(d.buyer_id)}</div>
                            <div className="text-[10px] text-muted-foreground">{d.agreed_price ? <>{Number(d.agreed_price).toLocaleString("en-US")} <SarSymbol size={8} /></> : "—"} · {new Date(d.created_at).toLocaleDateString("en-GB")}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                          <ChevronLeft size={14} className="text-muted-foreground" strokeWidth={1.3} />
                        </div>
                      </Link>
                    );
                  })}
                  {deals.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">لا توجد صفقات</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ DEALS TABLE ═══ */}
        {activeTab === "deals" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث بالاسم أو المشروع..." className="pr-9 text-sm rounded-xl" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
                  {([{ id: "all" as const, label: "الكل" }, { id: "paid" as const, label: "مدفوعة" }, { id: "unpaid" as const, label: "غير مدفوعة" }]).map(f => (
                    <button key={f.id} onClick={() => setDealFilter(f.id)} className={cn("px-3 py-1 rounded-md text-[11px] transition-all", dealFilter === f.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>{f.label}</button>
                  ))}
                </div>
                <button onClick={() => setDealSort(s => s === "date" ? "value" : "date")} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowUpDown size={12} /> {dealSort === "date" ? "التاريخ" : "القيمة"}
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-right text-[11px]">المشروع</TableHead>
                    <TableHead className="text-right text-[11px]">البائع</TableHead>
                    <TableHead className="text-right text-[11px]">المشتري</TableHead>
                    <TableHead className="text-right text-[11px]">جوال البائع</TableHead>
                    <TableHead className="text-right text-[11px]">جوال المشتري</TableHead>
                    <TableHead className="text-right text-[11px]">إيميل البائع</TableHead>
                    <TableHead className="text-right text-[11px]">إيميل المشتري</TableHead>
                    <TableHead className="text-right text-[11px]">قيمة الصفقة</TableHead>
                    <TableHead className="text-right text-[11px]">العمولة (1%)</TableHead>
                    <TableHead className="text-right text-[11px]">حالة العمولة</TableHead>
                    <TableHead className="text-right text-[11px]">التاريخ</TableHead>
                    <TableHead className="text-right text-[11px]">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealTableData.map(row => {
                    const s = row.commissionStatus as CommissionStatus;
                    return (
                      <TableRow key={row.id} className="cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => navigate(`/negotiate/${row.id}`)}>
                        <TableCell className="text-xs font-medium text-primary hover:underline">{row.listingTitle}</TableCell>
                        <TableCell className="text-xs">{row.sellerName}</TableCell>
                        <TableCell className="text-xs">{row.buyerName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground" dir="ltr">{getProfilePhone(row.seller_id)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground" dir="ltr">{getProfilePhone(row.buyer_id)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground" dir="ltr">{getProfileEmail(row.seller_id)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground" dir="ltr">{getProfileEmail(row.buyer_id)}</TableCell>
                        <TableCell className="text-xs">{Number(row.agreed_price || 0).toLocaleString("en-US")} <SarSymbol size={9} /></TableCell>
                        <TableCell className="text-xs">{row.commissionAmount.toLocaleString("en-US")} <SarSymbol size={9} /></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px]", COMMISSION_STATUS_COLORS[s] || "")}>
                            {COMMISSION_STATUS_LABELS[s] || "غير مدفوعة"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString("en-GB")}</TableCell>
                        <TableCell>
                          {row.commission && s !== "verified" && s === "paid_proof_uploaded" && (
                            <Button size="sm" variant="ghost" onClick={() => handleVerify(row.commission!.id)} className="h-7 text-[10px] gap-1">
                              <ShieldCheck size={12} /> تحقق
                            </Button>
                          )}
                          {row.commission && s === "verified" && <span className="text-[10px] text-success">✓ تم</span>}
                          {!row.commission && ["completed", "finalized"].includes(row.status) && <span className="text-[10px] text-muted-foreground">بانتظار</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {dealTableData.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-12">لا توجد صفقات</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">{dealTableData.length} صفقة</p>
          </div>
        )}

        {/* ═══ USERS ═══ */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{profiles.length} مستخدم · {profiles.filter(p => p.is_active && !p.is_suspended).length} نشط</div>
              <div className="relative w-64">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="pr-9 text-sm rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              {filteredProfiles.map(p => {
                const role = getUserRole(p.user_id);
                const isOwner = role === "platform_owner";
                const isSupervisor = role === "supervisor";
                return (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card hover:shadow-soft transition-all cursor-pointer" onClick={() => !isOwner && navigate(`/dashboard/view-customer/${p.user_id}`)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">{p.full_name?.charAt(0) || "?"}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{p.full_name || "—"}</span>
                        <TrustBadge score={p.trust_score} verificationLevel={p.verification_level} size="sm" />
                        {isSupervisor && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">مشرف</span>}
                        {isOwner && <span className="text-[9px] bg-success/10 text-success px-1.5 py-0.5 rounded font-medium">مالك</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatPhone(p.phone)} · {p.email || "—"} · {p.city || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {!isOwner && (
                      <Link
                        to={`/dashboard/view-customer/${p.user_id}`}
                        className="text-[10px] px-2.5 py-1 rounded-lg transition-colors gap-1 flex items-center text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Eye size={11} />
                        معاينة
                      </Link>
                    )}
                    {!isOwner && (
                      <button
                        onClick={() => setPermDialogUser(p)}
                        className={cn(
                          "text-[10px] px-2.5 py-1 rounded-lg transition-colors gap-1 flex items-center",
                          isSupervisor ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        )}
                      >
                        <Shield size={11} />
                        {isSupervisor ? "صلاحيات" : "ترقية لمشرف"}
                      </button>
                    )}
                    {!isOwner && supervisorPerms.find(sp => sp.user_id === p.user_id) && (
                      <button
                        onClick={async () => {
                          if (isSupervisor) {
                            const { error } = await suspendSupervisor(p.user_id);
                            if (error) toast.error("فشل في تعليق صلاحيات المشرف");
                            else { toast.success("تم تعليق صلاحيات المشرف — الحساب كعميل لا يزال نشطاً"); load(); }
                          } else {
                            const { error } = await enableSupervisor(p.user_id);
                            if (error) toast.error("فشل في تمكين صلاحيات المشرف");
                            else { toast.success("تم تمكين صلاحيات المشرف مجدداً"); load(); }
                          }
                        }}
                        className={cn(
                          "text-[10px] px-2.5 py-1 rounded-lg transition-colors gap-1 flex items-center",
                          isSupervisor
                            ? "text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-400"
                            : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400"
                        )}
                      >
                        <UserCheck size={11} />
                        {isSupervisor ? "تعليق المشرف" : "تمكين المشرف"}
                      </button>
                    )}
                    {!isOwner && (
                      <button onClick={() => toggleSuspend(p)} className={cn("text-[10px] px-2.5 py-1 rounded-lg transition-colors", p.is_suspended ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive")}>
                        {p.is_suspended ? "معلّق" : "تعليق"}
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
              {filteredProfiles.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">لا يوجد مستخدمون</p>}
            </div>

            {permDialogUser && (
              <SupervisorPermissionsDialog
                open={!!permDialogUser}
                onOpenChange={(open) => { if (!open) setPermDialogUser(null); }}
                userName={permDialogUser.full_name || "—"}
                userId={permDialogUser.user_id}
                currentRole={getUserRole(permDialogUser.user_id)}
                existingPermissions={supervisorPerms.find(sp => sp.user_id === permDialogUser.user_id) || null}
                onPromote={async (userId, perms) => {
                  const { error } = await promoteToSupervisor(userId, perms);
                  if (error) toast.error("فشل في ترقية المستخدم");
                  else { toast.success("تم ترقية المستخدم إلى مشرف"); await load(); }
                }}
                onDemote={async (userId) => {
                  const { error } = await demoteToCustomer(userId);
                  if (error) toast.error("فشل في إزالة الصلاحيات");
                  else { toast.success("تم إزالة صلاحيات المشرف"); await load(); }
                }}
                onUpdatePermissions={async (userId, perms) => {
                  const { error } = await upsertPermissions(userId, {
                    manage_listings: perms.manage_listings,
                    manage_deals: perms.manage_deals,
                    manage_users: perms.manage_users,
                    manage_crm: perms.manage_crm,
                    manage_reports: perms.manage_reports,
                    manage_security: perms.manage_security,
                  });
                  if (error) toast.error("فشل في تحديث الصلاحيات");
                  else { toast.success("تم تحديث الصلاحيات"); await load(); }
                }}
              />
            )}
          </div>
        )}

        {/* ═══ LISTINGS ═══ */}
        {activeTab === "listings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{listings.length} إعلان · {listings.filter(l => l.status === "published").length} منشور</div>
              <div className="relative w-64">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="pr-9 text-sm rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              {listings.filter(l => !searchQuery || l.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(l => (
                <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card hover:shadow-soft transition-all">
                  <div className="flex-1">
                    <div className="text-sm">{l.title || "بدون عنوان"}</div>
                    <div className="text-[11px] text-muted-foreground">{l.city} · {l.business_activity || "—"} · {l.price ? <>{Number(l.price).toLocaleString("en-US")} <SarSymbol size={9} /></> : "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-md", l.status === "published" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      {l.status === "published" ? "منشور" : l.status === "archived" ? "مؤرشف" : "مسودة"}
                    </span>
                    <ChevronLeft size={14} className="text-muted-foreground" strokeWidth={1.3} />
                  </div>
                </Link>
              ))}
              {listings.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">لا توجد إعلانات</p>}
            </div>
          </div>
        )}

        {activeTab === "ai-analytics" && <AiAnalyticsDashboard />}
        {activeTab === "moqbil-audit" && <MoqbilAuditPanel />}
        {activeTab === "crm" && <CrmDashboard />}
        {activeTab === "security" && <SecurityIncidentPanel />}
        {activeTab === "account" && <AccountSettingsPanel />}
        {activeTab === "settings" && <OwnerSettingsPanel />}
      </div>
    </div>
  );
};

export default OwnerDashboardPage;
