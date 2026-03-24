import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useNotifications } from "@/hooks/useNotifications";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import {
  Plus, FileText, MessageSquare, Shield, AlertCircle,
  Eye, CheckCircle, Loader2, Activity,
  ChevronLeft, TrendingUp, Briefcase, Edit3
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { DEAL_TYPE_FIELD_RULES } from "@/lib/dealTypeFieldRules";

/* ── Draft completion calculator ── */
const calcDraftProgress = (listing: Listing): number => {
  const rules = DEAL_TYPE_FIELD_RULES[listing.deal_type] || DEAL_TYPE_FIELD_RULES["full_takeover"];
  if (!rules) return 0;

  const checks: boolean[] = [
    !!listing.title,
    !!listing.business_activity,
    !!listing.city,
    listing.price != null && listing.price > 0,
  ];

  // Check required fields from deal type rules
  rules.requiredFields.forEach(f => {
    if (!["business_activity", "city", "price"].includes(f)) {
      checks.push(!!(listing as any)[f]);
    }
  });

  // Photos check
  const photos = listing.photos as Record<string, string[]> | null;
  const hasPhotos = photos && Object.values(photos).some(arr => Array.isArray(arr) && arr.length > 0);
  checks.push(!!hasPhotos);

  // Documents check
  const docs = listing.documents as any[] | null;
  checks.push(Array.isArray(docs) && docs.length > 0);

  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
};
const statusLabel = (s: string) => {
  const map: Record<string, { label: string; color: string; icon: string }> = {
    draft: { label: "مسودة", color: "bg-muted text-muted-foreground border border-border/50", icon: "✏️" },
    published: { label: "منشور", color: "bg-success/10 text-success border border-success/20", icon: "✅" },
    under_review: { label: "قيد المراجعة", color: "bg-warning/10 text-warning border border-warning/20", icon: "⏳" },
    negotiating: { label: "تفاوض", color: "bg-primary/10 text-primary border border-primary/20", icon: "💬" },
    completed: { label: "مكتمل", color: "bg-accent text-accent-foreground border border-accent", icon: "🎉" },
    rejected: { label: "مرفوض", color: "bg-destructive/10 text-destructive border border-destructive/20", icon: "❌" },
  };
  return map[s] || { label: s, color: "bg-muted text-muted-foreground border border-border/50", icon: "•" };
};

const CustomerDashboardPage = () => {
  const { profile, signOut, user } = useAuthContext();
  const { getMyListings } = useListings();
  const { getMyDeals } = useDeals();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
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
    activeDeals: deals.filter(d => d.status === "negotiating").length,
    completedDeals: deals.filter(d => d.status === "completed").length,
    trustScore: profile?.trust_score ?? 50,
  }), [listings, deals, profile]);

  const drafts = useMemo(() => listings.filter(l => l.status === "draft"), [listings]);
  const publishedListings = useMemo(() => listings.filter(l => l.status !== "draft"), [listings]);

  const recentActivity = useMemo(() => {
    const items: { id: string; type: "listing" | "deal"; title: string; subtitle: string; status: string; date: string; link: string }[] = [];
    publishedListings.forEach(l => items.push({
      id: l.id, type: "listing",
      title: l.title || "بدون عنوان",
      subtitle: [l.city, l.price ? `${Number(l.price).toLocaleString()} ر.س` : ""].filter(Boolean).join(" — "),
      status: l.status, date: l.created_at,
      link: `/listing/${l.id}`,
    }));
    deals.forEach(d => items.push({
      id: d.id, type: "deal",
      title: d.status === "completed" ? `اتفاقية #${d.id.slice(0, 6)}` : `صفقة #${d.id.slice(0, 6)}`,
      subtitle: d.status === "completed" && d.completed_at
        ? new Date(d.completed_at).toLocaleDateString("ar-SA")
        : new Date(d.created_at).toLocaleDateString("ar-SA"),
      status: d.status, date: d.completed_at || d.created_at,
      link: d.status === "completed" ? `/agreement/${d.id}` : `/negotiate/${d.id}`,
    }));
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  }, [publishedListings, deals]);

  const trustColor = stats.trustScore >= 70 ? "text-success" : stats.trustScore >= 40 ? "text-warning" : "text-destructive";
  const trustBg = stats.trustScore >= 70 ? "bg-success/10" : stats.trustScore >= 40 ? "bg-warning/10" : "bg-destructive/10";
  const trustLabel = stats.trustScore >= 70 ? "ممتاز" : stats.trustScore >= 40 ? "جيد" : "يحتاج تحسين";

  return (
    <div className="py-6 md:py-8">
      <div className="container max-w-6xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">مرحباً {profile?.full_name || "بك"} 👋</h1>
            <p className="text-sm text-muted-foreground">نظرة عامة على نشاطك</p>
          </div>
          <div className="flex items-center gap-2">
            <AiStar size={20} />
            <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50 rounded-lg px-3 py-1.5">خروج</button>
          </div>
        </div>

        {/* Error Banner */}
        {loadError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between mb-6 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-destructive shrink-0" />
              <span className="text-sm text-destructive">{loadError}</span>
            </div>
            <button onClick={() => window.location.reload()} className="text-xs text-destructive font-medium hover:underline whitespace-nowrap">إعادة المحاولة</button>
          </div>
        )}

        {/* ── Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ═══ LEFT: Main Content (2/3) ═══ */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Summary Bar ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-4 bg-card border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={14} strokeWidth={1.3} className="text-primary" />
                  <span className="text-xs text-muted-foreground">إعلاناتي</span>
                </div>
                <div className="text-2xl font-semibold">{loading ? "—" : stats.totalListings}</div>
                <div className="text-[10px] text-muted-foreground">{stats.published} منشور · {stats.drafts} مسودة</div>
              </div>
              <div className="rounded-2xl p-4 bg-card border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <Activity size={14} strokeWidth={1.3} className="text-primary" />
                  <span className="text-xs text-muted-foreground">صفقات نشطة</span>
                </div>
                <div className="text-2xl font-semibold">{loading ? "—" : stats.activeDeals}</div>
                <div className="text-[10px] text-muted-foreground">قيد التفاوض</div>
              </div>
              <div className="rounded-2xl p-4 bg-card border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={14} strokeWidth={1.3} className="text-success" />
                  <span className="text-xs text-muted-foreground">مكتملة</span>
                </div>
                <div className="text-2xl font-semibold">{loading ? "—" : stats.completedDeals}</div>
                <div className="text-[10px] text-muted-foreground">صفقة ناجحة</div>
              </div>
            </div>

            {/* ── Drafts Banner (if any) ── */}
            {!loading && drafts.length > 0 && (
              <section className="rounded-2xl border border-warning/20 bg-warning/5 overflow-hidden">
                <div className="flex items-center justify-between p-4 pb-2">
                  <h2 className="text-sm font-medium flex items-center gap-2">
                    <Edit3 size={14} className="text-warning" />
                    مسودات تحتاج إكمال
                    <span className="text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-md">{drafts.length}</span>
                  </h2>
                </div>
                <div className="divide-y divide-warning/10">
                  {drafts.map((d) => {
                    const progress = calcDraftProgress(d);
                    return (
                      <Link key={d.id} to={`/listing/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-warning/10 transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                          <FileText size={14} className="text-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-medium truncate">{d.title || "بدون عنوان"}</div>
                            <span className={cn("text-[10px] font-medium shrink-0 mr-2", progress >= 80 ? "text-success" : progress >= 50 ? "text-warning" : "text-destructive")}>{progress}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-warning/10 overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-500", progress >= 80 ? "bg-success" : progress >= 50 ? "bg-warning" : "bg-destructive")} style={{ width: `${progress}%` }} />
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">{d.city || "لم تحدد المدينة"} {progress < 100 && "· أكمل البيانات للنشر"}</div>
                        </div>
                        <ChevronLeft size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Recent Activity (unified timeline) ── */}
            <section className="rounded-2xl border border-border/30 bg-card overflow-hidden">
              <div className="flex items-center justify-between p-4 pb-3 border-b border-border/20">
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp size={14} className="text-primary" />
                  آخر النشاطات
                </h2>
                <Link to="/marketplace" className="text-[10px] text-primary hover:underline">تصفح السوق</Link>
              </div>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-primary" /></div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Briefcase size={24} className="mx-auto mb-2 text-muted-foreground/20" strokeWidth={1} />
                  <p className="text-xs text-muted-foreground mb-2">لا يوجد نشاط بعد</p>
                  <Link to="/create-listing" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                    <Plus size={12} /> إنشاء إعلان
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {recentActivity.map((item) => {
                    const st = statusLabel(item.status);
                    const isDeal = item.type === "deal";
                    return (
                      <Link key={`${item.type}-${item.id}`} to={item.link} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                          isDeal ? (item.status === "completed" ? "bg-success/10" : "bg-primary/10") : "bg-secondary"
                        )}>
                          {isDeal
                            ? (item.status === "completed" ? <Shield size={13} className="text-success" /> : <MessageSquare size={13} className="text-primary" />)
                            : <FileText size={13} className="text-foreground/60" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.title}</div>
                          <div className="text-[10px] text-muted-foreground">{item.subtitle}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-md", st.color)}>{st.label}</span>
                          <ChevronLeft size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ═══ RIGHT: Sidebar (1/3) ═══ */}
          <div className="space-y-5">

            {/* ── Trust Score Card ── */}
            <div className="rounded-2xl border border-border/30 bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={14} className="text-primary" />
                <h3 className="text-sm font-medium">مستوى الثقة</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-[3px]", trustBg, trustColor,
                  stats.trustScore >= 70 ? "border-success/30" : stats.trustScore >= 40 ? "border-warning/30" : "border-destructive/30"
                )}>
                  {loading ? "—" : stats.trustScore}
                </div>
                <div>
                  <div className={cn("text-sm font-medium", trustColor)}>{trustLabel}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {stats.completedDeals} صفقة مكتملة · {stats.published} إعلان
                  </div>
                </div>
              </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-2">
              <h3 className="text-sm font-medium mb-3">إجراءات سريعة</h3>
              {drafts.length > 0 && (
                <Link to={`/listing/${drafts[0].id}`} className="flex items-center gap-3 p-3 rounded-xl bg-warning/5 hover:bg-warning/10 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
                    <Edit3 size={14} strokeWidth={1.5} className="text-warning" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium">إكمال المسودة</div>
                    <div className="text-[10px] text-muted-foreground truncate">{drafts[0].title || "بدون عنوان"}</div>
                  </div>
                  <ChevronLeft size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )}
              <Link to="/create-listing" className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors group">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                  <Plus size={14} strokeWidth={2} className="text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium">إنشاء إعلان جديد</div>
                  <div className="text-[10px] text-muted-foreground">أضف نشاطك التجاري</div>
                </div>
                <ChevronLeft size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link to="/marketplace" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Eye size={14} strokeWidth={1.5} className="text-foreground/60" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium">تصفح السوق</div>
                  <div className="text-[10px] text-muted-foreground">اكتشف الفرص المتاحة</div>
                </div>
                <ChevronLeft size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>

            {/* ── Notifications ── */}
            {notifications.length > 0 && (
              <div className="rounded-2xl border border-border/30 bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">الإشعارات {unreadCount > 0 && <span className="text-[10px] text-primary mr-1">({unreadCount})</span>}</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] text-primary hover:underline">قراءة الكل</button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {notifications.slice(0, 4).map((n) => (
                    <button key={n.id} onClick={() => markAsRead(n.id)} className={cn("w-full text-right p-2.5 rounded-lg transition-all text-xs", n.is_read ? "bg-transparent" : "bg-primary/[0.03]")}>
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{n.title}</div>
                          {n.body && <div className="text-muted-foreground mt-0.5 text-[10px] truncate">{n.body}</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Contact CTA ── */}
            <Link to="/contact" className="block rounded-2xl border border-border/30 bg-card p-4 hover:border-primary/20 transition-colors group">
              <div className="text-sm font-medium mb-1">تحتاج مساعدة؟</div>
              <div className="text-[10px] text-muted-foreground">تواصل مع فريق الدعم أو استخدم المساعد الذكي</div>
              <span className="text-[10px] text-primary mt-2 inline-block group-hover:underline">تواصل معنا ←</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
