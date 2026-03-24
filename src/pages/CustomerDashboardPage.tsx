import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useNotifications } from "@/hooks/useNotifications";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import {
  Bell, Plus, FileText, MessageSquare, Shield, HelpCircle, AlertCircle,
  ChevronLeft, Eye, CheckCircle, Upload, Loader2, TrendingUp, Star,
  ArrowUpRight, Clock, Sparkles, BarChart3, Activity
} from "lucide-react";

const tabs = [
  { label: "نظرة عامة", icon: BarChart3 },
  { label: "إعلاناتي", icon: FileText },
  { label: "المفاوضات", icon: MessageSquare },
  { label: "الاتفاقيات", icon: Shield },
  { label: "الدعم", icon: HelpCircle },
];

const CustomerDashboardPage = () => {
  const { profile, signOut, user } = useAuthContext();
  const { getMyListings } = useListings();
  const { getMyDeals } = useDeals();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState(0);
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const errors: string[] = [];
      let l: Listing[] = [];
      let d: Deal[] = [];
      try { l = await getMyListings(); } catch { errors.push("الإعلانات"); }
      try { d = await getMyDeals(); } catch { errors.push("الصفقات"); }
      setListings(l);
      setDeals(d);
      if (errors.length > 0) setLoadError(`فشل تحميل: ${errors.join("، ")} — يرجى تحديث الصفحة`);
      setLoading(false);
    };
    load();
  }, [getMyListings, getMyDeals]);

  const stats = useMemo(() => ({
    totalListings: listings.length,
    published: listings.filter(l => l.status === "published").length,
    drafts: listings.filter(l => l.status === "draft").length,
    totalDeals: deals.length,
    activeDeals: deals.filter(d => d.status === "negotiating").length,
    completedDeals: deals.filter(d => d.status === "completed").length,
    trustScore: profile?.trust_score ?? 50,
  }), [listings, deals, profile]);

  const recentActivity = useMemo(() => {
    const items: { id: string; type: string; label: string; date: string; status: string; link: string }[] = [];
    listings.slice(0, 3).forEach(l => items.push({
      id: l.id, type: "listing", label: l.title || "إعلان بدون عنوان",
      date: l.created_at, status: l.status, link: `/listing/${l.id}`
    }));
    deals.slice(0, 3).forEach(d => items.push({
      id: d.id, type: "deal", label: `صفقة #${d.id.slice(0, 8)}`,
      date: d.created_at, status: d.status, link: `/negotiate/${d.id}`
    }));
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [listings, deals]);

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      draft: { label: "مسودة", color: "bg-muted text-muted-foreground" },
      published: { label: "منشور", color: "bg-success/10 text-success" },
      under_review: { label: "قيد المراجعة", color: "bg-warning/10 text-warning" },
      negotiating: { label: "تفاوض", color: "bg-primary/10 text-primary" },
      completed: { label: "مكتمل", color: "bg-success/10 text-success" },
      rejected: { label: "مرفوض", color: "bg-destructive/10 text-destructive" },
    };
    return map[s] || { label: s, color: "bg-muted text-muted-foreground" };
  };

  const trustColor = stats.trustScore >= 70 ? "text-success" : stats.trustScore >= 40 ? "text-warning" : "text-destructive";
  const trustBg = stats.trustScore >= 70 ? "from-success/10 to-success/5" : stats.trustScore >= 40 ? "from-warning/10 to-warning/5" : "from-destructive/10 to-destructive/5";

  return (
    <div className="py-6 md:py-8">
      <div className="container max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium">مرحباً {profile?.full_name || "بك"} 👋</h1>
            <p className="text-sm text-muted-foreground">إليك ملخص حسابك اليوم</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl hover:bg-muted transition-colors" onClick={() => setActiveTab(-1)}>
              <Bell size={18} strokeWidth={1.3} className="text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-medium">
                  {unreadCount}
                </span>
              )}
            </button>
            <AiStar size={20} />
            <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground transition-colors">خروج</button>
          </div>
        </div>

        {/* Error Banner */}
        {loadError && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-destructive shrink-0" />
              <span className="text-sm text-destructive">{loadError}</span>
            </div>
            <button onClick={() => window.location.reload()} className="text-xs text-destructive font-medium hover:underline whitespace-nowrap">إعادة المحاولة</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs whitespace-nowrap transition-all",
                activeTab === i ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon size={14} strokeWidth={1.3} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════ Notifications ══════════ */}
        {activeTab === -1 && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium">الإشعارات</h2>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">تحديد الكل كمقروء</button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">لا توجد إشعارات</div>
            ) : notifications.map((n) => (
              <button key={n.id} onClick={() => markAsRead(n.id)} className={cn("w-full text-right p-3 rounded-xl border transition-all", n.is_read ? "border-border/30 bg-card" : "border-primary/20 bg-primary/[0.03]")}>
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString("en-US")}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ══════════ Tab 0: Overview ══════════ */}
        {activeTab === 0 && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "إعلاناتي", value: stats.totalListings, sub: `${stats.published} منشور`, icon: FileText, gradient: "from-primary/10 to-primary/5" },
                { label: "الصفقات النشطة", value: stats.activeDeals, sub: "قيد التفاوض", icon: Activity, gradient: "from-accent to-accent/50" },
                { label: "المكتملة", value: stats.completedDeals, sub: "صفقة ناجحة", icon: CheckCircle, gradient: "from-success/10 to-success/5" },
                { label: "الإشعارات", value: unreadCount, sub: "غير مقروءة", icon: Bell, gradient: unreadCount > 0 ? "from-destructive/10 to-destructive/5" : "from-muted to-muted/50" },
              ].map((card, i) => (
                <div key={i} className={cn("rounded-2xl p-4 bg-gradient-to-br border border-border/30 transition-all hover:shadow-soft", card.gradient)}>
                  <card.icon size={18} strokeWidth={1.3} className="text-foreground/70 mb-3" />
                  <div className="text-2xl font-semibold">{loading ? "—" : card.value}</div>
                  <div className="text-xs text-foreground/80 font-medium mt-0.5">{card.label}</div>
                  <div className="text-[10px] text-muted-foreground">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Trust Score + Quick Actions */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Trust Score */}
              <div className={cn("rounded-2xl p-5 bg-gradient-to-br border border-border/30 flex flex-col items-center justify-center text-center", trustBg)}>
                <div className="relative w-20 h-20 mb-3">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${stats.trustScore}, 100`}
                      className={cn("transition-all duration-1000", trustColor)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn("text-xl font-bold", trustColor)}>{loading ? "—" : stats.trustScore}</span>
                  </div>
                </div>
                <div className="text-sm font-medium">مستوى الثقة</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {stats.trustScore >= 70 ? "ممتاز — حسابك موثوق" : stats.trustScore >= 40 ? "جيد — يمكنك تحسينه" : "يحتاج تحسين"}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="md:col-span-2 rounded-2xl border border-border/30 bg-card p-5">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" />
                  إجراءات سريعة
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "إنشاء إعلان جديد", icon: Plus, link: "/create-listing", color: "gradient-primary text-primary-foreground" },
                    { label: "تصفح السوق", icon: Eye, link: "/marketplace", color: "bg-secondary text-secondary-foreground" },
                    { label: "مفاوضاتي النشطة", icon: MessageSquare, link: "#", action: () => setActiveTab(2), color: "bg-secondary text-secondary-foreground" },
                    { label: "تواصل مع الدعم", icon: HelpCircle, link: "/contact", color: "bg-secondary text-secondary-foreground" },
                  ].map((action, i) => (
                    action.action ? (
                      <button key={i} onClick={action.action} className={cn("flex items-center gap-2.5 p-3.5 rounded-xl text-xs font-medium transition-all hover:shadow-soft active:scale-[0.98]", action.color)}>
                        <action.icon size={16} strokeWidth={1.5} />
                        {action.label}
                      </button>
                    ) : (
                      <Link key={i} to={action.link} className={cn("flex items-center gap-2.5 p-3.5 rounded-xl text-xs font-medium transition-all hover:shadow-soft active:scale-[0.98]", action.color)}>
                        <action.icon size={16} strokeWidth={1.5} />
                        {action.label}
                      </Link>
                    )
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl border border-border/30 bg-card p-5">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Clock size={14} className="text-primary" />
                آخر النشاطات
              </h3>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary" /></div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity size={28} className="mx-auto mb-2 text-muted-foreground/30" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground">لا توجد نشاطات حتى الآن</p>
                  <Link to="/create-listing" className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary hover:underline">
                    <Plus size={12} /> ابدأ بإنشاء أول إعلان
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((item) => {
                    const st = statusLabel(item.status);
                    return (
                      <Link key={item.id} to={item.link} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.type === "listing" ? "bg-primary/10" : "bg-accent")}>
                            {item.type === "listing" ? <FileText size={14} className="text-primary" /> : <MessageSquare size={14} className="text-accent-foreground" />}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{item.label}</div>
                            <div className="text-[10px] text-muted-foreground">{new Date(item.date).toLocaleDateString("en-US")}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-md", st.color)}>{st.label}</span>
                          <ArrowUpRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════ Tab 1: Listings ══════════ */}
        {activeTab === 1 && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-medium">إعلاناتي</h2>
              <Link to="/create-listing" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus size={14} strokeWidth={1.3} />
                إعلان جديد
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-primary" /></div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={32} className="mx-auto mb-3 text-muted-foreground/50" strokeWidth={1} />
                <p className="text-sm text-muted-foreground mb-3">لم تنشئ أي إعلانات بعد</p>
                <Link to="/create-listing" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-xs">
                  <Plus size={14} /> أنشئ إعلانك الأول
                </Link>
              </div>
            ) : listings.map((listing) => {
              const st = statusLabel(listing.status);
              return (
                <Link key={listing.id} to={`/listing/${listing.id}`} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-all">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{listing.title || "بدون عنوان"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{listing.city && `${listing.city} — `}{listing.price ? `${Number(listing.price).toLocaleString()} ر.س` : "بدون سعر"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-md", st.color)}>{st.label}</span>
                    <ChevronLeft size={14} className="text-muted-foreground" strokeWidth={1.3} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ══════════ Tab 2: Negotiations ══════════ */}
        {activeTab === 2 && (
          <div className="space-y-3 animate-fade-in">
            <h2 className="font-medium mb-2">المفاوضات</h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-primary" /></div>
            ) : deals.filter(d => d.status === "negotiating").length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">لا توجد مفاوضات حالياً</div>
            ) : deals.filter(d => d.status === "negotiating").map((deal) => (
              <Link key={deal.id} to={`/negotiate/${deal.id}`} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-all">
                <div className="flex-1">
                  <div className="text-sm font-medium">صفقة #{deal.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{new Date(deal.created_at).toLocaleDateString("en-US")}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary">نشطة</span>
              </Link>
            ))}
          </div>
        )}

        {/* ══════════ Tab 3: Agreements ══════════ */}
        {activeTab === 3 && (
          <div className="space-y-3 animate-fade-in">
            <h2 className="font-medium mb-2">الاتفاقيات</h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-primary" /></div>
            ) : deals.filter(d => d.status === "completed").length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">لا توجد اتفاقيات مكتملة</div>
            ) : deals.filter(d => d.status === "completed").map((deal) => (
              <Link key={deal.id} to={`/agreement/${deal.id}`} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-all">
                <div className="flex-1">
                  <div className="text-sm font-medium">اتفاقية #{deal.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{deal.completed_at ? new Date(deal.completed_at).toLocaleDateString("en-US") : "—"}</div>
                </div>
                <Shield size={14} className="text-success" strokeWidth={1.3} />
              </Link>
            ))}
          </div>
        )}

        {/* ══════════ Tab 4: Support ══════════ */}
        {activeTab === 4 && (
          <div className="text-center py-12 animate-fade-in">
            <HelpCircle size={32} className="mx-auto mb-3 text-muted-foreground/50" strokeWidth={1} />
            <p className="text-sm text-muted-foreground mb-2">هل تحتاج مساعدة؟</p>
            <p className="text-xs text-muted-foreground mb-4">استخدم المساعد الذكي أو تواصل معنا</p>
            <Link to="/contact" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-xs">
              تواصل معنا
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
