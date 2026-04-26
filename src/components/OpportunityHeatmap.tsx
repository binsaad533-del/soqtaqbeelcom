import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Flame, TrendingUp, Loader2 } from "lucide-react";
import AiStar from "@/components/AiStar";
import SarSymbol from "@/components/SarSymbol";
import { useListingTranslation } from "@/hooks/useListingTranslation";

interface CityHeat {
  city: string;
  // One listing id per city → used to fetch translated city/activity labels
  // via translate-listing-content cache. AR users get original (no calls).
  representativeListingId: string | null;
  count: number;
  avgPrice: number;
  topActivity: string;
  heat: "hot" | "warm" | "cool";
}

const OpportunityHeatmap = () => {
  const { t } = useTranslation();
  const [cities, setCities] = useState<CityHeat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: listings } = await supabase
        .from("listings")
        .select("id, city, price, business_activity")
        .eq("status", "published")
        .is("deleted_at", null);

      if (!listings) { setLoading(false); return; }

      const cityMap: Record<string, { count: number; prices: number[]; activities: Record<string, number>; representativeId: string | null }> = {};

      listings.forEach(l => {
        const city = l.city || t("marketplace.heatmap.unspecifiedCity");
        if (!cityMap[city]) cityMap[city] = { count: 0, prices: [], activities: {}, representativeId: null };
        cityMap[city].count++;
        if (l.price) cityMap[city].prices.push(l.price);
        const act = l.business_activity || t("marketplace.heatmap.general");
        cityMap[city].activities[act] = (cityMap[city].activities[act] || 0) + 1;
        // Pick the first listing with a non-empty city as the representative
        // for translation. This lets us reuse the listing-translation cache
        // instead of building a separate city-translation pipeline.
        if (!cityMap[city].representativeId && l.city && l.id) {
          cityMap[city].representativeId = l.id;
        }
      });

      const maxCount = Math.max(...Object.values(cityMap).map(c => c.count));

      const result: CityHeat[] = Object.entries(cityMap)
        .map(([city, data]) => {
          const avgPrice = data.prices.length > 0
            ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
            : 0;
          const topActivity = Object.entries(data.activities).sort((a, b) => b[1] - a[1])[0]?.[0] || t("marketplace.heatmap.general");
          const ratio = data.count / maxCount;
          const heat: CityHeat["heat"] = ratio > 0.6 ? "hot" : ratio > 0.3 ? "warm" : "cool";
          return { city, representativeListingId: data.representativeId, count: data.count, avgPrice, topActivity, heat };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);

      setCities(result);
      setLoading(false);
    };

    fetch();
  }, [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-primary" size={20} />
      </div>
    );
  }

  if (cities.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AiStar size={16} />
        <h3 className="text-sm font-semibold">{t("marketplace.heatmap.title")}</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {cities.map(c => (
          <div
            key={c.city}
            className={`rounded-xl p-3 border transition-all hover:scale-[1.02] ${
              c.heat === "hot"
                ? "bg-destructive/5 border-destructive/20"
                : c.heat === "warm"
                  ? "bg-warning/5 border-warning/20"
                  : "bg-muted/30 border-border/30"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {c.heat === "hot" ? (
                <Flame size={12} className="text-destructive" />
              ) : c.heat === "warm" ? (
                <TrendingUp size={12} className="text-warning" />
              ) : (
                <MapPin size={12} className="text-muted-foreground" />
              )}
              <span className="text-xs font-semibold">{c.city}</span>
            </div>
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <div>{t("marketplace.heatmap.opportunities", { count: c.count })}</div>
              {c.avgPrice > 0 && (
                <div className="flex items-center gap-0.5">
                  <span>{t("marketplace.heatmap.averageLabel")}</span>
                  <SarSymbol size={8} />
                  <span>{(c.avgPrice / 1000).toFixed(0)}K</span>
                </div>
              )}
              <div className="text-[9px] text-foreground/60 truncate">{c.topActivity}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 text-[9px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><Flame size={8} className="text-destructive" /> {t("marketplace.heatmap.hot")}</span>
        <span className="flex items-center gap-1"><TrendingUp size={8} className="text-warning" /> {t("marketplace.heatmap.warm")}</span>
        <span className="flex items-center gap-1"><MapPin size={8} className="text-muted-foreground" /> {t("marketplace.heatmap.cool")}</span>
      </div>
    </div>
  );
};

export default OpportunityHeatmap;
