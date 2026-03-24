import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { useCommissions, type Commission, COMMISSION_STATUS_LABELS, COMMISSION_STATUS_COLORS, type CommissionStatus } from "@/hooks/useCommissions";
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
} from "lucide-react";
import SecurityIncidentPanel from "@/components/SecurityIncidentPanel";
import { toast } from "sonner";
import CrmDashboard from "@/components/crm/CrmDashboard";

type Tab = "overview" | "crm" | "deals" | "users" | "listings" | "security" | "settings";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "نظرة عامة", icon: BarChart3 },
  { id: "crm", label: "العملاء المحتملين", icon: Users },
  { id: "deals", label: "الصفقات والعمولات", icon: Handshake },
  { id: "users", label: "المستخدمون", icon: Users },
  { id: "listings", label: "الإعلانات", icon: FileText },
  { id: "security", label: "الأمان", icon: Shield },
  { id: "settings", label: "الإعدادات", icon: Settings },
];

const OwnerDashboardPage = () => {
  const { profile, signOut } = useAuthContext();
  const { getAllListings } = useListings();
  const { getAllDeals } = useDeals();
  const { getAllProfiles, getAllRoles, updateProfile } = useProfiles();
  const { getAllCommissions, verifyCommission } = useCommissions();

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

  const load = useCallback(async () => {
    setLoading(true);
    const [l, d, p, r, c] = await Promise.all([
      getAllListings(), getAllDeals(), getAllProfiles(), getAllRoles(), getAllCommissions(),
    ]);
    setListings(l); setDeals(d); setProfiles(p); setRoles(r); setCommissions(c);
    setLoading(false);
  }, [getAllListings, getAllDeals, getAllProfiles, getAllRoles, getAllCommissions]);

  useEffect(() => { load(); }, [load]);

  const getUserRole = (userId: string) => roles.find((r: any) => r.user_id === userId)?.role || "customer";
  const getProfileName = (userId: string | null) => {
    if (!userId) return "—";
    return profiles.find(p => p.user_id === userId)?.full_name || "—";
  };

  const completedDeals = useMemo(() => deals.filter(d => ["completed", "finalized"].includes(d.status)), [deals]);
  const activeDeals = useMemo(() => deals.filter(d => d.status === "negotiating"), [deals]);
  const totalDealValue = useMemo(() => deals.reduce((s, d) => s + (Number(d.agreed_price) || 0), 0), [deals]);
  const totalCommissionDue = useMemo(() => commissions.reduce((s, c) => s + c.commission_amount, 0), [commissions]);
  const totalCollected = useMemo(() => commissions.filter(c => c.payment_status === "verified").reduce((s, c) => s + c.commission_amount, 0), [commissions]);
  const totalUncollected = totalCommissionDue - totalCollected;

  // Smart Alerts
  const unpaidCompleted = useMemo(() => commissions.filter(c => !["verified", "paid_proof_uploaded"].includes(c.payment_status)), [commissions]);
  const listingsNoPhotos = useMemo(() => listings.filter(l => {
    const photos = l.photos as any;
    if (!photos) return true;
    if (typeof photos === "object" && !Array.isArray(photos)) {
      return Object.values(photos).flat().length === 0;
    }
    return true;
  }), [listings]);

  // Deal table with commission data
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
           <Link to="/monitoring" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted/50 px-3 py-2 rounded-xl">
             <Eye size={13} strokeWidth={1.5} />
             المراقبة المباشرة
           </Link>
         </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs whitespace-nowrap transition-all",
                activeTab === tab.id ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon size={14} strokeWidth={1.3} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===== OVERVIEW ===== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Grid - Row 1: Counts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "إجمالي المستخدمين", value: profiles.length, icon: Users, accent: "text-primary" },
                { label: "الإعلانات", value: listings.length, icon: FileText, accent: "text-primary" },
                { label: "صفقات مكتملة", value: completedDeals.length, icon: Handshake, accent: "text-success" },
                { label: "صفقات جارية", value: activeDeals.length, icon: TrendingUp, accent: "text-primary" },
              ].map((s, i) => (
                <div key={i} className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 hover:shadow-soft-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
                    <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center">
                      <s.icon size={15} className={cn("shrink-0", s.accent)} strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold tracking-tight">{s.value}</div>
                </div>
              ))}
            </div>

            {/* KPI Grid - Row 2: Financial */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "إجمالي قيمة الصفقات", value: `${totalDealValue.toLocaleString("en-US")} ر.س`, icon: BarChart3, accent: "text-primary" },
                { label: "العمولة المستحقة (1%)", value: `${totalCommissionDue.toLocaleString("en-US")} ر.س`, icon: Landmark, accent: "text-primary" },
                { label: "العمولة المحصلة", value: `${totalCollected.toLocaleString("en-US")} ر.س`, icon: ShieldCheck, accent: "text-success" },
                { label: "العمولة غير المحصلة", value: `${totalUncollected.toLocaleString("en-US")} ر.س`, icon: AlertTriangle, accent: totalUncollected > 0 ? "text-warning" : "text-muted-foreground" },
              ].map((s, i) => (
                <div key={i} className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 hover:shadow-soft-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
                    <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center">
                      <s.icon size={15} className={cn("shrink-0", s.accent)} strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="text-lg font-bold tracking-tight">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Two-column layout: Alerts + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Column: Smart Alerts + Quick Stats */}
              <div className="space-y-4">
                {/* Smart Alerts */}
                <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Bell size={14} className="text-warning" strokeWidth={1.5} />
                    </div>
                    تنبيهات ذكية
                  </h3>
                  <div className="space-y-2.5">
                    {unpaidCompleted.length > 0 && (
                      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/10">
                        <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                          <AlertTriangle size={14} className="text-destructive" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-medium text-destructive">{unpaidCompleted.length} صفقة مكتملة لم تُدفع عمولتها</span>
                          <p className="text-[10px] text-destructive/70 mt-0.5">يجب متابعة تحصيل العمولات</p>
                        </div>
                        <button onClick={() => setActiveTab("deals")} className="text-[10px] text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg hover:bg-destructive/20 transition-colors font-medium">عرض</button>
                      </div>
                    )}
                    {listingsNoPhotos.length > 0 && (
                      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/50 border border-border/40">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <ImageOff size={14} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-medium">{listingsNoPhotos.length} إعلان بدون صور أو بيانات ناقصة</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">الإعلانات بالصور تحصل على تفاعل أعلى</p>
                        </div>
                      </div>
                    )}
                    {unpaidCompleted.length === 0 && listingsNoPhotos.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <ShieldCheck size={20} className="mx-auto mb-2 text-success" />
                        <p className="text-xs">لا توجد تنبيهات — كل شيء على ما يرام</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Platform Performance Summary */}
                <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BarChart3 size={14} className="text-primary" strokeWidth={1.5} />
                    </div>
                    أداء المنصة
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "معدل إكمال الصفقات", value: deals.length > 0 ? Math.round((completedDeals.length / deals.length) * 100) : 0, suffix: "%" },
                      { label: "نسبة تحصيل العمولات", value: totalCommissionDue > 0 ? Math.round((totalCollected / totalCommissionDue) * 100) : 0, suffix: "%" },
                      { label: "المستخدمون النشطون", value: profiles.length > 0 ? Math.round((profiles.filter(p => p.is_active && !p.is_suspended).length / profiles.length) * 100) : 0, suffix: "%" },
                    ].map((stat, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-muted-foreground">{stat.label}</span>
                          <span className="text-xs font-semibold">{stat.value}{stat.suffix}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${Math.min(stat.value, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Recent Listings + Deals */}
              <div className="space-y-4">
                {/* Recent Listings */}
                <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText size={14} className="text-primary" strokeWidth={1.5} />
                      </div>
                      آخر الإعلانات
                    </h3>
                    <button onClick={() => setActiveTab("listings")} className="text-[10px] text-primary hover:underline">عرض الكل</button>
                  </div>
                  <div className="space-y-2">
                    {listings.slice(0, 5).map(l => (
                      <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <FileText size={14} className="text-muted-foreground" strokeWidth={1.3} />
                          </div>
                          <div>
                            <div className="text-xs font-medium group-hover:text-primary transition-colors">{l.title || "بدون عنوان"}</div>
                            <div className="text-[10px] text-muted-foreground">{l.city || "—"} {l.price ? `• ${Number(l.price).toLocaleString()} ر.س` : ""}</div>
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

                {/* Recent Deals */}
                <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
                        <Handshake size={14} className="text-success" strokeWidth={1.5} />
                      </div>
                      آخر الصفقات
                    </h3>
                    <button onClick={() => setActiveTab("deals")} className="text-[10px] text-primary hover:underline">عرض الكل</button>
                  </div>
                  <div className="space-y-2">
                    {deals.slice(0, 5).map(d => {
                      const listing = listings.find(l => l.id === d.listing_id);
                      const statusMap: Record<string, { label: string; cls: string }> = {
                        negotiating: { label: "قيد التفاوض", cls: "bg-warning/10 text-warning" },
                        completed: { label: "مكتملة", cls: "bg-success/10 text-success" },
                        finalized: { label: "نهائية", cls: "bg-primary/10 text-primary" },
                        cancelled: { label: "ملغاة", cls: "bg-destructive/10 text-destructive" },
                      };
                      const st = statusMap[d.status] || { label: d.status, cls: "bg-muted text-muted-foreground" };
                      return (
                        <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Handshake size={14} className="text-muted-foreground" strokeWidth={1.3} />
                            </div>
                            <div>
                              <div className="text-xs font-medium">{listing?.title || "بدون عنوان"}</div>
                              <div className="text-[10px] text-muted-foreground">{d.agreed_price ? `${Number(d.agreed_price).toLocaleString()} ر.س` : "—"} • {new Date(d.created_at).toLocaleDateString("ar-SA")}</div>
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
            </div>
          </div>
        )}

        {/* ===== DEALS & COMMISSIONS TABLE ===== */}
        {activeTab === "deals" && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم أو المشروع..."
                  className="pr-9 text-sm rounded-xl"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
                  {([
                    { id: "all" as const, label: "الكل" },
                    { id: "paid" as const, label: "مدفوعة" },
                    { id: "unpaid" as const, label: "غير مدفوعة" },
                  ]).map(f => (
                    <button key={f.id} onClick={() => setDealFilter(f.id)}
                      className={cn("px-3 py-1 rounded-md text-[11px] transition-all", dealFilter === f.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setDealSort(s => s === "date" ? "value" : "date")}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowUpDown size={12} /> {dealSort === "date" ? "التاريخ" : "القيمة"}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-right text-[11px]">المشروع</TableHead>
                    <TableHead className="text-right text-[11px]">البائع</TableHead>
                    <TableHead className="text-right text-[11px]">المشتري</TableHead>
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
                      <TableRow key={row.id}>
                        <TableCell className="text-xs font-medium">{row.listingTitle}</TableCell>
                        <TableCell className="text-xs">{row.sellerName}</TableCell>
                        <TableCell className="text-xs">{row.buyerName}</TableCell>
                        <TableCell className="text-xs">{Number(row.agreed_price || 0).toLocaleString("en-US")} ر.س</TableCell>
                        <TableCell className="text-xs">{row.commissionAmount.toLocaleString("en-US")} ر.س</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px]", COMMISSION_STATUS_COLORS[s] || "")}>
                            {COMMISSION_STATUS_LABELS[s] || "غير مدفوعة"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground"><TableCell className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString("en-US")}</TableCell></TableCell>
                        <TableCell>
                          {row.commission && s !== "verified" && (s === "paid_unverified" || s === "paid_proof_uploaded") && (
                            <Button size="sm" variant="ghost" onClick={() => handleVerify(row.commission!.id)} className="h-7 text-[10px] gap-1">
                              <ShieldCheck size={12} /> تحقق
                            </Button>
                          )}
                          {row.commission && s === "verified" && (
                            <span className="text-[10px] text-primary">✓ تم</span>
                          )}
                          {!row.commission && ["completed", "finalized"].includes(row.status) && (
                            <span className="text-[10px] text-muted-foreground">بانتظار</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {dealTableData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-12">
                        لا توجد صفقات
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">{dealTableData.length} صفقة</p>
          </div>
        )}

        {/* ===== USERS ===== */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{profiles.length} مستخدم • {profiles.filter(p => p.is_active && !p.is_suspended).length} نشط</div>
              <div className="relative w-64">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="pr-9 text-sm rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              {filteredProfiles.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">{p.full_name?.charAt(0) || "?"}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{p.full_name || "—"}</span>
                        <TrustBadge score={p.trust_score} verificationLevel={p.verification_level} size="sm" />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.phone || "—"} • {getUserRole(p.user_id) === "platform_owner" ? "مالك" : getUserRole(p.user_id) === "supervisor" ? "مشرف" : "عميل"} • {p.city || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`#`} className="text-[10px] text-muted-foreground hover:text-foreground"><Eye size={13} /></Link>
                    <button onClick={() => toggleSuspend(p)}
                      className={cn("text-[10px] px-2 py-0.5 rounded-md transition-colors",
                        p.is_suspended ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive")}>
                      {p.is_suspended ? "معلّق" : "تعليق"}
                    </button>
                  </div>
                </div>
              ))}
              {filteredProfiles.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">لا يوجد مستخدمون</p>}
            </div>
          </div>
        )}

        {/* ===== LISTINGS ===== */}
        {activeTab === "listings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{listings.length} إعلان • {listings.filter(l => l.status === "published").length} منشور</div>
              <div className="relative w-64">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="pr-9 text-sm rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              {listings.filter(l => !searchQuery || l.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(l => (
                <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card hover:shadow-soft transition-all">
                  <div className="flex-1">
                    <div className="text-sm">{l.title || "بدون عنوان"}</div>
                    <div className="text-[11px] text-muted-foreground">{l.city} • {l.business_activity || "—"} • {l.price ? `${Number(l.price).toLocaleString()} ر.س` : "—"}</div>
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

        {/* ===== CRM ===== */}
        {activeTab === "crm" && <CrmDashboard />}

        {/* ===== SECURITY ===== */}
        {activeTab === "security" && <SecurityIncidentPanel />}

        {/* ===== SETTINGS ===== */}
        {activeTab === "settings" && (
          <div className="space-y-2">
            {[
              { label: "إعدادات المنصة", desc: "الإعدادات العامة للمنصة" },
              { label: "حسابات السوشل ميديا", desc: "تعديل روابط الحسابات الرسمية" },
              { label: "إدارة الذكاء الاصطناعي", desc: "إعدادات مقبل والنماذج" },
              { label: "إدارة الشكاوى والتواصل", desc: "رسائل التواصل والدعم" },
              { label: "إعدادات الأمان", desc: "سياسات الحماية والصلاحيات" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card hover:shadow-soft transition-all cursor-pointer">
                <div>
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                </div>
                <ChevronLeft size={14} className="text-muted-foreground" strokeWidth={1.3} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboardPage;
