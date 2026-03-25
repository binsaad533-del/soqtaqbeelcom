import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, TrendingDown, Activity, BarChart3,
  Handshake, Store, ArrowUpRight, ArrowDownRight,
  Zap, Users, DollarSign, Flame
} from "lucide-react";

interface TickerItem {
  id: string;
  label: string;
  value: string;
  change: number; // percentage
  icon: React.ReactNode;
  pulse?: boolean;
}

const MarketplaceTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [scrollX, setScrollX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch live stats
  const fetchStats = async () => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const [
        { count: totalListings },
        { count: thisWeekListings },
        { count: lastWeekListings },
        { count: activeDeals },
        { count: thisWeekDeals },
        { count: lastWeekDeals },
        { count: completedDeals },
        { data: avgPriceData },
        { data: avgPriceLastData },
      ] = await Promise.all([
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "published").is("deleted_at", null),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "published").is("deleted_at", null).gte("created_at", weekAgo.toISOString()),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "published").is("deleted_at", null).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
        supabase.from("deals").select("*", { count: "exact", head: true }).in("status", ["negotiation", "pending", "in_progress"]),
        supabase.from("deals").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
        supabase.from("deals").select("*", { count: "exact", head: true }).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
        supabase.from("deals").select("*", { count: "exact", head: true }).in("status", ["completed", "finalized"]),
        supabase.from("listings").select("price").eq("status", "published").is("deleted_at", null).not("price", "is", null).gte("created_at", weekAgo.toISOString()),
        supabase.from("listings").select("price").eq("status", "published").is("deleted_at", null).not("price", "is", null).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
      ]);

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const avgPrice = avgPriceData?.length
        ? Math.round(avgPriceData.reduce((s, r) => s + (r.price || 0), 0) / avgPriceData.length)
        : 0;
      const avgPriceLast = avgPriceLastData?.length
        ? Math.round(avgPriceLastData.reduce((s, r) => s + (r.price || 0), 0) / avgPriceLastData.length)
        : 0;

      const listingsChange = calcChange(thisWeekListings || 0, lastWeekListings || 0);
      const dealsChange = calcChange(thisWeekDeals || 0, lastWeekDeals || 0);
      const priceChange = calcChange(avgPrice, avgPriceLast);

      setItems([
        {
          id: "listings",
          label: "الفرص المتاحة",
          value: String(totalListings || 0),
          change: listingsChange,
          icon: <Store size={13} />,
          pulse: (thisWeekListings || 0) > 0,
        },
        {
          id: "deals",
          label: "صفقات نشطة",
          value: String(activeDeals || 0),
          change: dealsChange,
          icon: <Handshake size={13} />,
          pulse: (thisWeekDeals || 0) > 0,
        },
        {
          id: "completed",
          label: "صفقات مكتملة",
          value: String(completedDeals || 0),
          change: 0,
          icon: <BarChart3 size={13} />,
        },
        {
          id: "avg_price",
          label: "متوسط السعر",
          value: avgPrice > 0 ? `${(avgPrice / 1000).toFixed(0)}K` : "—",
          change: priceChange,
          icon: <DollarSign size={13} />,
        },
        {
          id: "activity",
          label: "حركة السوق",
          value: (thisWeekListings || 0) + (thisWeekDeals || 0) > 3 ? "نشط" : "هادئ",
          change: (thisWeekListings || 0) + (thisWeekDeals || 0) > 3 ? 1 : -1,
          icon: <Activity size={13} />,
          pulse: true,
        },
        {
          id: "demand",
          label: "الطلب",
          value: (thisWeekDeals || 0) > (lastWeekDeals || 0) ? "مرتفع" : "مستقر",
          change: dealsChange,
          icon: <Flame size={13} />,
        },
      ]);
    } catch (e) {
      console.error("Ticker fetch error:", e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Scrolling animation
  useEffect(() => {
    if (!contentRef.current) return;
    let animFrame: number;
    let pos = 0;
    const speed = 0.4;

    const animate = () => {
      pos -= speed;
      const contentWidth = contentRef.current?.scrollWidth ?? 0;
      const halfWidth = contentWidth / 2;
      if (Math.abs(pos) >= halfWidth) pos = 0;
      setScrollX(pos);
      animFrame = requestAnimationFrame(animate);
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [items]);

  if (items.length === 0) return null;

  // Duplicate items for seamless loop
  const displayItems = [...items, ...items];

  return (
    <div className="relative mb-5 overflow-hidden rounded-xl bg-card border border-border/40">
      {/* Gradient edges */}
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />

      {/* Live indicator */}
      <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20 flex items-center gap-1">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <span className="text-[8px] text-muted-foreground/60 font-medium">LIVE</span>
      </div>

      <div ref={containerRef} className="py-2.5 px-10">
        <div
          ref={contentRef}
          className="flex gap-6 whitespace-nowrap"
          style={{ transform: `translateX(${scrollX}px)` }}
        >
          {displayItems.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="flex items-center gap-2.5 shrink-0"
            >
              {/* Separator dot */}
              {i > 0 && <div className="w-px h-4 bg-border/40 -mr-1" />}

              {/* Icon */}
              <div className={cn(
                "text-muted-foreground/70",
                item.pulse && "animate-pulse"
              )}>
                {item.icon}
              </div>

              {/* Label */}
              <span className="text-[10px] text-muted-foreground/60 font-medium">
                {item.label}
              </span>

              {/* Value */}
              <span className="text-[11px] font-semibold text-foreground">
                {item.value}
              </span>

              {/* Change indicator */}
              {item.change !== 0 && (
                <div className={cn(
                  "flex items-center gap-0.5 text-[9px] font-medium rounded-md px-1.5 py-0.5",
                  item.change > 0
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    : "text-red-500 dark:text-red-400 bg-red-500/10"
                )}>
                  {item.change > 0 ? (
                    <ArrowUpRight size={9} strokeWidth={2.5} />
                  ) : (
                    <ArrowDownRight size={9} strokeWidth={2.5} />
                  )}
                  <span>{Math.abs(item.change)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceTicker;
