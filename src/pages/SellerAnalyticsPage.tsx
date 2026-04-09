import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/useSEO";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Eye, Heart, TrendingUp, BarChart3, Target, Lightbulb } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import AiStar from "@/components/AiStar";
import SarSymbol from "@/components/SarSymbol";

interface ListingAnalytics {
  id: string;
  title: string | null;
  price: number | null;
  status: string;
  views: number;
  likes: number;
  offers: number;
  conversionRate: number;
}

interface DailyViews {
  date: string;
  views: number;
}

const SellerAnalyticsPage = () => {
  useSEO({ title: "تحليلات البائع | سوق تقبيل", description: "تحليلات تفصيلية لأداء إعلاناتك", canonical: "/seller-analytics" });
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [listingStats, setListingStats] = useState<ListingAnalytics[]>([]);
  const [dailyViews, setDailyViews] = useState<DailyViews[]>([]);
  const [totals, setTotals] = useState({ views: 0, likes: 0, offers: 0, avgConversion: 0 });
  const [aiTips, setAiTips] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, price, status")
        .eq("owner_id", user.id)
        .is("deleted_at", null);

      if (!listings?.length) { setLoading(false); return; }

      const ids = listings.map(l => l.id);

      const [viewsRes, likesRes, offersRes] = await Promise.all([
        supabase.from("listing_views").select("listing_id, created_at").in("listing_id", ids),
        supabase.from("listing_likes").select("listing_id").in("listing_id", ids),
        supabase.from("listing_offers").select("listing_id").in("listing_id", ids),
      ]);

      const viewsByListing: Record<string, number> = {};
      const likesByListing: Record<string, number> = {};
      const offersByListing: Record<string, number> = {};
      const viewsByDate: Record<string, number> = {};

      (viewsRes.data || []).forEach(v => {
        viewsByListing[v.listing_id] = (viewsByListing[v.listing_id] || 0) + 1;
        const d = new Date(v.created_at).toLocaleDateString("en-CA");
        viewsByDate[d] = (viewsByDate[d] || 0) + 1;
      });
      (likesRes.data || []).forEach(l => {
        likesByListing[l.listing_id] = (likesByListing[l.listing_id] || 0) + 1;
      });
      (offersRes.data || []).forEach(o => {
        offersByListing[o.listing_id] = (offersByListing[o.listing_id] || 0) + 1;
      });

      const stats: ListingAnalytics[] = listings.map(l => {
        const v = viewsByListing[l.id] || 0;
        const o = offersByListing[l.id] || 0;
        return {
          id: l.id,
          title: l.title,
          price: l.price ? Number(l.price) : null,
          status: l.status,
          views: v,
          likes: likesByListing[l.id] || 0,
          offers: o,
          conversionRate: v > 0 ? Math.round((o / v) * 100) : 0,
        };
      }).sort((a, b) => b.views - a.views);

      const totalV = stats.reduce((s, l) => s + l.views, 0);
      const totalL = stats.reduce((s, l) => s + l.likes, 0);
      const totalO = stats.reduce((s, l) => s + l.offers, 0);
      const avgConv = totalV > 0 ? Math.round((totalO / totalV) * 100) : 0;

      setListingStats(stats);
      setTotals({ views: totalV, likes: totalL, offers: totalO, avgConversion: avgConv });

      // Daily views for last 30 days
      const last30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toLocaleDateString("en-CA");
      });
      setDailyViews(last30.map(d => ({ date: d.slice(5), views: viewsByDate[d] || 0 })));

      // AI tips
      const tips: string[] = [];
      const noOffers = stats.filter(s => s.views > 10 && s.offers === 0);
      if (noOffers.length) tips.push(`${noOffers.length} إعلان لديه مشاهدات لكن بدون عروض — راجع السعر أو أضف صور أفضل`);
      const lowViews = stats.filter(s => s.status === "published" && s.views < 5);
      if (lowViews.length) tips.push(`${lowViews.length} إعلان نشط بمشاهدات قليلة — جرب تحسين العنوان والوصف`);
      if (avgConv < 3 && totalV > 20) tips.push("معدل التحويل منخفض — فكّر في تخفيض السعر أو إضافة إفصاحات أكثر لزيادة الثقة");
      if (totalV > 50 && totalL < 3) tips.push("المشاهدات جيدة لكن الإعجابات قليلة — حسّن الصور الأولى للإعلانات");
      if (!tips.length) tips.push("أداء إعلاناتك جيد! استمر بالتحديث المنتظم للحفاظ على التفاعل");
      setAiTips(tips);
    } catch (err) {
      console.error("[SellerAnalytics] error", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="py-8 container max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">تحليلات الأداء</h1>
            <p className="text-xs text-muted-foreground mt-1">إحصائيات تفصيلية لإعلاناتك</p>
          </div>
          <Link to="/seller-dashboard" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft size={12} /> لوحة البائع
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Eye, label: "إجمالي المشاهدات", value: totals.views, color: "bg-primary/10 text-primary" },
            { icon: Heart, label: "إجمالي الإعجابات", value: totals.likes, color: "bg-red-500/10 text-red-500" },
            { icon: TrendingUp, label: "عدد العروض", value: totals.offers, color: "bg-success/10 text-success" },
            { icon: Target, label: "معدل التحويل", value: `${totals.avgConversion}%`, color: "bg-amber-500/10 text-amber-600" },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
                  <kpi.icon size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                  <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Tips */}
        {aiTips.length > 0 && (
          <Card className="mb-6 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AiStar size={16} />
                <span className="text-sm font-semibold text-foreground">توصيات ذكية لتحسين الأداء</span>
              </div>
              <ul className="space-y-2">
                {aiTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Lightbulb size={12} className="text-amber-500 shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Views Chart */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} className="text-primary" />
              <span className="text-sm font-semibold">المشاهدات — آخر 30 يوم</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyViews}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [`${v} مشاهدة`, "المشاهدات"]} labelFormatter={l => `التاريخ: ${l}`} />
                <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Per-listing breakdown */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold mb-4">أداء كل إعلان</h2>
            {listingStats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">لا توجد إعلانات</p>
            ) : (
              <div className="space-y-3">
                {listingStats.map(ls => (
                  <Link key={ls.id} to={`/listing/${ls.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ls.title || "بدون عنوان"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {ls.price ? <>{ls.price.toLocaleString("en-US")} <SarSymbol size={8} /></> : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <div className="text-center">
                        <p className="font-bold text-foreground">{ls.views}</p>
                        <p className="text-[9px]">مشاهدة</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-foreground">{ls.likes}</p>
                        <p className="text-[9px]">إعجاب</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-foreground">{ls.offers}</p>
                        <p className="text-[9px]">عرض</p>
                      </div>
                      <div className="text-center">
                        <p className={`font-bold ${ls.conversionRate >= 5 ? "text-success" : ls.conversionRate > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {ls.conversionRate}%
                        </p>
                        <p className="text-[9px]">تحويل</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerAnalyticsPage;
