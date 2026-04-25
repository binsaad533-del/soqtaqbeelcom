import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ScenarioId =
  | "current"
  | "discount10"
  | "discount20"
  | "noAssets"
  | "installment"
  | "transition";

interface SimulationScenario {
  id: ScenarioId;
  name: string;
  adjustedPrice: number;
  commission: number;
  riskLevel: "low" | "medium" | "high";
  recommendation: string;
}

interface SimulationResult {
  basePrice: number;
  scenarios: SimulationScenario[];
  bestScenario: ScenarioId;
}

export function useDealSimulation() {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const simulate = useCallback(async (listingId: string) => {
    setLoading(true);
    try {
      const { data: listing } = await supabase
        .from("listings")
        .select("price, business_activity, city, annual_rent, area_sqm, deal_type")
        .eq("id", listingId)
        .maybeSingle();

      if (!listing?.price) {
        setLoading(false);
        return null;
      }

      const base = listing.price;
      const rent = listing.annual_rent || 0;

      const scenarios: SimulationScenario[] = [
        {
          id: "current",
          name: "السعر الحالي",
          adjustedPrice: base,
          commission: base * 0.01,
          riskLevel: "medium",
          recommendation: "السعر المعروض كما هو",
        },
        {
          id: "discount10",
          name: "تخفيض 10%",
          adjustedPrice: base * 0.9,
          commission: base * 0.9 * 0.01,
          riskLevel: "low",
          recommendation: "جاذبية أعلى للمشترين مع هامش ربح معقول",
        },
        {
          id: "discount20",
          name: "تخفيض 20%",
          adjustedPrice: base * 0.8,
          commission: base * 0.8 * 0.01,
          riskLevel: "low",
          recommendation: "بيع سريع، مناسب إذا تبغى تبيع بأسرع وقت",
        },
        {
          id: "noAssets",
          name: "بدون أصول (أصول فقط 30%)",
          adjustedPrice: base * 0.3,
          commission: base * 0.3 * 0.01,
          riskLevel: "low",
          recommendation: "مناسب لمن يبغى الأصول فقط بدون النشاط",
        },
        {
          id: "installment",
          name: "تقسيط (زيادة 15%)",
          adjustedPrice: base * 1.15,
          commission: base * 1.15 * 0.01,
          riskLevel: "high",
          recommendation: "سعر أعلى مقابل تسهيل الدفع، لكن مخاطر التحصيل أعلى",
        },
        {
          id: "transition",
          name: "مع فترة انتقالية 3 أشهر",
          adjustedPrice: base + (rent / 4),
          commission: (base + (rent / 4)) * 0.01,
          riskLevel: "medium",
          recommendation: "إضافة ربع الإيجار السنوي لتغطية الفترة الانتقالية",
        },
      ];

      const best = scenarios.reduce((a, b) => {
        const scoreA = a.riskLevel === "low" ? 3 : a.riskLevel === "medium" ? 2 : 1;
        const scoreB = b.riskLevel === "low" ? 3 : b.riskLevel === "medium" ? 2 : 1;
        return scoreA >= scoreB ? a : b;
      });

      const res: SimulationResult = {
        basePrice: base,
        scenarios,
        bestScenario: best.id,
      };

      setResult(res);
      return res;
    } catch (e) {
      console.error("Simulation error:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, simulate };
}
