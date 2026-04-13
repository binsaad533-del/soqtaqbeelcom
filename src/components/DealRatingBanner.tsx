import { useState, useEffect } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sanitizeInput } from "@/lib/security";

interface Props {
  dealId: string;
  otherPartyId: string;
  otherPartyName?: string;
  onSubmitted?: () => void;
}

const PROFANITY_LIST = ["كلب", "حمار", "غبي", "أحمق", "نصاب", "حرامي", "لص"];

function filterProfanity(text: string): string {
  let filtered = text;
  PROFANITY_LIST.forEach((word) => {
    filtered = filtered.replace(new RegExp(word, "gi"), "***");
  });
  return filtered;
}

const DealRatingBanner = ({ dealId, otherPartyId, otherPartyName, onSubmitted }: Props) => {
  const { user } = useAuthContext();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !dealId) return;
    (async () => {
      const { data } = await supabase
        .from("deal_ratings")
        .select("id")
        .eq("deal_id", dealId)
        .eq("rater_id", user.id)
        .maybeSingle();
      if (data) {
        setAlreadyRated(true);
        setSubmitted(true);
      }
      setLoading(false);
    })();
  }, [user?.id, dealId]);

  const handleSubmit = async () => {
    if (!user?.id || !dealId || rating < 1 || rating > 5) return;
    if (user.id === otherPartyId) {
      toast.error("لا يمكنك تقييم نفسك");
      return;
    }

    setSubmitting(true);
    try {
      const sanitizedComment = comment.trim()
        ? filterProfanity(sanitizeInput(comment.trim().slice(0, 500)))
        : null;

      const { error } = await supabase.from("deal_ratings").insert({
        deal_id: dealId,
        rater_id: user.id,
        rated_id: otherPartyId,
        rating,
        comment: sanitizedComment,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("لقد قيّمت هذه الصفقة مسبقاً");
          setAlreadyRated(true);
        } else {
          toast.error("فشل إرسال التقييم");
          console.error(error);
        }
        return;
      }

      setSubmitted(true);
      toast.success("شكراً لتقييمك!");
      onSubmitted?.();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;
  if (submitted || alreadyRated) {
    return (
      <div className="bg-primary/5 rounded-2xl p-4 text-center">
        <Star size={24} className="text-primary mx-auto mb-2 fill-primary" />
        <p className="text-sm font-medium text-primary">تم إرسال تقييمك — شكراً لك!</p>
      </div>
    );
  }

  const displayRating = hoverRating || rating;

  return (
    <div className="bg-card rounded-2xl shadow-soft border border-border/20 p-5 space-y-4">
      <div className="text-center">
        <h3 className="text-sm font-semibold mb-1">كيف كانت تجربتك؟</h3>
        <p className="text-xs text-muted-foreground">
          قيّم تجربتك مع {otherPartyName || "الطرف الآخر"}
        </p>
      </div>

      {/* Stars */}
      <div className="flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="transition-transform hover:scale-110 p-0.5"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
          >
            <Star
              size={28}
              className={cn(
                "transition-colors",
                star <= displayRating
                  ? "text-amber-400 fill-amber-400"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>

      {rating > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {rating === 5 && "ممتاز!"}
          {rating === 4 && "جيد جداً"}
          {rating === 3 && "جيد"}
          {rating === 2 && "متوسط"}
          {rating === 1 && "ضعيف"}
        </p>
      )}

      {/* Comment */}
      <Textarea
        placeholder="أضف تعليق (اختياري — 500 حرف كحد أقصى)"
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
        rows={2}
        className="text-sm resize-none"
      />
      <p className="text-[10px] text-muted-foreground text-left">{comment.length}/500</p>

      <Button
        onClick={handleSubmit}
        disabled={rating < 1 || submitting}
        className="w-full gap-2"
        size="sm"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        أرسل التقييم
      </Button>
    </div>
  );
};

export default DealRatingBanner;
