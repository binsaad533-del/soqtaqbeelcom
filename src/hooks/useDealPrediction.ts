import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DealPrediction {
  successRate: number;
  factors: {
    label: string;
    score: number;
    maxScore: number;
    status: "good" | "warning" | "bad";
  }[];
  recommendation: string;
}

/**
 * Predicts deal success probability based on data completeness,
 * price fairness, party activity, risk factors, and seller verification.
 */
export function useDealPrediction() {
  const [prediction, setPrediction] = useState<DealPrediction | null>(null);
  const [loading, setLoading] = useState(false);

  const predictDeal = useCallback(async (dealId: string) => {
    setLoading(true);
    try {
      const { data: deal } = await supabase
        .from("deals")
        .select("*")
        .eq("id", dealId)
        .maybeSingle();

      if (!deal) { setLoading(false); return null; }

      const { data: listing } = deal.listing_id
        ? await supabase.from("listings").select("*").eq("id", deal.listing_id).maybeSingle()
        : { data: null };

      const { data: sellerProfile } = deal.seller_id
        ? await supabase.from("profiles").select("*").eq("user_id", deal.seller_id).maybeSingle()
        : { data: null };

      const factors: DealPrediction["factors"] = [];

      // 1. Data completeness (30%)
      let dataScore = 0;
      if (listing) {
        if (listing.title) dataScore += 3;
        if (listing.description) dataScore += 3;
        if (listing.price) dataScore += 4;
        if (listing.city) dataScore += 3;
        if (listing.business_activity) dataScore += 3;
        if (listing.photos) dataScore += 4;
        if (listing.documents) dataScore += 4;
        if (listing.inventory) dataScore += 3;
        if (listing.deal_disclosures) dataScore += 3;
      }
      factors.push({
        label: "اكتمال البيانات",
        score: dataScore,
        maxScore: 30,
        status: dataScore >= 20 ? "good" : dataScore >= 10 ? "warning" : "bad",
      });

      // 2. Price fairness (25%)
      let priceScore = 15; // Default moderate
      if (listing?.ai_price_analysis) {
        const analysis = listing.ai_price_analysis as any;
        if (analysis?.deviation) {
          const dev = Math.abs(analysis.deviation);
          if (dev < 10) priceScore = 25;
          else if (dev < 25) priceScore = 18;
          else if (dev < 50) priceScore = 10;
          else priceScore = 5;
        }
      }
      factors.push({
        label: "عدالة السعر",
        score: priceScore,
        maxScore: 25,
        status: priceScore >= 18 ? "good" : priceScore >= 10 ? "warning" : "bad",
      });

      // 3. Party activity (20%)
      let activityScore = 10;
      const { count: msgCount } = await supabase
        .from("negotiation_messages")
        .select("id", { count: "exact", head: true })
        .eq("deal_id", dealId);
      
      if (msgCount && msgCount > 5) activityScore = 20;
      else if (msgCount && msgCount > 2) activityScore = 15;
      else if (msgCount && msgCount > 0) activityScore = 10;
      else activityScore = 5;

      factors.push({
        label: "نشاط الأطراف",
        score: activityScore,
        maxScore: 20,
        status: activityScore >= 15 ? "good" : activityScore >= 10 ? "warning" : "bad",
      });

      // 4. Risk-free (15%)
      let riskScore = 15;
      if (deal.risk_score) {
        if (deal.risk_score > 70) riskScore = 3;
        else if (deal.risk_score > 40) riskScore = 8;
        else riskScore = 15;
      }
      if (listing?.fraud_score && listing.fraud_score > 50) riskScore = Math.max(0, riskScore - 5);

      factors.push({
        label: "خلو المخاطر",
        score: riskScore,
        maxScore: 15,
        status: riskScore >= 12 ? "good" : riskScore >= 7 ? "warning" : "bad",
      });

      // 5. Seller verification (10%)
      let verifyScore = 3;
      if (sellerProfile) {
        if (sellerProfile.is_verified) verifyScore += 4;
        if (sellerProfile.verification_level === "full") verifyScore += 3;
        else if (sellerProfile.verification_level === "basic") verifyScore += 1;
      }
      factors.push({
        label: "توثيق البائع",
        score: verifyScore,
        maxScore: 10,
        status: verifyScore >= 7 ? "good" : verifyScore >= 4 ? "warning" : "bad",
      });

      const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
      
      let recommendation = "";
      if (totalScore >= 70) recommendation = "🟢 صفقة واعدة — احتمال النجاح مرتفع";
      else if (totalScore >= 40) recommendation = "🟡 صفقة تحتاج متابعة — فيه نقاط تحتاج تحسين";
      else recommendation = "🔴 صفقة عالية المخاطر — راجع التفاصيل بعناية";

      const result: DealPrediction = {
        successRate: totalScore,
        factors,
        recommendation,
      };

      setPrediction(result);
      setLoading(false);
      return result;
    } catch (e) {
      console.error("Deal prediction error:", e);
      setLoading(false);
      return null;
    }
  }, []);

  return { prediction, loading, predictDeal };
}
