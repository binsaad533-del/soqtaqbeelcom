import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Plus, FileText, MessageSquare, AlertCircle,
  CheckCircle, Loader2, Activity, ChevronLeft,
  Wallet, Clock, DollarSign, Pause,
  Eye, ArrowRight, Mail, BarChart3
} from "lucide-react";
import { toast } from "sonner";

/* ── Helpers ── */
const STAGE_MAP: Record<string, { label: string; key: string }> = {
  new: { label: "جديدة", key: "new" },
  under_review: { label: "مراجعة", key: "under_review" },
  review: { label: "مراجعة", key: "under_review" },
  negotiating: { label: "تفاوض", key: "negotiating" },
  agreement: { label: "اتفاقية", key: "agreement" },
  locked: { label: "اتفاقية", key: "agreement" },
  completed: { label: "مغلقة", key: "completed" },
  finalized: { label: "مغلقة", key: "completed" },
};

const mapStage = (s: string) => STAGE_MAP[s]?.key || "new";

const statusBadge = (s: string) => {
  const m: Record<string, { label: string; cls: string }> = {
    draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
    published: { label: "منشور", cls: "bg-success/15 text-success" },
    under_review: { label: "مراجعة", cls: "bg-warning/15 text-warning" },
    negotiating: { label: "تفاوض", cls: "bg-primary/15 text-primary" },
    completed: { label: "مكتمل", cls: "bg-success/15 text-success" },
    finalized: { label: "مكتمل", cls: "bg-success/15 text-success" },
    new: { label: "جديدة", cls: "bg-muted text-muted-foreground" },
    agreement: { label: "اتفاقية", cls: "bg-accent/20 text-accent-foreground" },
  };
  return m[s] || { label: s, cls: "bg-muted text-muted-foreground" };
};

const fmtCurrency = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB");

/* ── Component ── */
const CustomerDashboardPage = () => {
  const { profile, user } = useAuthContext();
  const navigate = useNavigate();
  const { getMyListings } = useListings();
  const { getMyDeals } = useDeals();
  const { notifications } = useNotifications();

  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      const errs: string[] = [];
      let l: Listing[] = [], d: Deal[] = [];
      try { l = await getMyListings(); } catch { errs.push("الإعلانات"); }
      try { d = await getMyDeals(); } catch { errs.push("الصفقات"); }
      setListings(l); setDeals(d);
      if (errs.length) setLoadError(`فشل تحميل: ${errs.join("، ")}`);
      setLoading(false);
    })();
  }, [getMyListings, getMyDeals]);

  /* ── Live activity ── */
  const [feed, setFeed] = useState<{ id: string; text: string; time: string }[]>([]);
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("dash-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, (p) => {
        const d = p.new as any;
        if (d?.buyer_id === user.id || d?.seller_id === user.id) {
          setFeed(prev => [{ id: crypto.randomUUID(), text: p.eventType === "INSERT" ? "صفقة جديدة" : "تحديث صفقة", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 5));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "negotiation_messages" }, () => {
        setFeed(prev => [{ id: crypto.randomUUID(), text: "رسالة تفاوض جديدة", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 5));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const active = deals.filter(d => !["completed", "finalized", "cancelled"].includes(d.status)).length;
    const waiting = deals.filter(d => ["under_review", "review"].includes(d.status)).length;
    const completed = deals.filter(d => ["completed", "finalized"].includes(d.status)).length;
    const totalVal = deals.reduce((s, d) => s + (d.agreed_price || 0), 0);
    return { active, waiting, completed, totalVal, commission: totalVal * 0.01 };
  }, [deals]);

  /* ── Pipeline counts ── */
  const pipelineCounts = useMemo(() => {
    const c: Record<string, number> = { new: 0, under_review: 0, negotiating: 0, agreement: 0, completed: 0 };
    deals.forEach(d => { c[mapStage(d.status)]++; });
    return c;
  }, [deals]);

  /* ── Filtered deals for display ── */
  const displayDeals = useMemo(() => {
    let filtered = deals;
    if (pipelineFilter) filtered = deals.filter(d => mapStage(d.status) === pipelineFilter);
    return filtered.slice(0, 8);
  }, [deals, pipelineFilter]);

  const dealLink = (d: Deal) => ["completed", "finalized"].includes(d.status) ? `/agreement/${d.id}` : `/negotiate/${d.id}`;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={22} className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="py-5 md:py-8">
      <div className="container max-w-6xl">

        {loadError && (
          <div className="p-3 rounded-xl bg-destructive/10 flex items-center justify-between mb-5">
            <div className="flex items-center gap-2"><AlertCircle size={14} className="text-destructive" /><span className="text-xs text-destructive">{loadError}</span></div>
            <button onClick={() => window.location.reload()} className="text-xs text-destructive font-medium hover:underline">إعادة المحاولة</button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold">مرحباً{profile?.full_name ? ` ${profile.full_name}` : ""}</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">لوحة التحكم</p>
          </div>
          <Link to="/create-listing" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            <Plus size={13} /> إعلان جديد
          </Link>
        </div>

        {/* ════ 1) KPI CARDS ════ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {([
            { label: "صفقات نشطة", value: stats.active, icon: Activity, accent: "text-primary" },
            { label: "بانتظار الرد", value: stats.waiting, icon: Pause, accent: "text-warning" },
            { label: "مكتملة", value: stats.completed, icon: CheckCircle, accent: "text-success" },
            { label: "إجمالي القيمة", value: `${fmtCurrency(stats.totalVal)}`, icon: Wallet, accent: "text-primary", sub: "ر.س" },
            { label: "عمولة (1%)", value: `${fmtCurrency(stats.commission)}`, icon: DollarSign, accent: "text-muted-foreground", sub: "ر.س" },
          ] as const).map((kpi, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-card shadow-[0_1px_4px_hsl(var(--foreground)/0.04)] flex flex-col items-center justify-center p-3 cursor-pointer hover:shadow-[0_2px_12px_hsl(var(--foreground)/0.07)] transition-shadow">
              <kpi.icon size={18} strokeWidth={1.3} className={cn(kpi.accent, "mb-2")} />
              <span className="text-2xl font-bold leading-none">{kpi.value}</span>
              {(kpi as any).sub && <span className="text-[9px] text-muted-foreground mt-0.5">{(kpi as any).sub}</span>}
              <span className="text-[10px] text-muted-foreground mt-1.5">{kpi.label}</span>
            </div>
          ))}
        </div>

        {/* ════ 2) PIPELINE CARDS ════ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {([
            { key: "new", label: "جديدة", icon: Plus },
            { key: "under_review", label: "مراجعة", icon: Clock },
            { key: "negotiating", label: "تفاوض", icon: MessageSquare },
            { key: "agreement", label: "اتفاقية", icon: FileText },
            { key: "completed", label: "مغلقة", icon: CheckCircle },
          ] as const).map((stage) => (
            <button
              key={stage.key}
              onClick={() => setPipelineFilter(pipelineFilter === stage.key ? null : stage.key)}
              className={cn(
                "aspect-square rounded-2xl flex flex-col items-center justify-center p-3 transition-all",
                pipelineFilter === stage.key
                  ? "bg-primary/10 shadow-[0_0_0_1.5px_hsl(var(--primary)/0.3)]"
                  : "bg-card shadow-[0_1px_4px_hsl(var(--foreground)/0.04)] hover:shadow-[0_2px_12px_hsl(var(--foreground)/0.07)]"
              )}
            >
              <stage.icon size={16} strokeWidth={1.3} className={cn(pipelineFilter === stage.key ? "text-primary" : "text-muted-foreground", "mb-1.5")} />
              <span className="text-2xl font-bold leading-none">{pipelineCounts[stage.key]}</span>
              <span className="text-[10px] text-muted-foreground mt-1.5">{stage.label}</span>
            </button>
          ))}
        </div>

        {/* ════ 3) DEALS GRID + ACTIVITY ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-5">

          {/* Deals Grid (3 cols) */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold flex items-center gap-1.5">
                <BarChart3 size={13} className="text-primary" />
                {pipelineFilter ? `صفقاتي · ${STAGE_MAP[pipelineFilter]?.label || "الكل"}` : "صفقاتي"}
              </h2>
              {pipelineFilter && (
                <button onClick={() => setPipelineFilter(null)} className="text-[10px] text-primary hover:underline">عرض الكل</button>
              )}
            </div>

            {displayDeals.length === 0 ? (
              <div className="rounded-2xl bg-card shadow-[0_1px_4px_hsl(var(--foreground)/0.04)] flex flex-col items-center justify-center py-12">
                <MessageSquare size={22} className="text-muted-foreground/20 mb-2" strokeWidth={1} />
                <p className="text-xs text-muted-foreground mb-1">لا توجد صفقات</p>
                <Link to="/marketplace" className="text-xs text-primary hover:underline">تصفح السوق</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayDeals.map(deal => {
                  const st = statusBadge(deal.status);
                  return (
                    <Link
                      key={deal.id}
                      to={dealLink(deal)}
                      className="aspect-square rounded-2xl bg-card shadow-[0_1px_4px_hsl(var(--foreground)/0.04)] hover:shadow-[0_2px_12px_hsl(var(--foreground)/0.07)] transition-shadow flex flex-col justify-between p-4"
                    >
                      <div>
                        <div className="text-xs font-semibold mb-1">صفقة #{deal.id.slice(0, 6)}</div>
                        <span className={cn("text-[9px] px-2 py-0.5 rounded-md inline-block", st.cls)}>{st.label}</span>
                      </div>
                      <div>
                        {deal.agreed_price && (
                          <div className="text-sm font-bold mb-0.5">{Number(deal.agreed_price).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">ر.س</span></div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground">{fmtDate(deal.updated_at)}</span>
                          <span className="text-[10px] text-primary flex items-center gap-0.5">عرض <ArrowRight size={10} /></span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity (1 col, square) */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-card shadow-[0_1px_4px_hsl(var(--foreground)/0.04)] p-4 aspect-square flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold flex items-center gap-1.5">
                  <Activity size={13} className="text-success" />
                  النشاط
                </h3>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[9px] text-muted-foreground">مباشر</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                {feed.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center">لا يوجد نشاط</p>
                ) : (
                  <div className="space-y-2">
                    {feed.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-[10px] text-muted-foreground flex-1 truncate">{item.text}</span>
                        <span className="text-[8px] text-muted-foreground/50 shrink-0">{item.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ════ 4) LISTINGS + QUICK ACTIONS (Grid) ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">

          {/* Listings (3 cols grid) */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold flex items-center gap-1.5">
                <FileText size={13} className="text-primary" />
                إعلاناتي
              </h2>
              <Link to="/create-listing" className="text-[10px] text-primary hover:underline flex items-center gap-1"><Plus size={10} /> جديد</Link>
            </div>

            {listings.length === 0 ? (
              <div className="rounded-2xl bg-card shadow-[0_1px_4px_hsl(var(--foreground)/0.04)] flex flex-col items-center justify-center py-12">
                <FileText size={22} className="text-muted-foreground/20 mb-2" strokeWidth={1} />
                <p className="text-xs text-muted-foreground mb-1">لا توجد إعلانات</p>
                <Link to="/create-listing" className="text-xs text-primary hover:underline">أنشئ إعلانك الأول</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {listings.slice(0, 6).map(listing => {
                  const st = statusBadge(listing.status);
                  return (
                    <Link
                      key={listing.id}
                      to={`/listing/${listing.id}`}
                      className="aspect-square rounded-2xl bg-card shadow-[0_1px_4px_hsl(var(--foreground)/0.04)] hover:shadow-[0_2px_12px_hsl(var(--foreground)/0.07)] transition-shadow flex flex-col justify-between p-4"
                    >
                      <div>
                        <div className="text-xs font-semibold mb-1 line-clamp-2">{listing.title || "بدون عنوان"}</div>
                        <span className={cn("text-[9px] px-2 py-0.5 rounded-md inline-block", st.cls)}>{st.label}</span>
                      </div>
                      <div>
                        {listing.price && (
                          <div className="text-sm font-bold mb-0.5">{Number(listing.price).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">ر.س</span></div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground">{listing.city || "—"}</span>
                          <span className="text-[10px] text-primary flex items-center gap-0.5">عرض <ArrowRight size={10} /></span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions (1 col, square) */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-card shadow-[0_1px_4px_hsl(var(--foreground)/0.04)] p-4 aspect-square flex flex-col justify-between">
              <h3 className="text-xs font-semibold mb-3">إجراءات</h3>
              <div className="flex-1 flex flex-col justify-center space-y-2">
                <Link to="/create-listing" className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors">
                  <Plus size={14} className="text-primary" />
                  <span className="text-[10px] font-medium">إعلان جديد</span>
                </Link>
                <Link to="/marketplace" className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                  <Eye size={14} className="text-muted-foreground" />
                  <span className="text-[10px]">تصفح السوق</span>
                </Link>
                <Link to="/contact" className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                  <Mail size={14} className="text-muted-foreground" />
                  <span className="text-[10px]">الدعم</span>
                </Link>
                {notifications.length > 0 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-warning/5">
                    <AlertCircle size={14} className="text-warning" />
                    <span className="text-[10px]">{notifications.filter(n => !n.is_read).length} إشعار جديد</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerDashboardPage;
