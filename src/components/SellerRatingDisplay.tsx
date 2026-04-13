import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RatingSummary {
  average_rating: number;
  total_ratings: number;
}

interface Props {
  sellerId: string;
  compact?: boolean;
  className?: string;
}

const SellerRatingDisplay = ({ sellerId, compact = false, className }: Props) => {
  const [summary, setSummary] = useState<RatingSummary | null>(null);

  useEffect(() => {
    if (!sellerId) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_seller_rating_summary", {
        _seller_id: sellerId,
      });
      if (!error && data) {
        setSummary(data as unknown as RatingSummary);
      }
    })();
  }, [sellerId]);

  if (!summary || summary.total_ratings === 0) return null;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Star size={12} className="text-amber-400 fill-amber-400" />
        <span className="text-xs font-medium">{summary.average_rating}</span>
        <span className="text-[10px] text-muted-foreground">({summary.total_ratings})</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={cn(
              star <= Math.round(summary.average_rating)
                ? "text-amber-400 fill-amber-400"
                : "text-muted-foreground/20"
            )}
          />
        ))}
      </div>
      <span className="text-sm font-medium">{summary.average_rating}</span>
      <span className="text-xs text-muted-foreground">({summary.total_ratings} تقييم)</span>
    </div>
  );
};

export default SellerRatingDisplay;
