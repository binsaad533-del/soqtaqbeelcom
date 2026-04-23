// ============================================================
// منهجية التقييم المعتمدة — v2 (فئات متعددة)
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

export type AssetCategory =
  | 'vehicle'
  | 'industrial'
  | 'furniture'
  | 'default';

// ============================================================
// جداول الإهلاك حسب الفئة
// ============================================================
export const DEPRECIATION_RATE: Record<AssetCategory, Record<ConditionTaqeem, number>> = {
  vehicle: {
    'جديد':     0.025,
    'ممتاز':    0.08,
    'جيد_جداً': 0.12,
    'جيد':      0.25,
    'مقبول':    0.45,
    'رديء':     0.70,
    'خردة':     0.95,
  },
  industrial: {
    'جديد':     0.025,
    'ممتاز':    0.08,
    'جيد_جداً': 0.15,
    'جيد':      0.35,
    'مقبول':    0.58,
    'رديء':     0.78,
    'خردة':     0.95,
  },
  furniture: {
    'جديد':     0.05,
    'ممتاز':    0.15,
    'جيد_جداً': 0.25,
    'جيد':      0.45,
    'مقبول':    0.65,
    'رديء':     0.82,
    'خردة':     0.95,
  },
  default: {
    'جديد':     0.025,
    'ممتاز':    0.10,
    'جيد_جداً': 0.20,
    'جيد':      0.40,
    'مقبول':    0.60,
    'رديء':     0.80,
    'خردة':     0.95,
  },
};

// ============================================================
// معاملات OLV حسب الفئة — ينقص مع التدهور
// ============================================================
export const OLV_DISCOUNT: Record<AssetCategory, Record<ConditionTaqeem, number>> = {
  vehicle: {
    'جديد':     0.85,
    'ممتاز':    0.85,
    'جيد_جداً': 0.87,
    'جيد':      0.88,
    'مقبول':    0.90,
    'رديء':     0.92,
    'خردة':     1.00,
  },
  industrial: {
    'جديد':     0.80,
    'ممتاز':    0.80,
    'جيد_جداً': 0.82,
    'جيد':      0.85,
    'مقبول':    0.88,
    'رديء':     0.92,
    'خردة':     1.00,
  },
  furniture: {
    'جديد':     0.75,
    'ممتاز':    0.75,
    'جيد_جداً': 0.78,
    'جيد':      0.82,
    'مقبول':    0.85,
    'رديء':     0.90,
    'خردة':     1.00,
  },
  default: {
    'جديد':     0.78,
    'ممتاز':    0.78,
    'جيد_جداً': 0.80,
    'جيد':      0.83,
    'مقبول':    0.86,
    'رديء':     0.91,
    'خردة':     1.00,
  },
};

// ============================================================
// Mappings للتوافق الخلفي
// ============================================================
export const LEGACY_CONDITION_MAP: Record<string, ConditionTaqeem> = {
  'جديد': 'جديد',
  'شبه جديد': 'جيد_جداً',
  'جيد': 'جيد',
  'مستعمل': 'مقبول',
  'تالف': 'خردة',
};

export const LEGACY_CATEGORY_MAP: Record<string, AssetCategory> = {
  'vehicle': 'vehicle',
  'مركبة': 'vehicle',
  'سيارة': 'vehicle',
  'industrial_machine': 'industrial',
  'industrial_equipment': 'industrial',
  'ماكينة': 'industrial',
  'آلة': 'industrial',
  'معدة إنتاج': 'industrial',
  'furniture': 'furniture',
  'أثاث': 'furniture',
  'مكتب': 'furniture',
};

// ============================================================
// الدالة الرئيسية
// ============================================================
export interface PricingBreakdown {
  crn: number;
  market_value_sar: number;
  price_sar: number;
  depreciation_rate: number;
  olv_discount: number;
  condition_taqeem: ConditionTaqeem;
  category: AssetCategory;
  valuation_method: 'OLV-TAQEEM';
  reasoning: string;
}

export function normalizeCondition(condition: string): ConditionTaqeem {
  if (Object.keys(DEPRECIATION_RATE.default).includes(condition)) {
    return condition as ConditionTaqeem;
  }
  return LEGACY_CONDITION_MAP[condition] || 'جيد';
}

export function normalizeCategory(category: string | undefined | null): AssetCategory {
  if (!category) return 'default';
  if (['vehicle', 'industrial', 'furniture', 'default'].includes(category)) {
    return category as AssetCategory;
  }
  return LEGACY_CATEGORY_MAP[category] || 'default';
}

export function calculatePricing(
  crn: number,
  condition: string,
  category: string | undefined | null = 'default',
): PricingBreakdown {
  const taqeemCondition = normalizeCondition(condition);
  const taqeemCategory = normalizeCategory(category);

  const depRate = DEPRECIATION_RATE[taqeemCategory][taqeemCondition];
  const olvDiscount = OLV_DISCOUNT[taqeemCategory][taqeemCondition];

  const marketValue = Math.round(crn * (1 - depRate));
  const finalPrice = Math.round(marketValue * olvDiscount);

  return {
    crn,
    market_value_sar: marketValue,
    price_sar: finalPrice,
    depreciation_rate: depRate,
    olv_discount: olvDiscount,
    condition_taqeem: taqeemCondition,
    category: taqeemCategory,
    valuation_method: 'OLV-TAQEEM',
    reasoning:
      `${crn.toLocaleString()} (CRN) × ${Math.round((1-depRate)*100)}% ` +
      `(${taqeemCondition}/${taqeemCategory}) = ` +
      `${marketValue.toLocaleString()} (سوقي) × ${Math.round(olvDiscount*100)}% (OLV) = ` +
      `${finalPrice.toLocaleString()} ر.س (تقبيل)`,
  };
}

// ============================================================
// دالة مساعدة لـ medianUsed — OLV فقط بدون إهلاك
// (السعر المستعمل من السوق يعكس الحالة أصلاً)
// ============================================================
export function applyOlvOnly(
  usedMarketPrice: number,
  condition: string,
  category: string | undefined | null = 'default',
): { price_sar: number; market_value_sar: number; olv_discount: number; reasoning: string } {
  const taqeemCondition = normalizeCondition(condition);
  const taqeemCategory = normalizeCategory(category);

  const olvDiscount = OLV_DISCOUNT[taqeemCategory][taqeemCondition];
  const finalPrice = Math.round(usedMarketPrice * olvDiscount);

  return {
    price_sar: finalPrice,
    market_value_sar: usedMarketPrice,
    olv_discount: olvDiscount,
    reasoning:
      `${usedMarketPrice.toLocaleString()} (سعر مستعمل من السوق) × ` +
      `${Math.round(olvDiscount*100)}% (OLV ${taqeemCondition}) = ` +
      `${finalPrice.toLocaleString()} ر.س (تقبيل)`,
  };
}
