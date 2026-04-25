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
