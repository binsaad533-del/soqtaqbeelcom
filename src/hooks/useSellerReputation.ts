import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SellerReputation {
  sellerId: string;
  sellerName: string;
  completedDeals: number;
  cancelledDeals: number;
  avgRating: number;
  responseRate: number;
  trustScore: number;
  verificationLevel: string;
  isVerified: boolean;
  reviewCount: number;
  stars: number;
  badge: "trusted" | "good" | "check" | "caution";
  badgeLabel: string;
  suggestions: string[];
}

export function useSellerReputation() {
  const [reputation, setReputation] = useState<SellerReputation | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(async (sellerId: string) => {
    setLoading(true);
    try {
      const [profileRes, reviewsRes, dealsRes, verificationsRes] = await Promise.all([
        supabase.from("public_profiles" as any).select("*").eq("user_id", sellerId).maybeSingle() as Promise<{ data: any; error: any }>,
        supabase.from("seller_reviews").select("*").eq("seller_id", sellerId),
        supabase.from("deals").select("status").or(`seller_id.eq.${sellerId}`),
        supabase.from("seller_verifications").select("verification_status").eq("user_id", sellerId).maybeSingle(),
      ]);

      const profile = profileRes.data;
      const reviews = reviewsRes.data || [];
      const deals = dealsRes.data || [];
      const verification = verificationsRes.data;

      const completedDeals = deals.filter(d => d.status === "completed").length;
      const cancelledDeals = deals.filter(d => d.status === "cancelled").length;
      const totalDeals = deals.length || 1;

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.overall_experience + r.honesty + r.responsiveness + r.listing_accuracy) / 4, 0) / reviews.length
        : 0;

      const responseRate = completedDeals / totalDeals;
      const isVerified = verification?.verification_status === "approved";
      const trustScore = profile?.trust_score || 50;

      // Calculate stars (1-5)
      let stars = 3;
      if (avgRating >= 4.5 && completedDeals >= 5 && isVerified) stars = 5;
      else if (avgRating >= 3.5 && completedDeals >= 3) stars = 4;
      else if (avgRating >= 2.5 || completedDeals >= 1) stars = 3;
      else if (completedDeals === 0 && !isVerified) stars = 2;

      // Badge
      let badge: SellerReputation["badge"] = "check";
      let badgeLabel = "تحقق";
      if (stars >= 5) { badge = "trusted"; badgeLabel = "موثوق"; }
      else if (stars >= 4) { badge = "good"; badgeLabel = "جيد"; }
      else if (stars <= 2) { badge = "caution"; badgeLabel = "حذر"; }

      // Suggestions
      const suggestions: string[] = [];
      if (!isVerified) suggestions.push("وثّق حسابك لزيادة ثقة المشترين");
      if (reviews.length < 3) suggestions.push("شجّع المشترين على تقييمك بعد إتمام الصفقة");
      if (cancelledDeals > completedDeals) suggestions.push("نسبة الإلغاء مرتفعة، حاول إتمام الصفقات");
      if (!profile?.phone_verified) suggestions.push("وثّق رقم جوالك لتعزيز المصداقية");

      const rep: SellerReputation = {
        sellerId,
        sellerName: profile?.full_name || "بائع",
        completedDeals,
        cancelledDeals,
        avgRating: Math.round(avgRating * 10) / 10,
        responseRate: Math.round(responseRate * 100),
        trustScore,
        verificationLevel: profile?.verification_level || "none",
        isVerified,
        reviewCount: reviews.length,
        stars,
        badge,
        badgeLabel,
        suggestions,
      };

      setReputation(rep);
      return rep;
    } catch (e) {
      console.error("Reputation error:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { reputation, loading, analyze };
}
