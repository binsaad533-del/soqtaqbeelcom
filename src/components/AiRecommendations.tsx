import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAiMemory } from "@/hooks/useAiMemory";
import { cn } from "@/lib/utils";
import AiStar from "@/components/AiStar";
import { Sparkles, ArrowLeft, TrendingUp } from "lucide-react";

interface RecommendedListing {
  id: string;
  title: string;
  price: number | null;
  city: string | null;
  business_activity: string | null;
  category: string | null;
}

/**
 * Shows AI-powered recommendations based on user memory/preferences.
 * Appears on marketplace and home pages.
 */
const AiRecommendations = () => {
  const { memory, loaded } = useAiMemory();
  const [listings, setListings] = useState<RecommendedListing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    const hasPref = memory.preferred_cities.length > 0 || memory.preferred_activities.length > 0;
    if (!hasPref && memory.viewed_listings.length === 0) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("listings")
          .select("id, title, price, city, business_activity, category")
          .eq("status", "published")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(6);

        // Filter by preferred cities/activities if available
        if (memory.preferred_cities.length > 0) {
          query = query.in("city", memory.preferred_cities);
        }

        // Exclude already viewed
        if (memory.viewed_listings.length > 0) {
          query = query.not("id", "in", `(${memory.viewed_listings.slice(0, 10).join(",")})`);
        }

        // Budget filter
        if (memory.budget_max) {
          query = query.lte("price", memory.budget_max);
        }
        if (memory.budget_min) {
          query = query.gte("price", memory.budget_min);
        }

        const { data } = await query;
        if (data && data.length > 0) {
          setListings(data);
        } else {
          // Fallback: just get latest listings
          const { data: fallback } = await supabase
            .from("listings")
            .select("id, title, price, city, business_activity, category")
            .eq("status", "published")
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(4);
          setListings(fallback || []);
        }
      } catch (e) {
        console.error("Recommendations error:", e);
      }
      setLoading(false);
    };

    fetchRecommendations();
  }, [loaded, memory.preferred_cities, memory.preferred_activities, memory.budget_min, memory.budget_max, memory.viewed_listings]);

  if (!loaded || listings.length === 0 || loading) return null;

  const hasPref = memory.preferred_cities.length > 0 || memory.preferred_activities.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AiStar size={16} />
        <h3 className="text-sm font-medium">
          {hasPref ? "فرص تناسب اهتماماتك" : "فرص مقترحة لك"}
        </h3>
        <Sparkles size={11} className="text-primary/50" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {listings.slice(0, 4).map((l) => (
          <Link
            key={l.id}
            to={`/listing/${l.id}`}
            className="group flex items-start gap-3 p-3 rounded-xl border border-border/30 hover:border-primary/20 hover:bg-primary/[0.02] transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp size={14} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{l.title || "فرصة بدون عنوان"}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {l.city && <span className="text-[10px] text-muted-foreground">{l.city}</span>}
                {l.price && (
                  <span className="text-[10px] font-medium text-primary">
                    {l.price.toLocaleString()} ﷼
                  </span>
                )}
              </div>
            </div>
            <ArrowLeft size={12} className="text-muted-foreground/50 group-hover:text-primary shrink-0 mt-1 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AiRecommendations;
