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

/**
 * Trust score formula (max 115):
 *   phone_verified           → +15
 *   completed_deals × 5      → up to +50  (cap at 10 deals)
 *   avg_rating (0-5) × 10    → up to +50
 *
 * Verification is now derived solely from `profiles.phone_verified`
 * (OTP verification). The legacy seller_verifications table was removed.
 */
function computeTrustScore(phoneVerified: boolean, completedDeals: number, avgRating: number): number {
  const phoneBonus = phoneVerified ? 15 : 0;
  const dealBonus = Math.min(completedDeals, 10) * 5;
  const ratingBonus = avgRating > 0 ? Math.round(avgRating * 10) : 0;
  return phoneBonus + dealBonus + ratingBonus;
}

export function useSellerReputation() {
  const [reputation, setReputation] = useState<SellerReputation | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(async (sellerId: string) => {
    setLoading(true);
    try {
      const [profileRes, reviewsRes, dealsRes] = await Promise.all([
        supabase.from("public_profiles" as any).select("*").eq("user_id", sellerId).maybeSingle() as unknown as Promise<{ data: any; error: any }>,
        supabase.from("seller_reviews").select("*").eq("seller_id", sellerId),
        supabase.from("deals").select("status").or(`seller_id.eq.${sellerId}`),
      ]);

      const profile = profileRes.data;
      const reviews = reviewsRes.data || [];
      const deals = dealsRes.data || [];

      const completedDeals = deals.filter(d => d.status === "completed").length;
      const cancelledDeals = deals.filter(d => d.status === "cancelled").length;
      const totalDeals = deals.length || 1;

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.overall_experience + r.honesty + r.responsiveness + r.listing_accuracy) / 4, 0) / reviews.length
        : 0;

      const responseRate = completedDeals / totalDeals;
      const phoneVerified = profile?.phone_verified === true;
      const isVerified = phoneVerified;
      const trustScore = computeTrustScore(phoneVerified, completedDeals, avgRating);

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
      if (!phoneVerified) suggestions.push("وثّق رقم جوالك لتعزيز المصداقية");
      if (reviews.length < 3) suggestions.push("شجّع المشترين على تقييمك بعد إتمام الصفقة");
      if (cancelledDeals > completedDeals) suggestions.push("نسبة الإلغاء مرتفعة، حاول إتمام الصفقات");

      const rep: SellerReputation = {
        sellerId,
        sellerName: profile?.full_name || "بائع",
        completedDeals,
        cancelledDeals,
        avgRating: Math.round(avgRating * 10) / 10,
        responseRate: Math.round(responseRate * 100),
        trustScore,
        verificationLevel: phoneVerified ? "phone" : "none",
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
