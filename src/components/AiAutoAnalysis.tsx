import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import AiStar from "@/components/AiStar";
import { ChevronDown, ChevronUp, Loader2, AlertTriangle, TrendingUp, Shield } from "lucide-react";
import ReactMarkdown from "react-markdown";

/**
 * Auto-analysis banner that shows on listing detail pages.
 * Fetches cached analysis or generates a quick one.
 */
const AiAutoAnalysis = () => {
  const { pathname } = useLocation();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating] = useState<string | null>(null);

  const isListingPage = pathname.startsWith("/listing/");
  const listingId = isListingPage ? pathname.split("/")[2] : null;

  useEffect(() => {
    if (!listingId) { setAnalysis(null); return; }

    const fetch = async () => {
      setLoading(true);
      try {
        // Check cached analysis first
        const { data } = await supabase
          .from("listings")
          .select("ai_summary, ai_rating, ai_analysis_cache, title, price, city, business_activity, deal_type")
          .eq("id", listingId)
          .maybeSingle();

        if (!data) { setLoading(false); return; }

        setRating(data.ai_rating);

        if (data.ai_summary) {
          setAnalysis(data.ai_summary);
          setLoading(false);
          return;
        }

        // Generate quick analysis via edge function
        const ctx = [
          data.title && `العنوان: ${data.title}`,
          data.price && `السعر: ${data.price.toLocaleString()} ريال`,
          data.city && `المدينة: ${data.city}`,
          data.business_activity && `النشاط: ${data.business_activity}`,
          data.deal_type && `نوع الصفقة: ${data.deal_type}`,
        ].filter(Boolean).join("\n");

        const { invokeWithRetry } = await import("@/lib/invokeWithRetry");
        const { data: aiData } = await invokeWithRetry("ai-chat", {
          messages: [{ role: "user", content: "أعطيني تحليل سريع ومختصر (3-4 نقاط) لهالفرصة. ركّز على: السعر عادل؟ المخاطر؟ الفرص؟" }],
          context: `الصفحة: تفاصيل إعلان\n${ctx}`,
        });

        if (aiData) {
          // Parse streaming response
          const text = typeof aiData === "string" ? aiData : "";
          if (text) setAnalysis(text);
        }
      } catch (e) {
        console.error("Auto analysis error:", e);
      }
      setLoading(false);
    };

    fetch();
  }, [listingId]);

  if (!isListingPage || (!analysis && !loading)) return null;

  const ratingColor = rating === "ممتاز" || rating === "جيد جداً"
    ? "text-success"
    : rating === "متوسط"
      ? "text-warning"
      : "text-muted-foreground";

  return (
    <div className="mx-auto max-w-4xl px-4 mt-4">
      <div className={cn(
        "rounded-2xl border border-primary/15 bg-gradient-to-l from-primary/5 via-primary/[0.02] to-transparent p-4 transition-all",
        expanded && "pb-5"
      )}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <AiStar size={18} className="[&_.ai-sparkle-big]:!fill-white [&_.ai-sparkle-small]:!fill-white/80" animate={false} />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">تحليل مقبل الذكي</span>
                {rating && (
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/40", ratingColor)}>
                    {rating}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">تحليل تلقائي للفرصة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 size={14} className="text-primary animate-spin" />}
            {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </div>
        </button>

        {expanded && analysis && (
          <div className="mt-3 pt-3 border-t border-border/20">
            <div className="prose prose-xs prose-neutral dark:prose-invert max-w-none text-xs leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:text-foreground">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>

            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/10">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Shield size={10} />
                <span>تحليل استرشادي</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <TrendingUp size={10} />
                <span>مبني على بيانات الإعلان</span>
              </div>
              {rating && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <AlertTriangle size={10} />
                  <span>لا يغني عن الفحص الميداني</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAutoAnalysis;
