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
  ChevronLeft, Eye, CheckCircle, Loader2, Sparkles, Activity,
  ArrowUpRight, Clock, User, Settings
} from "lucide-react";

const CustomerDashboardPage = () => {
  const { profile, signOut, user } = useAuthContext();
  const { getMyListings } = useListings();
  const { getMyDeals } = useDeals();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dealFilter, setDealFilter] = useState<"all" | "negotiating" | "completed">("all");
  const [showNotifications, setShowNotifications] = useState(false);

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

  const filteredDeals = useMemo(() => {
    if (dealFilter === "all") return deals;
    return deals.filter(d => d.status === dealFilter);
  }, [deals, dealFilter]);

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

  return (
    <div className="py-6 md:py-8">
      <div className="container max-w-4xl space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">مرحباً {profile?.full_name || "بك"} 👋</h1>
            <p className="text-sm text-muted-foreground">لوحة التحكم</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="relative p-2 rounded-xl hover:bg-muted transition-colors"
              onClick={() => setShowNotifications(!showNotifications)}
            >
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
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-destructive shrink-0" />
              <span className="text-sm text-destructive">{loadError}</span>
            </div>
            <button onClick={() => window.location.reload()} className="text-xs text-destructive font-medium hover:underline whitespace-nowrap">إعادة المحاولة</button>
          </div>
        )}

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="rounded-2xl border border-border/50 bg-card p-4 animate-fade-in space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium">الإشعارات</h2>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-[10px] text-primary hover:underline">تحديد الكل كمقروء</button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-center py-6 text-xs text-muted-foreground">لا توجد إشعارات</p>
            ) : notifications.slice(0, 5).map((n) => (
              <button key={n.id} onClick={() => markAsRead(n.id)} className={cn("w-full text-right p-2.5 rounded-lg border transition-all text-xs", n.is_read ? "border-border/30 bg-card" : "border-primary/20 bg-primary/[0.03]")}>
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />}
                  <div className="flex-1">
                    <div className="font-medium">{n.title}</div>
                    {n.body && <div className="text-muted-foreground mt-0.5 text-[10px]">{n.body}</div>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "إعلاناتي", value: stats.totalListings, sub: `${stats.published} منشور`, icon: FileText, gradient: "from-primary/10 to-primary/5" },
            { label: "صفقات نشطة", value: stats.activeDeals, sub: "قيد التفاوض", icon: Activity, gradient: "from-accent to-accent/50" },
            { label: "مكتملة", value: stats.completedDeals, sub: "صفقة ناجحة", icon: CheckCircle, gradient: "from-success/10 to-success/5" },
            { label: "مستوى الثقة", value: loading ? "—" : stats.trustScore, sub: stats.trustScore >= 70 ? "ممتاز" : stats.trustScore >= 40 ? "جيد" : "يحتاج تحسين", icon: Shield, gradient: "from-secondary to-secondary/50" },
          ].map((card, i) => (
            <div key={i} className={cn("rounded-2xl p-4 bg-gradient-to-br border border-border/30 transition-all", card.gradient)}>
              <card.icon size={16} strokeWidth={1.3} className={cn("mb-2", i === 3 ? trustColor : "text-foreground/70")} />
              <div className="text-2xl font-semibold">{loading ? "—" : card.value}</div>
              <div className="text-xs text-foreground/80 font-medium mt-0.5">{card.label}</div>
              <div className="text-[10px] text-muted-foreground">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "إنشاء إعلان", icon: Plus, link: "/create-listing", color: "gradient-primary text-primary-foreground" },
            { label: "تصفح السوق", icon: Eye, link: "/marketplace", color: "bg-secondary text-secondary-foreground" },
            { label: "تواصل معنا", icon: HelpCircle, link: "/contact", color: "bg-secondary text-secondary-foreground" },
            { label: "حسابي", icon: User, link: "/dashboard", color: "bg-secondary text-secondary-foreground" },
          ].map((action, i) => (
            <Link key={i} to={action.link} className={cn("flex items-center gap-2 p-3 rounded-xl text-xs font-medium transition-all hover:shadow-soft active:scale-[0.98] justify-center", action.color)}>
              <action.icon size={15} strokeWidth={1.5} />
              {action.label}
            </Link>
          ))}
        </div>

        {/* ── My Listings (compact) ── */}
        <section className="rounded-2xl border border-border/30 bg-card overflow-hidden">
          <div className="flex items-center justify-between p-4 pb-3">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <FileText size={14} className="text-primary" />
              إعلاناتي
            </h2>
            <Link to="/create-listing" className="flex items-center gap-1 text-[10px] text-primary hover:underline">
              <Plus size={12} /> إعلان جديد
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-primary" /></div>
          ) : listings.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FileText size={24} className="mx-auto mb-2 text-muted-foreground/30" strokeWidth={1} />
              <p className="text-xs text-muted-foreground mb-2">لم تنشئ أي إعلانات بعد</p>
              <Link to="/create-listing" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                <Plus size={10} /> أنشئ إعلانك الأول
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {listings.slice(0, 4).map((listing) => {
                const st = statusLabel(listing.status);
                return (
                  <Link key={listing.id} to={`/listing/${listing.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{listing.title || "بدون عنوان"}</div>
                      <div className="text-[10px] text-muted-foreground">{listing.city && `${listing.city} — `}{listing.price ? `${Number(listing.price).toLocaleString()} ر.س` : ""}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-md", st.color)}>{st.label}</span>
                      <ChevronLeft size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
              {listings.length > 4 && (
                <div className="text-center py-2">
                  <button onClick={() => {}} className="text-[10px] text-primary hover:underline">عرض الكل ({listings.length})</button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── My Deals (unified) ── */}
        <section className="rounded-2xl border border-border/30 bg-card overflow-hidden">
          <div className="flex items-center justify-between p-4 pb-3">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <MessageSquare size={14} className="text-primary" />
              صفقاتي
            </h2>
            <div className="flex gap-1">
              {([
                { key: "all" as const, label: "الكل" },
                { key: "negotiating" as const, label: "نشطة" },
                { key: "completed" as const, label: "مكتملة" },
              ]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setDealFilter(f.key)}
                  className={cn(
                    "text-[10px] px-2.5 py-1 rounded-lg transition-colors",
                    dealFilter === f.key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-primary" /></div>
          ) : filteredDeals.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare size={24} className="mx-auto mb-2 text-muted-foreground/30" strokeWidth={1} />
              <p className="text-xs text-muted-foreground">
                {dealFilter === "all" ? "لا توجد صفقات حتى الآن" : dealFilter === "negotiating" ? "لا توجد مفاوضات نشطة" : "لا توجد صفقات مكتملة"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {filteredDeals.map((deal) => {
                const st = statusLabel(deal.status);
                const isCompleted = deal.status === "completed";
                return (
                  <Link
                    key={deal.id}
                    to={isCompleted ? `/agreement/${deal.id}` : `/negotiate/${deal.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isCompleted ? "bg-success/10" : "bg-primary/10")}>
                        {isCompleted ? <Shield size={14} className="text-success" /> : <MessageSquare size={14} className="text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {isCompleted ? `اتفاقية #${deal.id.slice(0, 8)}` : `صفقة #${deal.id.slice(0, 8)}`}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {isCompleted && deal.completed_at
                            ? new Date(deal.completed_at).toLocaleDateString("en-US")
                            : new Date(deal.created_at).toLocaleDateString("en-US")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-md", st.color)}>{st.label}</span>
                      <ArrowUpRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Help CTA ── */}
        <div className="rounded-2xl border border-border/30 bg-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">هل تحتاج مساعدة؟</div>
              <div className="text-[10px] text-muted-foreground">استخدم المساعد الذكي أو تواصل معنا</div>
            </div>
          </div>
          <Link to="/contact" className="text-xs text-primary hover:underline">تواصل معنا</Link>
        </div>

      </div>
    </div>
  );
};

export default CustomerDashboardPage;
