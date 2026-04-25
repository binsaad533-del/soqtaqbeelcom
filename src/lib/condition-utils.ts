/**
 * Maps an Arabic asset condition string (as stored in DB) to a stable
 * translation key suffix. Used with `t(\`condition.${mapConditionToKey(x)}\`)`.
 */
export const CONDITION_KEYS: Record<string, string> = {
  "جديد": "new",
  "ممتاز": "excellent",
  "شبه جديد": "excellent",
  "جيد جداً": "veryGood",
  "جيد جدا": "veryGood",
  "جيد": "good",
  "مقبول": "acceptable",
  "رديء": "poor",
  "تالف": "poor",
  "خردة": "scrap",
  "مستعمل": "used",
  "غير واضح": "unclear",
  "غير محدد": "unclear",
  "يتطلب معاينة": "needsInspection",
  "يتطلب_معاينة": "needsInspection",
};

export const mapConditionToKey = (condition?: string | null): string => {
  if (!condition) return "unclear";
  return CONDITION_KEYS[condition.trim()] || "unclear";
};

/**
 * Maps an Arabic AI confidence label to a translation key suffix.
 * Used with `t(\`dealCheck.confidence${mapConfidenceToKey(x)}\`)`.
 */
const CONFIDENCE_KEYS: Record<string, string> = {
  "عالي": "High",
  "متوسط": "Medium",
  "منخفض": "Low",
  "تقديري": "Estimate",
  "يتطلب_معاينة": "NeedsInspection",
  "يتطلب معاينة": "NeedsInspection",
};

export const mapConfidenceToKey = (confidence?: string | null): string => {
  if (!confidence) return "NeedsInspection";
  return CONFIDENCE_KEYS[confidence.trim()] || "NeedsInspection";
};

/**
 * Maps an Arabic deal type label (as stored on listings) to a translation key
 * suffix. Used with `t(\`deal.${mapDealTypeToKey(x)}\`)`.
 */
const DEAL_TYPE_KEYS: Record<string, string> = {
  "تقبيل كامل": "type_full_takeover",
  "تقبيل جزئي": "type_partial",
  "أصول فقط": "type_assets_only",
  "تقبيل أصول فقط": "type_assets_only",
  "امتياز تجاري": "type_franchise",
  full_takeover: "type_full_takeover",
  full_transfer: "type_full_takeover",
  full: "type_full_takeover",
  partial: "type_partial",
  assets_only: "type_assets_only",
  franchise: "type_franchise",
};

export const mapDealTypeToKey = (type?: string | null): string => {
  if (!type) return "type_full_takeover";
  return DEAL_TYPE_KEYS[type.trim()] || "type_full_takeover";
};

/**
 * Maps an Arabic feasibility verdict to a translation key suffix.
 * Used with `t(\`feasibility.${mapFeasibilityVerdictToKey(x)}\`)`.
 */
const FEASIBILITY_VERDICT_KEYS: Record<string, string> = {
  "استثمار مقبول بحذر": "investmentAcceptableWithCaution",
  "مقبولة مع حذر": "investmentAcceptableWithCaution",
  "استثمار جيد": "investmentGood",
  "استثمار ممتاز": "investmentExcellent",
  "استثمار عالي المخاطر": "investmentRisky",
  "استثمار متوسط": "investmentAcceptableWithCaution",
};

export const mapFeasibilityVerdictToKey = (verdict?: string | null): string => {
  if (!verdict) return "investmentAcceptableWithCaution";
  const trimmed = verdict.trim();
  if (FEASIBILITY_VERDICT_KEYS[trimmed]) return FEASIBILITY_VERDICT_KEYS[trimmed];
  // Fuzzy fallback
  if (trimmed.includes("ممتاز")) return "investmentExcellent";
  if (trimmed.includes("جيد")) return "investmentGood";
  if (trimmed.includes("مخاطر") || trimmed.includes("عالي")) return "investmentRisky";
  return "investmentAcceptableWithCaution";
};

/**
 * Maps Arabic status values like "سارية", "لا يوجد", "منتهية" used in
 * listing meta fields (municipal_license, civil_defense_license, liabilities)
 * to translation keys under the `listing.*` namespace.
 */
const STATUS_VALUE_KEYS: Record<string, string> = {
  "سارية": "active",
  "ساري": "active",
  "نشطة": "active",
  "نشط": "active",
  "لا يوجد": "none",
  "لايوجد": "none",
  "منتهية": "expired",
  "منتهي": "expired",
};

export const translateStatusValue = (
  value: string | null | undefined,
  t: (key: string) => string,
): string => {
  if (!value) return "";
  const trimmed = value.trim();
  const key = STATUS_VALUE_KEYS[trimmed];
  return key ? t(`listing.${key}`) : trimmed;
};

/**
 * Translates lease duration phrases like "4 سنوات" / "1-2 سنة" by replacing the
 * Arabic year noun with the localized one. Numbers and ranges stay untouched.
 */
export const translateLeaseDuration = (
  value: string | null | undefined,
  t: (key: string) => string,
): string => {
  if (!value) return "";
  let out = value.trim();
  // Translate plural first to avoid partial match
  out = out.replace(/سنوات/g, t("listing.years"));
  out = out.replace(/سنة/g, t("listing.year"));
  return out;
};
