import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  FileText, Loader2, CheckCircle, Clock,
  DollarSign, Eye, Phone, UserCheck, Shield, Bell,
  Wallet, TrendingUp, ArrowLeft, Mail, Activity,
  MessageSquare, AlertTriangle, Handshake, Store,
  Receipt, BadgeCheck, ChevronDown, ExternalLink,
  Landmark, CalendarDays, Hash, ArrowUpDown, Flag, ShieldAlert
} from "lucide-react";
import SarSymbol from "@/components/SarSymbol";
import TrustBadge, { getSellerBadges } from "@/components/TrustBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_COLORS,
  type Commission,
  type CommissionStatus,
} from "@/hooks/useCommissions";

type Listing = any;
type Deal = any;
type DealHistoryEntry = {
  id: string;
  deal_id: string;
  action: string;
  actor_id: string | null;
  details: any;
  created_at: string;
};
type NegMessage = {
  id: string;
  deal_id: string;
  sender_id: string;
  message: string;
  message_type: string;
  created_at: string;
  sender_type: string;
};
type ListingReport = {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};
type MessageReport = {
  id: string;
  deal_id: string;
  message_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};

const reportReasonLabels: Record<string, string> = {
  fraud: "احتيال",
  threats: "تهديد",
  inappropriate: "محتوى غير لائق",
  off_platform: "محاولة تواصل خارج المنصة",
  spam: "رسائل مزعجة",
  misleading: "معلومات مضللة",
  other: "أخرى",
};

const reportStatusLabels: Record<string, { label: string; cls: string }> = {
  pending: { label: "بانتظار المراجعة", cls: "bg-warning/15 text-warning" },
  reviewed: { label: "تمت المراجعة", cls: "bg-success/15 text-success" },
  dismissed: { label: "مرفوض", cls: "bg-muted text-muted-foreground" },
  resolved: { label: "تم الحل", cls: "bg-success/15 text-success" },
};

const statusBadge = (s: string) => {
  const m: Record<string, { label: string; cls: string }> = {
    draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
    published: { label: "منشور", cls: "bg-success/15 text-success" },
    under_review: { label: "مراجعة", cls: "bg-warning/15 text-warning" },
    negotiating: { label: "تفاوض", cls: "bg-primary/15 text-primary" },
    completed: { label: "مكتمل", cls: "bg-success/15 text-success" },
    finalized: { label: "مكتمل", cls: "bg-success/15 text-success" },
    cancelled: { label: "ملغية", cls: "bg-destructive/15 text-destructive" },
  };
  return m[s] || { label: s, cls: "bg-muted text-muted-foreground" };
};

const commStatusBadge = (s: CommissionStatus) => ({
  label: COMMISSION_STATUS_LABELS[s] || s,
  cls: COMMISSION_STATUS_COLORS[s] || "text-muted-foreground",
});

const fmtCurrency = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString("en-US");

const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return "—";
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+966")) cleaned = "0" + cleaned.slice(4);
  else if (cleaned.startsWith("00966")) cleaned = "0" + cleaned.slice(5);
  else if (cleaned.startsWith("966") && cleaned.length > 9) cleaned = "0" + cleaned.slice(3);
  if (!cleaned.startsWith("0") && cleaned.length === 9) cleaned = "0" + cleaned;
  return cleaned || "—";
};

const dealActionLabels: Record<string, string> = {
  deal_updated: "تحديث الصفقة",
  deal_locked: "قفل الصفقة",
  deal_finalized: "إتمام الصفقة",
  status_change: "تغيير الحالة",
  price_change: "تغيير السعر",
  deal_created: "إنشاء الصفقة",
};

const ViewCustomerPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { role } = useAuthContext();
  const { getProfile } = useProfiles();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [dealHistory, setDealHistory] = useState<DealHistoryEntry[]>([]);
  const [messages, setMessages] = useState<NegMessage[]>([]);
  const [listingReports, setListingReports] = useState<ListingReport[]>([]);
  const [messageReports, setMessageReports] = useState<MessageReport[]>([]);
  const [reporterProfiles, setReporterProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "deals" | "commissions" | "listings" | "history" | "chats" | "reports">("overview");
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [expandedCommission, setExpandedCommission] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [p, { data: l }, { data: d }] = await Promise.all([
        getProfile(userId),
        supabase.from("listings").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
        supabase.from("deals").select("*").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("created_at", { ascending: false }),
      ]);
      setProfile(p);
      setListings(l || []);
      setDeals(d || []);

      const listingIds = (l || []).map((li: Listing) => li.id);
      const dealIds = (d || []).map((deal: Deal) => deal.id);

      // Fetch listing reports
      const rByUser = await supabase.from("listing_reports").select("*").eq("reporter_id", userId).order("created_at", { ascending: false });
      const rAgainst = listingIds.length > 0
        ? await supabase.from("listing_reports").select("*").in("listing_id", listingIds).order("created_at", { ascending: false })
        : { data: [] };

      // Fetch message reports
      const mrByUser = await supabase.from("message_reports").select("*").eq("reporter_id", userId).order("created_at", { ascending: false });
      const mrInDeals = dealIds.length > 0
        ? await supabase.from("message_reports").select("*").in("deal_id", dealIds).order("created_at", { ascending: false })
        : { data: [] };

      // Deduplicate listing reports
      const allListingReports = [...(rByUser.data || []), ...(rAgainst.data || [])];
      const uniqueLR = Array.from(new Map(allListingReports.map((r: any) => [r.id, r])).values()) as ListingReport[];
      setListingReports(uniqueLR);

      // Deduplicate message reports
      const allMsgReports = [...(mrByUser.data || []), ...(mrInDeals.data || [])];
      const uniqueMR = Array.from(new Map(allMsgReports.map((r: any) => [r.id, r])).values()) as MessageReport[];
      setMessageReports(uniqueMR);

      // Main data
      if (dealIds.length > 0) {
        const [{ data: msgs }, { data: comms }, { data: hist }] = await Promise.all([
          supabase.from("negotiation_messages").select("*").in("deal_id", dealIds).order("created_at", { ascending: true }),
          supabase.from("deal_commissions").select("*").eq("seller_id", userId).order("created_at", { ascending: false }),
          supabase.from("deal_history").select("*").in("deal_id", dealIds).order("created_at", { ascending: false }),
        ]);
        setMessages((msgs || []) as NegMessage[]);
        setCommissions((comms || []) as unknown as Commission[]);
        setDealHistory((hist || []) as DealHistoryEntry[]);
      }

      // Fetch reporter names
      const reporterIds = new Set<string>();
      uniqueLR.forEach(r => { if (r.reporter_id !== userId) reporterIds.add(r.reporter_id); });
      uniqueMR.forEach(r => { if (r.reporter_id !== userId) reporterIds.add(r.reporter_id); });
      if (reporterIds.size > 0) {
        const { data: rProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", Array.from(reporterIds));
        const map: Record<string, string> = {};
        (rProfiles || []).forEach((rp: any) => { map[rp.user_id] = rp.full_name || "مجهول"; });
        setReporterProfiles(map);
      }
    } catch (err) {
      console.error("Failed to load customer data:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, getProfile]);

  useEffect(() => { loadData(); }, [loadData]);

  // === Stats ===
  const stats = useMemo(() => {
    const active = deals.filter((d: Deal) => !["completed", "finalized", "cancelled"].includes(d.status)).length;
    const completed = deals.filter((d: Deal) => ["completed", "finalized"].includes(d.status)).length;
    const cancelled = deals.filter((d: Deal) => d.status === "cancelled").length;
    const totalVal = deals.reduce((s: number, d: Deal) => s + (Number(d.agreed_price) || 0), 0);
    const completedVal = deals
      .filter((d: Deal) => ["completed", "finalized"].includes(d.status))
      .reduce((s: number, d: Deal) => s + (Number(d.agreed_price) || 0), 0);
    return { active, completed, cancelled, totalVal, completedVal };
  }, [deals]);

  const commStats = useMemo(() => {
    const total = commissions.reduce((s, c) => s + (c.commission_amount || 0), 0);
    const verified = commissions.filter(c => c.payment_status === "verified").reduce((s, c) => s + (c.commission_amount || 0), 0);
    const pending = commissions.filter(c => ["paid_unverified", "paid_proof_uploaded"].includes(c.payment_status)).reduce((s, c) => s + (c.commission_amount || 0), 0);
    const unpaid = commissions.filter(c => ["unpaid", "reminder_sent"].includes(c.payment_status)).reduce((s, c) => s + (c.commission_amount || 0), 0);

    const now = new Date();
    const overdue = commissions.filter(c => {
      if (c.payment_status === "verified") return false;
      return (now.getTime() - new Date(c.created_at).getTime()) > 7 * 24 * 60 * 60 * 1000;
    });

    return { total, verified, pending, unpaid, overdueCount: overdue.length, overdueAmount: overdue.reduce((s, c) => s + (c.commission_amount || 0), 0) };
  }, [commissions]);

  const statusPie = useMemo(() => {
    const groups: Record<string, { label: string; color: string }> = {
      active: { label: "نشطة", color: "hsl(var(--primary))" },
      completed: { label: "مكتملة", color: "hsl(var(--success))" },
      cancelled: { label: "ملغية", color: "hsl(var(--destructive))" },
    };
    const counts = {
      active: stats.active,
      completed: stats.completed,
      cancelled: stats.cancelled,
    };
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: groups[k].label, value: v, color: groups[k].color }));
  }, [stats]);

  const commPie = useMemo(() => {
    const items = [
      { name: "تم التحقق", value: commStats.verified, color: "hsl(var(--success))" },
      { name: "بانتظار التحقق", value: commStats.pending, color: "hsl(var(--primary))" },
      { name: "غير مدفوعة", value: commStats.unpaid, color: "hsl(var(--warning))" },
    ];
    return items.filter(i => i.value > 0);
  }, [commStats]);

  // Monthly deal value chart
  const monthlyDeals = useMemo(() => {
    const months: Record<string, { month: string; value: number; count: number }> = {};
    deals.forEach((d: Deal) => {
      const date = new Date(d.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("ar-SA", { month: "short", year: "2-digit" });
      if (!months[key]) months[key] = { month: label, value: 0, count: 0 };
      months[key].value += Number(d.agreed_price) || 0;
      months[key].count += 1;
    });
    return Object.values(months).slice(-6);
  }, [deals]);

  if (role !== "platform_owner") {
    navigate("/unauthorized");
    return null;
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={22} className="animate-spin text-primary" /></div>;
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle size={32} className="text-warning" />
        <p className="text-sm text-muted-foreground">لم يتم العثور على هذا المستخدم</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>العودة للوحة التحكم</Button>
      </div>
    );
  }

  const isPhoneVerified = !!(profile as any)?.phone_verified;

  return (
    <div className="min-h-[80vh] bg-background py-6">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Eye size={18} className="text-primary" />
                معاينة حساب العميل
              </h1>
              <p className="text-xs text-muted-foreground">وضع القراءة فقط — لا يمكن إجراء تعديلات</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1 border-warning/40 text-warning">
            <Eye size={10} /> للقراءة فقط
          </Badge>
        </div>

        {/* Profile Card + Trust + Pie */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {/* Profile */}
          <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl ring-2 ring-background shadow-sm shrink-0 overflow-hidden">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                  : (profile.full_name?.charAt(0) || "؟")}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold truncate block">{profile.full_name || "بدون اسم"}</span>
                <span className={cn(
                  "inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
                  isPhoneVerified ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                )}>
                  {isPhoneVerified
                    ? <><UserCheck size={11} /> موثّق</>
                    : <><Shield size={11} /> غير موثّق</>}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: Mail, label: "البريد الإلكتروني", value: profile.email || "—" },
                { icon: Phone, label: "رقم الجوال", value: formatPhone(profile.phone) },
                { icon: Clock, label: "تاريخ التسجيل", value: profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—" },
                { icon: Activity, label: "آخر دخول", value: profile.last_activity ? new Date(profile.last_activity).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                    <item.icon size={13} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted-foreground mb-0.5">{item.label}</div>
                    <span className="text-xs" dir="ltr">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Score */}
          <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
            <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-4">
              <Shield size={13} className="text-primary" /> مستوى الثقة
            </h3>
            <TrustBadge score={profile.trust_score} verificationLevel={profile.verification_level} size="lg" showScore showBadges badges={getSellerBadges(profile as any)} />
            <div className="mt-4 space-y-2 text-[11px]">
              <div className="flex justify-between text-muted-foreground"><span>صفقات مكتملة</span><span className="font-medium text-foreground">{profile.completed_deals}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>صفقات ملغاة</span><span className="font-medium text-foreground">{profile.cancelled_deals}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>نزاعات</span><span className="font-medium text-foreground">{profile.disputes_count}</span></div>
            </div>
          </div>

          {/* Deal Distribution */}
          <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
            <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-3">
              <Handshake size={13} className="text-success" /> توزيع الصفقات
            </h3>
            {statusPie.length > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                      {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-8">لا توجد صفقات</p>
            )}
            <div className="flex justify-center gap-4 mt-2">
              {statusPie.map((s, i) => (
                <div key={i} className="flex items-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Financial KPIs - Two rows */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: "إجمالي الصفقات", value: deals.length, icon: Hash, accent: "text-primary" },
            { label: "صفقات نشطة", value: stats.active, icon: TrendingUp, accent: "text-primary" },
            { label: "مكتملة", value: stats.completed, icon: CheckCircle, accent: "text-success" },
            { label: "ملغاة", value: stats.cancelled, icon: AlertTriangle, accent: "text-destructive" },
          ].map((kpi, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-soft border border-border/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                <kpi.icon size={14} strokeWidth={1.5} className={kpi.accent} />
              </div>
              <div className="text-xl font-bold tracking-tight">{kpi.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "إجمالي قيمة الصفقات", value: fmtCurrency(stats.totalVal), icon: Wallet, accent: "text-primary", sub: "﷼" },
            { label: "قيمة المكتملة", value: fmtCurrency(stats.completedVal), icon: BadgeCheck, accent: "text-success", sub: "﷼" },
            { label: "عمولات مستحقة", value: fmtCurrency(commStats.total), icon: Landmark, accent: "text-warning", sub: "﷼" },
            { label: "عمولات مسددة", value: fmtCurrency(commStats.verified), icon: Receipt, accent: "text-success", sub: "﷼" },
          ].map((kpi, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-soft border border-border/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                <kpi.icon size={14} strokeWidth={1.5} className={kpi.accent} />
              </div>
              <div className="text-xl font-bold tracking-tight">
                {kpi.value}
                <span className="text-xs font-normal text-muted-foreground mr-1">{kpi.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 mb-5 overflow-x-auto">
          {([
            { id: "overview" as const, label: "نظرة عامة", icon: TrendingUp },
            { id: "deals" as const, label: "الصفقات", icon: Handshake, count: deals.length },
            { id: "commissions" as const, label: "العمولات", icon: Landmark, count: commissions.length },
            { id: "reports" as const, label: "البلاغات", icon: Flag, count: listingReports.length + messageReports.length },
            { id: "listings" as const, label: "الإعلانات", icon: FileText, count: listings.length },
            { id: "history" as const, label: "السجل", icon: CalendarDays, count: dealHistory.length },
            { id: "chats" as const, label: "المحادثات", icon: MessageSquare, count: deals.filter(d => messages.some(m => m.deal_id === d.id)).length },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all flex-1 justify-center min-w-fit",
                activeTab === tab.id ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
              <tab.icon size={13} strokeWidth={1.3} />
              {tab.label}
              {"count" in tab && <span className="text-[10px] text-muted-foreground">({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* === Overview Tab === */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Commission Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-4">
                  <Landmark size={13} className="text-primary" /> ملخص العمولات
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">إجمالي العمولات</span>
                    <span className="font-bold">{commStats.total.toLocaleString("en-US")} <SarSymbol size={10} /></span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-success transition-all" style={{ width: commStats.total > 0 ? `${(commStats.verified / commStats.total) * 100}%` : "0%" }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-muted-foreground">مسددة:</span>
                      <span className="font-medium">{commStats.verified.toLocaleString("en-US")} ﷼</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-muted-foreground">بانتظار التحقق:</span>
                      <span className="font-medium">{commStats.pending.toLocaleString("en-US")} ﷼</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-warning" />
                      <span className="text-muted-foreground">غير مدفوعة:</span>
                      <span className="font-medium">{commStats.unpaid.toLocaleString("en-US")} ﷼</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                      <span className="text-muted-foreground">متأخرة:</span>
                      <span className="font-medium">{commStats.overdueAmount.toLocaleString("en-US")} ﷼ ({commStats.overdueCount})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commission Pie */}
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-3">
                  <Receipt size={13} className="text-primary" /> توزيع العمولات
                </h3>
                {commPie.length > 0 ? (
                  <>
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width={140} height={140}>
                        <PieChart>
                          <Pie data={commPie} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                            {commPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => [`${Number(v).toLocaleString("en-US")} ﷼`, ""]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      {commPie.map((s, i) => (
                        <div key={i} className="flex items-center gap-1 text-[10px]">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-muted-foreground">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-xs text-muted-foreground py-8">لا توجد عمولات</p>
                )}
              </div>
            </div>

            {/* Monthly Deal Value Chart */}
            {monthlyDeals.length > 0 && (
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-4">
                  <TrendingUp size={13} className="text-primary" /> قيمة الصفقات الشهرية
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyDeals}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtCurrency(v)} />
                    <Tooltip
                      formatter={(v: number) => [`${Number(v).toLocaleString("en-US")} ﷼`, "القيمة"]}
                      labelFormatter={(l) => `الشهر: ${l}`}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
              <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-4">
                <Activity size={13} className="text-primary" /> آخر النشاطات
              </h3>
              <div className="space-y-2">
                {dealHistory.slice(0, 8).map(h => (
                  <div key={h.id} className="flex items-start gap-3 py-2 border-b border-border/20 last:border-0">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <ArrowUpDown size={10} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{dealActionLabels[h.action] || h.action}</div>
                      {h.details && typeof h.details === "object" && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {Object.entries(h.details as Record<string, any>).slice(0, 2).map(([key, val]) => {
                            if (typeof val === "object" && val !== null && "old" in val && "new" in val) {
                              return <span key={key} className="block">{key}: {String(val.old)} → {String(val.new)}</span>;
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap" dir="ltr">
                      {new Date(h.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
                {dealHistory.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">لا توجد نشاطات</p>}
                {dealHistory.length > 8 && (
                  <button onClick={() => setActiveTab("history")} className="text-xs text-primary hover:underline w-full text-center pt-2">
                    عرض كل السجل ({dealHistory.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === Deals Tab === */}
        {activeTab === "deals" && (
          <div className="space-y-2">
            {deals.length === 0 && <p className="text-center text-xs text-muted-foreground py-12">لا توجد صفقات لهذا العميل</p>}
            {deals.map((d: Deal) => {
              const st = statusBadge(d.status);
              const isBuyer = d.buyer_id === userId;
              const isExpanded = expandedDeal === d.id;
              const dealComm = commissions.find(c => c.deal_id === d.id);
              const dealMsgs = messages.filter(m => m.deal_id === d.id);

              return (
                <div key={d.id} className="rounded-xl bg-card border border-border/40 overflow-hidden">
                  <button
                    onClick={() => setExpandedDeal(isExpanded ? null : d.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Handshake size={14} className="text-muted-foreground" strokeWidth={1.3} />
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">{isBuyer ? "مشتري" : "بائع"}</Badge>
                          {d.agreed_price ? <>{Number(d.agreed_price).toLocaleString("en-US")} <SarSymbol size={9} /></> : "بدون سعر"}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(d.created_at).toLocaleDateString("en-GB")}
                          {d.deal_type && <> · {d.deal_type}</>}
                          {dealMsgs.length > 0 && <> · {dealMsgs.length} رسالة</>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                      <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/30 p-4 space-y-3 bg-muted/5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                        <div><span className="text-muted-foreground">المعرّف: </span><span className="font-mono text-[10px]">{d.id.slice(0, 8)}...</span></div>
                        <div><span className="text-muted-foreground">النوع: </span>{d.deal_type || "—"}</div>
                        <div><span className="text-muted-foreground">مقفلة: </span>{d.locked ? "نعم ✓" : "لا"}</div>
                        <div><span className="text-muted-foreground">تاريخ الإنشاء: </span>{new Date(d.created_at).toLocaleDateString("en-GB")}</div>
                        {d.completed_at && <div><span className="text-muted-foreground">تاريخ الإتمام: </span>{new Date(d.completed_at).toLocaleDateString("en-GB")}</div>}
                      </div>

                      {/* Commission info for this deal */}
                      {dealComm && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="text-[11px] font-medium mb-2 flex items-center gap-1.5">
                            <Receipt size={12} className="text-primary" /> عمولة هذه الصفقة
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                            <div><span className="text-muted-foreground">المبلغ: </span>{dealComm.commission_amount?.toLocaleString("en-US")} ﷼</div>
                            <div><span className="text-muted-foreground">النسبة: </span>{(dealComm.commission_rate * 100).toFixed(0)}%</div>
                            <div>
                              <span className="text-muted-foreground">الحالة: </span>
                              <span className={commStatusBadge(dealComm.payment_status as CommissionStatus).cls}>
                                {commStatusBadge(dealComm.payment_status as CommissionStatus).label}
                              </span>
                            </div>
                            <div><span className="text-muted-foreground">التذكيرات: </span>{dealComm.reminder_count}</div>
                          </div>
                        </div>
                      )}

                      {/* Link to negotiation */}
                      <div className="flex gap-2">
                        <Link to={`/negotiation/${d.id}`} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                          <ExternalLink size={11} /> فتح صفحة التفاوض
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* === Commissions Tab === */}
        {activeTab === "commissions" && (
          <div className="space-y-2">
            {commissions.length === 0 && <p className="text-center text-xs text-muted-foreground py-12">لا توجد عمولات لهذا العميل</p>}
            {commissions.map(c => {
              const s = c.payment_status as CommissionStatus;
              const isExpanded = expandedCommission === c.id;
              const now = new Date();
              const isOverdue = s !== "verified" && (now.getTime() - new Date(c.created_at).getTime()) > 7 * 24 * 60 * 60 * 1000;

              return (
                <div key={c.id} className={cn("rounded-xl border bg-card overflow-hidden", isOverdue ? "border-destructive/30" : "border-border/40")}>
                  <button
                    onClick={() => setExpandedCommission(isExpanded ? null : c.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", isOverdue ? "bg-destructive/10" : "bg-muted")}>
                        <Landmark size={14} className={isOverdue ? "text-destructive" : "text-muted-foreground"} strokeWidth={1.3} />
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium">
                          {(c.commission_amount || 0).toLocaleString("en-US")} <SarSymbol size={9} />
                          {isOverdue && <Badge variant="outline" className="text-[8px] mr-2 border-destructive/40 text-destructive">متأخرة</Badge>}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          صفقة: {(c.deal_amount || 0).toLocaleString("en-US")} ﷼ · {new Date(c.created_at).toLocaleDateString("en-GB")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-medium", COMMISSION_STATUS_COLORS[s])}>
                        {COMMISSION_STATUS_LABELS[s]}
                      </span>
                      <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/30 p-4 space-y-2 bg-muted/5">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                        <div><span className="text-muted-foreground">قيمة الصفقة: </span>{(c.deal_amount || 0).toLocaleString("en-US")} ﷼</div>
                        <div><span className="text-muted-foreground">نسبة العمولة: </span>{(c.commission_rate * 100).toFixed(0)}%</div>
                        <div><span className="text-muted-foreground">عدد التذكيرات: </span>{c.reminder_count}</div>
                        <div><span className="text-muted-foreground">آخر تذكير: </span>{c.last_reminder_at ? new Date(c.last_reminder_at).toLocaleDateString("en-GB") : "—"}</div>
                        <div><span className="text-muted-foreground">تأكيد الدفع: </span>{c.marked_paid_at ? new Date(c.marked_paid_at).toLocaleDateString("en-GB") : "—"}</div>
                        <div><span className="text-muted-foreground">إيصال: </span>{c.receipt_path ? "✓ مرفق" : "لا يوجد"}</div>
                        {c.paid_at && <div><span className="text-muted-foreground">تاريخ السداد: </span>{new Date(c.paid_at).toLocaleDateString("en-GB")}</div>}
                        {c.notes && <div className="col-span-full"><span className="text-muted-foreground">ملاحظات: </span>{c.notes}</div>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* === Listings Tab === */}
        {activeTab === "listings" && (
          <div className="space-y-2">
            {listings.length === 0 && <p className="text-center text-xs text-muted-foreground py-12">لا توجد إعلانات لهذا العميل</p>}
            {listings.map((l: Listing) => {
              const st = statusBadge(l.status);
              return (
                <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/40 hover:shadow-soft transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Store size={14} className="text-muted-foreground" strokeWidth={1.3} />
                    </div>
                    <div>
                      <div className="text-xs font-medium group-hover:text-primary transition-colors">{l.title || l.business_activity || "بدون عنوان"}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {l.city || "—"}
                        {l.price ? <> · {Number(l.price).toLocaleString("en-US")} <SarSymbol size={8} /></> : ""}
                        {" · "}{new Date(l.created_at).toLocaleDateString("en-GB")}
                      </div>
                    </div>
                  </div>
                  <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* === History Tab === */}
        {activeTab === "history" && (
          <div className="space-y-2">
            {dealHistory.length === 0 && <p className="text-center text-xs text-muted-foreground py-12">لا يوجد سجل</p>}
            {dealHistory.map(h => (
              <div key={h.id} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/40">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowUpDown size={12} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{dealActionLabels[h.action] || h.action}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    صفقة: <span className="font-mono">{h.deal_id.slice(0, 8)}...</span>
                  </div>
                  {h.details && typeof h.details === "object" && (
                    <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                      {Object.entries(h.details as Record<string, any>).map(([key, val]) => {
                        if (typeof val === "object" && val !== null && "old" in val && "new" in val) {
                          return <div key={key}><span className="font-medium">{key}:</span> {String(val.old)} → {String(val.new)}</div>;
                        }
                        if (typeof val === "boolean" || typeof val === "string") {
                          return <div key={key}><span className="font-medium">{key}:</span> {String(val)}</div>;
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap" dir="ltr">
                  {new Date(h.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* === Chats Tab === */}
        {activeTab === "chats" && (
          <div className="space-y-3">
            {deals.filter(d => messages.some(m => m.deal_id === d.id)).length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-12">لا توجد محادثات لهذا العميل</p>
            )}
            {deals
              .filter(d => messages.some(m => m.deal_id === d.id))
              .map((d: Deal) => {
                const dealMsgs = messages.filter(m => m.deal_id === d.id);
                const isExpanded = expandedDeal === d.id;
                const st = statusBadge(d.status);
                const isBuyer = d.buyer_id === userId;
                return (
                  <div key={d.id} className="rounded-xl bg-card border border-border/40 overflow-hidden">
                    <button
                      onClick={() => setExpandedDeal(isExpanded ? null : d.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <MessageSquare size={14} className="text-primary" strokeWidth={1.3} />
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">{isBuyer ? "مشتري" : "بائع"}</Badge>
                            <span>{dealMsgs.length} رسالة</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(d.created_at).toLocaleDateString("en-GB")}
                            {d.deal_type && <> · {d.deal_type}</>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                        <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border/30 max-h-[400px] overflow-y-auto p-3 space-y-2 bg-muted/10">
                        {dealMsgs.map((msg) => {
                          const isCustomer = msg.sender_id === userId;
                          const isSystem = msg.sender_type === "system" || msg.sender_type === "ai";
                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                "max-w-[80%] rounded-xl px-3 py-2 text-xs",
                                isSystem
                                  ? "mx-auto bg-muted/50 text-muted-foreground text-center max-w-full text-[10px]"
                                  : isCustomer
                                    ? "mr-auto bg-primary/10 text-foreground"
                                    : "ml-auto bg-muted text-foreground"
                              )}
                            >
                              {!isSystem && (
                                <div className="text-[9px] text-muted-foreground mb-0.5 font-medium">
                                  {isCustomer ? "العميل" : "الطرف الآخر"}
                                </div>
                              )}
                              <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                              <div className="text-[9px] text-muted-foreground mt-1 text-left" dir="ltr">
                                {new Date(msg.created_at).toLocaleString("en-GB", {
                                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* === Reports Tab === */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 text-center">
                <Flag size={16} className="mx-auto mb-2 text-warning" />
                <div className="text-xl font-bold">{listingReports.length + messageReports.length}</div>
                <div className="text-[10px] text-muted-foreground">إجمالي البلاغات</div>
              </div>
              <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 text-center">
                <FileText size={16} className="mx-auto mb-2 text-primary" />
                <div className="text-xl font-bold">{listingReports.length}</div>
                <div className="text-[10px] text-muted-foreground">بلاغات إعلانات</div>
              </div>
              <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 text-center">
                <MessageSquare size={16} className="mx-auto mb-2 text-primary" />
                <div className="text-xl font-bold">{messageReports.length}</div>
                <div className="text-[10px] text-muted-foreground">بلاغات رسائل</div>
              </div>
              <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 text-center">
                <ShieldAlert size={16} className="mx-auto mb-2 text-destructive" />
                <div className="text-xl font-bold">
                  {[...listingReports, ...messageReports].filter(r => r.status === "pending").length}
                </div>
                <div className="text-[10px] text-muted-foreground">بانتظار المراجعة</div>
              </div>
            </div>

            {/* Listing Reports */}
            {listingReports.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-3">
                  <FileText size={13} className="text-warning" /> بلاغات الإعلانات
                </h3>
                <div className="space-y-2">
                  {listingReports.map(r => {
                    const isReporter = r.reporter_id === userId;
                    const rst = reportStatusLabels[r.status] || reportStatusLabels.pending;
                    return (
                      <div key={r.id} className="rounded-xl bg-card border border-border/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[9px]">
                                {isReporter ? "أبلغ عن إعلان" : "بلاغ ضد إعلانه"}
                              </Badge>
                              <span className={cn("text-[10px] px-2 py-0.5 rounded-lg font-medium", rst.cls)}>
                                {rst.label}
                              </span>
                            </div>
                            <div className="text-xs font-medium mb-1">
                              السبب: {reportReasonLabels[r.reason] || r.reason}
                            </div>
                            {r.details && (
                              <p className="text-[11px] text-muted-foreground">{r.details}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                              <span dir="ltr">{new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                              {!isReporter && (
                                <span>المُبلّغ: {reporterProfiles[r.reporter_id] || "مجهول"}</span>
                              )}
                              <Link to={`/listing/${r.listing_id}`} className="text-primary hover:underline flex items-center gap-0.5">
                                <ExternalLink size={10} /> عرض الإعلان
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Message Reports */}
            {messageReports.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-3">
                  <MessageSquare size={13} className="text-warning" /> بلاغات الرسائل
                </h3>
                <div className="space-y-2">
                  {messageReports.map(r => {
                    const isReporter = r.reporter_id === userId;
                    const rst = reportStatusLabels[r.status] || reportStatusLabels.pending;
                    return (
                      <div key={r.id} className="rounded-xl bg-card border border-border/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[9px]">
                                {isReporter ? "أبلغ عن رسالة" : "بلاغ ضد رسالته"}
                              </Badge>
                              <span className={cn("text-[10px] px-2 py-0.5 rounded-lg font-medium", rst.cls)}>
                                {rst.label}
                              </span>
                            </div>
                            <div className="text-xs font-medium mb-1">
                              السبب: {reportReasonLabels[r.reason] || r.reason}
                            </div>
                            {r.details && (
                              <p className="text-[11px] text-muted-foreground">{r.details}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                              <span dir="ltr">{new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                              {!isReporter && (
                                <span>المُبلّغ: {reporterProfiles[r.reporter_id] || "مجهول"}</span>
                              )}
                              <Link to={`/negotiation/${r.deal_id}`} className="text-primary hover:underline flex items-center gap-0.5">
                                <ExternalLink size={10} /> عرض الصفقة
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {listingReports.length === 0 && messageReports.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-12">لا توجد بلاغات متعلقة بهذا العميل</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewCustomerPage;
