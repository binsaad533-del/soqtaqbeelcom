import { useState } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  dealId: string;
  sellerId: string;
  onSubmitted?: () => void;
}

const CRITERIA = [
  { key: "listing_accuracy", label: "دقة الإعلان" },
  { key: "honesty", label: "الأمانة والصدق" },
  { key: "responsiveness", label: "سرعة الاستجابة" },
  { key: "overall_experience", label: "التجربة العامة" },
] as const;

const SellerReviewForm = ({ dealId, sellerId, onSubmitted }: Props) => {
  const { user } = useAuthContext();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allRated = CRITERIA.every(c => ratings[c.key] >= 1);

  const handleSubmit = async () => {
    if (!user || !allRated) return;
    setSubmitting(true);

    const { error } = await supabase.from("seller_reviews" as any).insert({
      deal_id: dealId,
      reviewer_id: user.id,
      seller_id: sellerId,
      listing_accuracy: ratings.listing_accuracy,
      honesty: ratings.honesty,
      responsiveness: ratings.responsiveness,
      overall_experience: ratings.overall_experience,
      comment: comment.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.info("لقد قمت بتقييم هذا البائع مسبقاً");
      } else {
        toast.error("فشل إرسال التقييم");
      }
    } else {
      toast.success("شكراً لتقييمك!");
      setSubmitted(true);
      onSubmitted?.();
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-soft border border-primary/10 text-center">
        <Star size={24} className="text-primary mx-auto mb-2" fill="currentColor" />
        <p className="text-sm font-medium">شكراً لتقييمك!</p>
        <p className="text-xs text-muted-foreground mt-1">تقييمك يساعد في بناء مجتمع موثوق</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 space-y-4">
      <div className="flex items-center gap-2">
        <Star size={16} className="text-primary" />
        <h3 className="text-sm font-medium">قيّم تجربتك مع البائع</h3>
      </div>

      <div className="space-y-3">
        {CRITERIA.map(criterion => (
          <div key={criterion.key}>
            <p className="text-xs text-muted-foreground mb-1.5">{criterion.label}</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRatings(prev => ({ ...prev, [criterion.key]: star }))}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    size={20}
                    className={cn(
                      "transition-colors",
                      (ratings[criterion.key] || 0) >= star
                        ? "text-primary fill-primary"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="أضف تعليقاً (اختياري)..."
        className="text-sm resize-none rounded-xl"
        rows={2}
      />

      <Button
        onClick={handleSubmit}
        disabled={!allRated || submitting}
        className="w-full rounded-xl gap-2"
      >
        {submitting
          ? <><Loader2 size={14} className="animate-spin" /> جاري الإرسال...</>
          : <><Send size={14} /> إرسال التقييم</>
        }
      </Button>
    </div>
  );
};

export default SellerReviewForm;
