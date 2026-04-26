import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Review {
  listing_accuracy: number;
  honesty: number;
  responsiveness: number;
  overall_experience: number;
  comment?: string | null;
  created_at: string;
}

interface Props {
  reviews: Review[];
  className?: string;
}

const SellerReviewsSummary = ({ reviews, className }: Props) => {
  const { t } = useTranslation();
  if (reviews.length === 0) return null;

  const avg = (key: keyof Pick<Review, "listing_accuracy" | "honesty" | "responsiveness" | "overall_experience">) =>
    reviews.reduce((s, r) => s + r[key], 0) / reviews.length;

  const overallAvg = (avg("listing_accuracy") + avg("honesty") + avg("responsiveness") + avg("overall_experience")) / 4;

  return (
    <div className={cn("bg-card rounded-2xl p-5 shadow-soft border border-border/30", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star size={14} className="text-primary" fill="currentColor" />
          <h3 className="text-sm font-medium">{t("sellerReviews.title")}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{reviews.length} {t("sellerReviews.reviewsCount")}</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl font-semibold">{overallAvg.toFixed(1)}</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s}
              size={14}
              className={overallAvg >= s ? "text-primary fill-primary" : "text-muted-foreground/20"}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {[
          { key: "listingAccuracy", value: avg("listing_accuracy") },
          { key: "honesty", value: avg("honesty") },
          { key: "responsiveness", value: avg("responsiveness") },
          { key: "experience", value: avg("overall_experience") },
        ].map(item => (
          <div key={item.key} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-16 shrink-0">{t(`sellerReviews.criteria.${item.key}`)}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(item.value / 5) * 100}%` }}
              />
            </div>
            <span className="text-muted-foreground w-6 text-left">{item.value.toFixed(1)}</span>
          </div>
        ))}
      </div>

      {/* Recent comments */}
      {reviews.filter(r => r.comment).slice(0, 3).map((r, i) => (
        <div key={i} className="mt-3 pt-3 border-t border-border/20">
          <p className="text-xs text-muted-foreground leading-relaxed">"{r.comment}"</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {new Date(r.created_at).toLocaleDateString("en-US")}
          </p>
        </div>
      ))}
    </div>
  );
};

export default SellerReviewsSummary;
