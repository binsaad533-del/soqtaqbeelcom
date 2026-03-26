import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { useSupervisorPermissions, type SupervisorPermissions } from "@/hooks/useSupervisorPermissions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  FileText, MessageSquare, AlertTriangle, CheckCircle, Clock,
  ChevronLeft, Loader2, Eye, Users, Handshake, TrendingUp,
  Search, Bell, Activity, RefreshCw, Shield, UserCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";

type Tab = "overview" | "listings" | "deals" | "users" | "reports";

const ALL_TABS: { id: Tab; label: string; icon: any; perm?: string }[] = [
  { id: "overview", label: "نظرة عامة", icon: Eye },
  { id: "listings", label: "الإعلانات", icon: FileText, perm: "manage_listings" },
  { id: "deals", label: "الصفقات", icon: Handshake, perm: "manage_deals" },
  { id: "users", label: "المستخدمون", icon: Users, perm: "manage_users" },
  { id: "reports", label: "البلاغات", icon: AlertTriangle, perm: "manage_reports" },
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

const SupervisorDashboardPage = () => {
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
    if (!myPerms) return ALL_TABS; // show all while loading
    return ALL_TABS.filter(t => !t.perm || (myPerms as any)[t.perm]);
  }, [myPerms]);

  /* ── Realtime feed ── */
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

  /* ── Realtime subscriptions ── */
  useEffect(() => {
    const ch = supabase.channel("supervisor-dash-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "deals" }, (p) => {
        setFeed(prev => [{ id: crypto.randomUUID(), text: "صفقة جديدة تم إنشاؤها", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }), type: "deal" }, ...prev].slice(0, 8));
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, (p) => {
        const text = p.eventType === "INSERT" ? "إعلان جديد تم إضافته" : "تحديث على إعلان";
        setFeed(prev => [{ id: crypto.randomUUID(), text, time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }), type: "listing" }, ...prev].slice(0, 8));
        loadData();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "negotiation_messages" }, () => {
        setFeed(prev => [{ id: crypto.randomUUID(), text: "رسالة تفاوض جديدة", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }), type: "message" }, ...prev].slice(0, 8));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "security_incidents" }, () => {
        setFeed(prev => [{ id: crypto.randomUUID(), text: "⚠️ حادثة أمنية جديدة", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }), type: "incident" }, ...prev].slice(0, 8));
        toast.warning("تنبيه: حادثة أمنية جديدة");
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  /* ── Derived data ── */
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
            <h1 className="text-xl font-semibold">لوحة المشرف</h1>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main content (2 cols) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Search bar for tabs that need it */}
            {["listings", "deals", "users"].includes(activeTab) && (
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="pr-9 text-sm rounded-xl" />
              </div>
            )}

            {/* Overview */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* Recent listings */}
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

                {/* Recent deals */}
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

            {/* Listings tab */}
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

            {/* Deals tab */}
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

            {/* Users tab */}
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

            {/* Reports tab */}
            {activeTab === "reports" && (
              <div className="bg-card rounded-2xl p-12 shadow-soft border border-border/30 text-center">
                <AlertTriangle size={32} className="mx-auto mb-3 text-muted-foreground/20" strokeWidth={1} />
                <p className="text-sm text-muted-foreground">لا توجد بلاغات حالياً</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">ستظهر هنا أي بلاغات جديدة فور وصولها</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Live activity */}
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

            {/* Stats summary */}
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

            {/* Quick links */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
              <h3 className="text-xs font-semibold mb-3">روابط سريعة</h3>
              <div className="space-y-1.5">
                <button onClick={() => setActiveTab("listings")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors text-xs text-muted-foreground text-right">
                  <FileText size={13} /> مراجعة الإعلانات
                </button>
                <button onClick={() => setActiveTab("deals")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors text-xs text-muted-foreground text-right">
                  <Handshake size={13} /> متابعة الصفقات
                </button>
                <button onClick={() => setActiveTab("users")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors text-xs text-muted-foreground text-right">
                  <Users size={13} /> إدارة المستخدمين
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboardPage;
