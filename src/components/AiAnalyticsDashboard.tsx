import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Activity, MapPin, Briefcase, DollarSign, Users, Loader2 } from "lucide-react";
import AiStar from "@/components/AiStar";
import SarSymbol from "@/components/SarSymbol";

interface MarketInsight {
  topActivities: { name: string; count: number }[];
  topCities: { name: string; count: number }[];
  avgPrice: number;
  totalListings: number;
  totalDeals: number;
  completedDeals: number;
  avgDealTime: number;
  priceRanges: { range: string; count: number }[];
  aiSummary: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted))", "#34d399", "#fbbf24", "#f87171"];

const AiAnalyticsDashboard = () => {
  const [data, setData] = useState<MarketInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch listings for analysis
        const { data: listings } = await supabase
          .from("listings")
          .select("business_activity, city, price, status, created_at")
          .is("deleted_at", null)
          .eq("status", "published");

        const { data: deals } = await supabase
          .from("deals")
          .select("status, created_at, completed_at, agreed_price");

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .limit(1);

        if (!listings) { setLoading(false); return; }

        // Top activities
        const activityCount: Record<string, number> = {};
        listings.forEach(l => {
          const act = l.business_activity || "غير محدد";
          activityCount[act] = (activityCount[act] || 0) + 1;
        });
        const topActivities = Object.entries(activityCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        // Top cities
        const cityCount: Record<string, number> = {};
        listings.forEach(l => {
          const city = l.city || "غير محدد";
          cityCount[city] = (cityCount[city] || 0) + 1;
        });
        const topCities = Object.entries(cityCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        // Avg price
        const prices = listings.filter(l => l.price && l.price > 0).map(l => l.price!);
        const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

        // Price ranges
        const ranges = [
          { range: "أقل من 50K", min: 0, max: 50000 },
          { range: "50K - 200K", min: 50000, max: 200000 },
          { range: "200K - 500K", min: 200000, max: 500000 },
          { range: "500K - 1M", min: 500000, max: 1000000 },
          { range: "أكثر من 1M", min: 1000000, max: Infinity },
        ];
        const priceRanges = ranges.map(r => ({
          range: r.range,
          count: prices.filter(p => p >= r.min && p < r.max).length,
        }));

        // Deals stats
        const completedDeals = deals?.filter(d => d.status === "completed" || d.status === "finalized").length || 0;
        const totalDeals = deals?.length || 0;

        // Avg deal time
        const dealTimes = deals
          ?.filter(d => d.completed_at && d.created_at)
          .map(d => {
            const start = new Date(d.created_at).getTime();
            const end = new Date(d.completed_at!).getTime();
            return (end - start) / (1000 * 60 * 60 * 24); // days
          }) || [];
        const avgDealTime = dealTimes.length > 0 ? Math.round(dealTimes.reduce((a, b) => a + b, 0) / dealTimes.length) : 0;

        // AI Summary
        const topAct = topActivities[0]?.name || "—";
        const topCity = topCities[0]?.name || "—";
        const aiSummary = `أكثر نشاط مطلوب: ${topAct} (${topActivities[0]?.count || 0} إعلان). أنشط مدينة: ${topCity}. متوسط السعر: ${avgPrice.toLocaleString()} ريال. معدل إتمام الصفقات: ${totalDeals > 0 ? Math.round((completedDeals / totalDeals) * 100) : 0}%.`;

        setData({
          topActivities,
          topCities,
          avgPrice,
          totalListings: listings.length,
          totalDeals,
          completedDeals,
          avgDealTime,
          priceRanges,
          aiSummary,
        });
      } catch (e) {
        console.error("Analytics fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4">
        <div className="flex items-center gap-2 mb-2">
          <AiStar size={18} />
          <h3 className="text-sm font-semibold">تحليل مقبل للسوق</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{data.aiSummary}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الإعلانات", value: data.totalListings, icon: Briefcase },
          { label: "إجمالي الصفقات", value: data.totalDeals, icon: Activity },
          { label: "صفقات مكتملة", value: data.completedDeals, icon: TrendingUp },
          { label: "متوسط مدة الصفقة", value: `${data.avgDealTime} يوم`, icon: Users },
        ].map((kpi, i) => (
          <div key={i} className="rounded-xl border border-border/40 p-3 bg-card">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon size={14} className="text-primary" strokeWidth={1.5} />
              <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
            </div>
            <span className="text-lg font-semibold">{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Activities */}
        <div className="rounded-xl border border-border/40 p-4 bg-card">
          <h4 className="text-xs font-medium mb-3 flex items-center gap-1.5">
            <Briefcase size={13} className="text-primary" strokeWidth={1.5} />
            أكثر الأنشطة طلباً
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.topActivities} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
              <Tooltip contentStyle={{ fontSize: 11, direction: "rtl" }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Cities */}
        <div className="rounded-xl border border-border/40 p-4 bg-card">
          <h4 className="text-xs font-medium mb-3 flex items-center gap-1.5">
            <MapPin size={13} className="text-primary" strokeWidth={1.5} />
            أنشط المدن
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.topCities}
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={35}
                dataKey="count"
                nameKey="name"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {data.topCities.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, direction: "rtl" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Price Distribution */}
      <div className="rounded-xl border border-border/40 p-4 bg-card">
        <h4 className="text-xs font-medium mb-3 flex items-center gap-1.5">
          <DollarSign size={13} className="text-primary" strokeWidth={1.5} />
          توزيع الأسعار
        </h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data.priceRanges}>
            <XAxis dataKey="range" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11, direction: "rtl" }} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Average Price */}
      <div className="rounded-xl border border-border/40 p-4 bg-card flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground">متوسط سعر الإعلانات</span>
          <div className="text-xl font-bold flex items-center gap-1">
            {data.avgPrice.toLocaleString()}
            <SarSymbol className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <TrendingUp size={28} className="text-primary/30" strokeWidth={1} />
      </div>
    </div>
  );
};

export default AiAnalyticsDashboard;
