import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  BarChart3,
  Handshake,
  Store,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Flame,
  ShieldCheck,
  Clock,
  Eye,
  TrendingUp,
  Percent,
  Star,
} from "lucide-react";

interface TickerItem {
  id: string;
  label: string;
  value: string;
  change: number;
  icon: ReactNode;
  pulse?: boolean;
}

const ITEM_GAP = 24;
const SPEED_PX_PER_SEC = 60;

const MarketplaceTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [repeatCount, setRepeatCount] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const offsetRef = useRef(0);
  const groupWidthRef = useRef(0);

  const fetchStats = useCallback(async () => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
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

      const prices = avgPriceData?.map((row) => row.price as number) || [];
      const pricesLast = avgPriceLastData?.map((row) => row.price as number) || [];
      const avgPrice = prices.length ? Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length) : 0;
      const avgPriceLast = pricesLast.length ? Math.round(pricesLast.reduce((sum, value) => sum + value, 0) / pricesLast.length) : 0;
      const highPrice = (highPriceData?.[0]?.price as number) || 0;
      const lowPrice = (lowPriceData?.[0]?.price as number) || 0;

      const listingsChange = calcChange(thisWeekListings || 0, lastWeekListings || 0);
      const dealsChange = calcChange(thisWeekDeals || 0, lastWeekDeals || 0);
      const priceChange = calcChange(avgPrice, avgPriceLast);
      const weeklyVolume = (thisWeekListings || 0) + (thisWeekDeals || 0);
      const previousWeeklyVolume = (lastWeekListings || 0) + (lastWeekDeals || 0);
      const volumeChange = calcChange(weeklyVolume, previousWeeklyVolume);
      const successRate = (completedDeals || 0) > 0 && (activeDeals || 0) + (completedDeals || 0) > 0
        ? Math.round(((completedDeals || 0) / ((activeDeals || 0) + (completedDeals || 0))) * 100)
        : 0;

      const formatPrice = (price: number) => {
        if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
        if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
        return String(price);
      };

      setItems([
        { id: "listings", label: "الفرص المتاحة", value: String(totalListings || 0), change: listingsChange, icon: <Store size={12} />, pulse: (thisWeekListings || 0) > 0 },
        { id: "deals", label: "صفقات نشطة", value: String(activeDeals || 0), change: dealsChange, icon: <Handshake size={12} />, pulse: (thisWeekDeals || 0) > 0 },
        { id: "completed", label: "مكتملة", value: String(completedDeals || 0), change: 0, icon: <BarChart3 size={12} /> },
        { id: "avg_price", label: "متوسط السعر", value: avgPrice > 0 ? formatPrice(avgPrice) : "—", change: priceChange, icon: <DollarSign size={12} /> },
        { id: "high_price", label: "أعلى سعر", value: highPrice > 0 ? formatPrice(highPrice) : "—", change: 0, icon: <TrendingUp size={12} /> },
        { id: "low_price", label: "أقل سعر", value: lowPrice > 0 ? formatPrice(lowPrice) : "—", change: 0, icon: <ArrowDownRight size={12} /> },
        { id: "activity", label: "حركة السوق", value: weeklyVolume > 3 ? "نشط" : weeklyVolume > 0 ? "متوسط" : "هادئ", change: volumeChange, icon: <Activity size={12} />, pulse: true },
        { id: "demand", label: "الطلب", value: (thisWeekDeals || 0) > (lastWeekDeals || 0) ? "مرتفع" : "مستقر", change: dealsChange, icon: <Flame size={12} /> },
        { id: "today", label: "فرص اليوم", value: String(todayListings || 0), change: 0, icon: <Clock size={12} />, pulse: (todayListings || 0) > 0 },
        { id: "users", label: "المستخدمين", value: String(totalProfiles || 0), change: 0, icon: <Eye size={12} /> },
        { id: "success_rate", label: "نسبة الإتمام", value: `${successRate}%`, change: successRate > 50 ? 1 : successRate > 0 ? -1 : 0, icon: <Percent size={12} /> },
        { id: "trust", label: "بائعون موثّقون", value: "أولوية", change: 1, icon: <ShieldCheck size={12} /> },
        { id: "volume", label: "حجم التداول", value: String(weeklyVolume), change: volumeChange, icon: <Star size={12} />, pulse: weeklyVolume > 0 },
      ]);
    } catch (error) {
      console.error("Ticker fetch error:", error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const renderTickerSet = useCallback((copyKey: string) => (
    items.map((item, index) => (
      <div
        key={`${copyKey}-${item.id}-${index}`}
        dir="rtl"
        className="flex items-center gap-2 shrink-0"
      >
        <div className="w-px h-3.5 bg-border/30" />
        <div className={cn("text-muted-foreground/60", item.pulse && "animate-pulse")}>
          {item.icon}
        </div>
        <span className="text-[10px] text-muted-foreground/50 font-medium">{item.label}</span>
        <span className="text-[11px] font-semibold text-foreground">{item.value}</span>
        {item.change !== 0 && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-[9px] font-medium rounded-md px-1 py-0.5",
              item.change > 0
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                : "text-red-500 dark:text-red-400 bg-red-500/10"
            )}
          >
            {item.change > 0 ? <ArrowUpRight size={8} strokeWidth={2.5} /> : <ArrowDownRight size={8} strokeWidth={2.5} />}
            {Math.abs(item.change)}%
          </div>
        )}
      </div>
    ))
  ), [items]);

  const repeatedSetKeys = useMemo(
    () => Array.from({ length: repeatCount }, (_, index) => `repeat-${index}`),
    [repeatCount]
  );

  const updateLayout = useCallback(() => {
    if (!containerRef.current || !measureRef.current || items.length === 0) return;

    const containerWidth = containerRef.current.offsetWidth;
    const singleSetWidth = measureRef.current.scrollWidth;
    if (!containerWidth || !singleSetWidth) return;

    const nextRepeatCount = Math.max(3, Math.ceil((containerWidth * 2) / singleSetWidth));
    setRepeatCount((current) => (current === nextRepeatCount ? current : nextRepeatCount));
  }, [items.length]);

  useEffect(() => {
    updateLayout();

    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => updateLayout());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateLayout]);

  useEffect(() => {
    if (!groupRef.current) return;
    groupWidthRef.current = groupRef.current.scrollWidth;
    offsetRef.current = 0;
    if (trackRef.current) {
      trackRef.current.style.transform = "translate3d(0, 0, 0)";
    }
  }, [repeatCount, items]);

  useEffect(() => {
    if (items.length === 0) return;

    let lastTime = performance.now();

    const step = (currentTime: number) => {
      const deltaSeconds = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (!pausedRef.current && trackRef.current && groupWidthRef.current > 0) {
        offsetRef.current -= SPEED_PX_PER_SEC * deltaSeconds;

        if (Math.abs(offsetRef.current) >= groupWidthRef.current) {
          offsetRef.current += groupWidthRef.current;
        }

        trackRef.current.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [items, repeatCount]);

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative mb-5 overflow-hidden rounded-xl bg-card border border-border/40"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />

      <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20 flex items-center gap-1">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <span className="text-[8px] text-muted-foreground/60 font-medium">LIVE</span>
      </div>

      <div className="py-2.5 px-8 overflow-hidden" dir="ltr">
        <div
          ref={trackRef}
          className="flex whitespace-nowrap will-change-transform"
          style={{ gap: `${ITEM_GAP}px` }}
        >
          <div ref={groupRef} className="flex whitespace-nowrap shrink-0" style={{ gap: `${ITEM_GAP}px` }}>
            {repeatedSetKeys.map((key) => renderTickerSet(key)).flat()}
          </div>
          <div className="flex whitespace-nowrap shrink-0" style={{ gap: `${ITEM_GAP}px` }}>
            {repeatedSetKeys.map((key) => renderTickerSet(`clone-${key}`)).flat()}
          </div>
        </div>
      </div>

      <div className="absolute opacity-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        <div ref={measureRef} className="flex whitespace-nowrap" style={{ gap: `${ITEM_GAP}px` }}>
          {renderTickerSet("measure")}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceTicker;
