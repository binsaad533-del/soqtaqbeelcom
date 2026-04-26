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
          <HeatmapCard key={c.city} city={c} />
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
