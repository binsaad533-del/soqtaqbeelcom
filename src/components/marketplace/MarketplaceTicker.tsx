import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, BarChart3, Handshake, Store, ArrowUpRight, ArrowDownRight,
  DollarSign, Flame, ShieldCheck, Clock, Eye, TrendingUp, Percent, Star
} from "lucide-react";

interface TickerItem {
  id: string;
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  pulse?: boolean;
}

const MarketplaceTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(40);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [
        { count: totalListings },
        { count: thisWeekListings },
        { count: lastWeekListings },
        { count: activeDeals },
        { count: thisWeekDeals },
        { count: lastWeekDeals },
        { count: completedDeals },
        { count: todayListings },
        { count: totalProfiles },
        { data: avgPriceData },
        { data: avgPriceLastData },
        { data: highPriceData },
        { data: lowPriceData },
      ] = await Promise.all([
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "published").is("deleted_at", null),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "published").is("deleted_at", null).gte("created_at", weekAgo.toISOString()),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "published").is("deleted_at", null).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
        supabase.from("deals").select("*", { count: "exact", head: true }).in("status", ["negotiation", "pending", "in_progress"]),
        supabase.from("deals").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
        supabase.from("deals").select("*", { count: "exact", head: true }).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
        supabase.from("deals").select("*", { count: "exact", head: true }).in("status", ["completed", "finalized"]),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "published").is("deleted_at", null).gte("created_at", todayStart.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("price").eq("status", "published").is("deleted_at", null).not("price", "is", null).gte("created_at", weekAgo.toISOString()),
        supabase.from("listings").select("price").eq("status", "published").is("deleted_at", null).not("price", "is", null).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
        supabase.from("listings").select("price").eq("status", "published").is("deleted_at", null).not("price", "is", null).order("price", { ascending: false }).limit(1),
        supabase.from("listings").select("price").eq("status", "published").is("deleted_at", null).not("price", "is", null).order("price", { ascending: true }).limit(1),
      ]);

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const prices = avgPriceData?.map(r => r.price as number) || [];
      const pricesLast = avgPriceLastData?.map(r => r.price as number) || [];
      const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      const avgPriceLast = pricesLast.length ? Math.round(pricesLast.reduce((a, b) => a + b, 0) / pricesLast.length) : 0;
      const highPrice = highPriceData?.[0]?.price as number || 0;
      const lowPrice = lowPriceData?.[0]?.price as number || 0;

      const listingsChange = calcChange(thisWeekListings || 0, lastWeekListings || 0);
      const dealsChange = calcChange(thisWeekDeals || 0, lastWeekDeals || 0);
      const priceChange = calcChange(avgPrice, avgPriceLast);
      const weeklyVolume = (thisWeekListings || 0) + (thisWeekDeals || 0);
      const lastWeeklyVolume = (lastWeekListings || 0) + (lastWeekDeals || 0);
      const volumeChange = calcChange(weeklyVolume, lastWeeklyVolume);

      const successRate = (completedDeals || 0) > 0 && (activeDeals || 0) + (completedDeals || 0) > 0
        ? Math.round(((completedDeals || 0) / ((activeDeals || 0) + (completedDeals || 0))) * 100)
        : 0;

      const formatPrice = (p: number) => {
        if (p >= 1000000) return `${(p / 1000000).toFixed(1)}M`;
        if (p >= 1000) return `${(p / 1000).toFixed(0)}K`;
        return String(p);
      };

      setItems([
        {
          id: "listings",
          label: "الفرص المتاحة",
          value: String(totalListings || 0),
          change: listingsChange,
          icon: <Store size={12} />,
          pulse: (thisWeekListings || 0) > 0,
        },
        {
          id: "deals",
          label: "صفقات نشطة",
          value: String(activeDeals || 0),
          change: dealsChange,
          icon: <Handshake size={12} />,
          pulse: (thisWeekDeals || 0) > 0,
        },
        {
          id: "completed",
          label: "مكتملة",
          value: String(completedDeals || 0),
          change: 0,
          icon: <BarChart3 size={12} />,
        },
        {
          id: "avg_price",
          label: "متوسط السعر",
          value: avgPrice > 0 ? formatPrice(avgPrice) : "—",
          change: priceChange,
          icon: <DollarSign size={12} />,
        },
        {
          id: "high_price",
          label: "أعلى سعر",
          value: highPrice > 0 ? formatPrice(highPrice) : "—",
          change: 0,
          icon: <TrendingUp size={12} />,
        },
        {
          id: "low_price",
          label: "أقل سعر",
          value: lowPrice > 0 ? formatPrice(lowPrice) : "—",
          change: 0,
          icon: <ArrowDownRight size={12} />,
        },
        {
          id: "activity",
          label: "حركة السوق",
          value: weeklyVolume > 3 ? "نشط" : weeklyVolume > 0 ? "متوسط" : "هادئ",
          change: volumeChange,
          icon: <Activity size={12} />,
          pulse: true,
        },
        {
          id: "demand",
          label: "الطلب",
          value: (thisWeekDeals || 0) > (lastWeekDeals || 0) ? "مرتفع" : "مستقر",
          change: dealsChange,
          icon: <Flame size={12} />,
        },
        {
          id: "today",
          label: "فرص اليوم",
          value: String(todayListings || 0),
          change: 0,
          icon: <Clock size={12} />,
          pulse: (todayListings || 0) > 0,
        },
        {
          id: "users",
          label: "المستخدمين",
          value: String(totalProfiles || 0),
          change: 0,
          icon: <Eye size={12} />,
        },
        {
          id: "success_rate",
          label: "نسبة الإتمام",
          value: `${successRate}%`,
          change: successRate > 50 ? 1 : successRate > 0 ? -1 : 0,
          icon: <Percent size={12} />,
        },
        {
          id: "trust",
          label: "بائعون موثّقون",
          value: "أولوية",
          change: 1,
          icon: <ShieldCheck size={12} />,
        },
        {
          id: "volume",
          label: "حجم التداول",
          value: String(weeklyVolume),
          change: volumeChange,
          icon: <Star size={12} />,
          pulse: weeklyVolume > 0,
        },
      ]);
    } catch (e) {
      console.error("Ticker fetch error:", e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate animation duration based on content width
  useEffect(() => {
    if (trackRef.current && items.length > 0) {
      // Measure one set of items width
      const children = trackRef.current.children;
      if (children.length > 0) {
        let oneSetWidth = 0;
        const perSet = items.length;
        for (let i = 0; i < Math.min(perSet, children.length); i++) {
          oneSetWidth += (children[i] as HTMLElement).offsetWidth + 24; // gap
        }
        // ~50px per second scroll speed
        setDuration(Math.max(8, Math.round(oneSetWidth / 150)));
      }
    }
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="relative mb-5 overflow-hidden rounded-xl bg-card border border-border/40">
      {/* Gradient edges */}
      <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />

      {/* Live indicator */}
      <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20 flex items-center gap-1">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <span className="text-[8px] text-muted-foreground/60 font-medium">LIVE</span>
      </div>

      <div className="py-2.5 px-8">
        <div
          ref={trackRef}
          className="flex gap-6 whitespace-nowrap ticker-track"
          style={{ ["--ticker-duration" as string]: `${duration}s` }}
        >
          {/* Render 4 copies for seamless infinite scroll */}
          {[0, 1, 2, 3].map(copy => (
            items.map((item, i) => (
              <div
                key={`${copy}-${item.id}`}
                className="flex items-center gap-2 shrink-0"
              >
                {(copy > 0 || i > 0) && (
                  <div className="w-px h-3.5 bg-border/30 -mr-0.5" />
                )}

                <div className={cn(
                  "text-muted-foreground/60",
                  item.pulse && "animate-pulse"
                )}>
                  {item.icon}
                </div>

                <span className="text-[10px] text-muted-foreground/50 font-medium">
                  {item.label}
                </span>

                <span className="text-[11px] font-semibold text-foreground">
                  {item.value}
                </span>

                {item.change !== 0 && (
                  <div className={cn(
                    "flex items-center gap-0.5 text-[9px] font-medium rounded-md px-1 py-0.5",
                    item.change > 0
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      : "text-red-500 dark:text-red-400 bg-red-500/10"
                  )}>
                    {item.change > 0 ? (
                      <ArrowUpRight size={8} strokeWidth={2.5} />
                    ) : (
                      <ArrowDownRight size={8} strokeWidth={2.5} />
                    )}
                    {Math.abs(item.change)}%
                  </div>
                )}
              </div>
            ))
          )).flat()}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceTicker;
