// ============================================================
// منهجية التقييم المعتمدة
// مبنية على: معايير الهيئة السعودية للمقيمين المعتمدين (TAQEEM)
//           + الجمعية الأمريكية للمقيمين (ASA)
// أسس القيمة: قيمة التصفية المنظمة (OLV) — IVS 160.1
// ============================================================

export type ConditionTaqeem =
  | 'جديد'
  | 'ممتاز'
  | 'جيد_جداً'
  | 'جيد'
  | 'مقبول'
  | 'رديء'
  | 'خردة';

// نسبة الإهلاك المادي (متوسط النطاق حسب TAQEEM)
export const DEPRECIATION_RATE: Record<ConditionTaqeem, number> = {
  'جديد':     0.025,
  'ممتاز':    0.08,
  'جيد_جداً': 0.15,
  'جيد':      0.35,
  'مقبول':    0.58,
  'رديء':     0.78,
  'خردة':     0.95,
};

// معامل OLV — ينقص مع التدهور
export const OLV_DISCOUNT: Record<ConditionTaqeem, number> = {
  'جديد':     0.80,
  'ممتاز':    0.80,
  'جيد_جداً': 0.82,
  'جيد':      0.85,
  'مقبول':    0.88,
  'رديء':     0.92,
  'خردة':     1.00,
};

// Mapping من الحالات القديمة (5) إلى TAQEEM (7)
export const LEGACY_CONDITION_MAP: Record<string, ConditionTaqeem> = {
  'جديد': 'جديد',
  'شبه جديد': 'جيد_جداً',
  'جيد': 'جيد',
  'مستعمل': 'مقبول',
  'تالف': 'خردة',
};

export interface PricingBreakdown {
  crn: number;
  market_value_sar: number;
  price_sar: number;
  depreciation_rate: number;
  olv_discount: number;
  condition_taqeem: ConditionTaqeem;
  valuation_method: 'OLV-TAQEEM';
  reasoning: string;
}

export function calculatePricing(
  crn: number,
  condition: string,
): PricingBreakdown {
  const taqeemCondition: ConditionTaqeem =
    (Object.keys(DEPRECIATION_RATE).includes(condition)
      ? condition
      : LEGACY_CONDITION_MAP[condition] || 'جيد') as ConditionTaqeem;

  const depRate = DEPRECIATION_RATE[taqeemCondition];
  const olvDiscount = OLV_DISCOUNT[taqeemCondition];

  const marketValue = Math.round(crn * (1 - depRate));
  const finalPrice = Math.round(marketValue * olvDiscount);

  return {
    crn,
    market_value_sar: marketValue,
    price_sar: finalPrice,
    depreciation_rate: depRate,
    olv_discount: olvDiscount,
    condition_taqeem: taqeemCondition,
    valuation_method: 'OLV-TAQEEM',
    reasoning:
      `${crn.toLocaleString()} (CRN) × ${Math.round((1-depRate)*100)}% (حالة ${taqeemCondition}) ` +
      `= ${marketValue.toLocaleString()} (سوقي) × ${Math.round(olvDiscount*100)}% (OLV) ` +
      `= ${finalPrice.toLocaleString()} ر.س (تقبيل)`,
  };
}
