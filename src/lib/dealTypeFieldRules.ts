/**
 * Central deal-type field schema — single source of truth for:
 *   - which fields are required / optional / hidden per deal type
 *   - image & document requirements
 *   - publish validation
 *   - disclosure form rendering
 */

export interface DealTypeFieldRules {
  requiredFields: string[];
  optionalFields: string[];
  hiddenFields: string[];
  imageRequired: boolean;
  docsRequired: boolean;
}

/**
 * All possible disclosure field keys.
 */
const ALL_FIELDS = [
  "business_activity",
  "city",
  "district",
  "price",
  "annual_rent",
  "lease_duration",
  "lease_paid_period",
  "lease_remaining",
  "liabilities",
  "overdue_salaries",
  "overdue_rent",
  "municipality_license",
  "civil_defense_license",
  "surveillance_cameras",
];

const LEASE_FIELDS = ["annual_rent", "lease_duration", "lease_paid_period", "lease_remaining"];
const LIABILITY_FIELDS = ["liabilities", "overdue_salaries", "overdue_rent"];
const LICENSE_FIELDS = ["municipality_license", "civil_defense_license", "surveillance_cameras"];
const ASSET_DISPLAY_FIELDS = [...LEASE_FIELDS, ...LIABILITY_FIELDS, ...LICENSE_FIELDS];

export const DEAL_TYPE_FIELD_RULES: Record<string, DealTypeFieldRules> = {
  // ── Full Takeover ──
  full_takeover: {
    requiredFields: ["business_activity", "city", "price"],
    optionalFields: ["district", ...LEASE_FIELDS, ...LIABILITY_FIELDS, ...LICENSE_FIELDS],
    hiddenFields: [],
    imageRequired: false, // optional but recommended
    docsRequired: false,
  },

  // ── Transfer without liabilities ──
  transfer_no_liabilities: {
    requiredFields: ["business_activity", "city", "price"],
    optionalFields: ["district", ...LEASE_FIELDS, ...LICENSE_FIELDS],
    hiddenFields: [...LIABILITY_FIELDS],
    imageRequired: false,
    docsRequired: false,
  },

  // ── Assets + Operating Setup ──
  assets_setup: {
    requiredFields: ["business_activity", "city", "price"],
    optionalFields: ["district"],
    hiddenFields: [...LEASE_FIELDS, ...LIABILITY_FIELDS, ...LICENSE_FIELDS],
    imageRequired: true,
    docsRequired: false,
  },

  // ── Assets Only ──
  assets_only: {
    requiredFields: ["business_activity", "city", "price"],
    optionalFields: ["district"],
    hiddenFields: [...LEASE_FIELDS, ...LIABILITY_FIELDS, ...LICENSE_FIELDS],
    imageRequired: true,
    docsRequired: false,
  },

  // ── Commercial Registration Only ──
  cr_only: {
    requiredFields: ["price"],
    optionalFields: ["business_activity", "city", "district"],
    hiddenFields: [...LEASE_FIELDS, ...LIABILITY_FIELDS, ...LICENSE_FIELDS],
    imageRequired: false,
    docsRequired: true,
  },

  // ── Location Only ──
  location_only: {
    requiredFields: ["city", "price"],
    optionalFields: ["business_activity", "district", ...LEASE_FIELDS],
    hiddenFields: [...LIABILITY_FIELDS, ...LICENSE_FIELDS],
    imageRequired: false,
    docsRequired: false,
  },

  // ── Assets + CR ──
  assets_cr: {
    requiredFields: ["business_activity", "city", "price"],
    optionalFields: ["district"],
    hiddenFields: [...LEASE_FIELDS, ...LIABILITY_FIELDS, ...LICENSE_FIELDS],
    imageRequired: true,
    docsRequired: true,
  },

  // ── Assets + CR + Trade Name ──
  assets_cr_name: {
    requiredFields: ["business_activity", "city", "price"],
    optionalFields: ["district"],
    hiddenFields: [...LEASE_FIELDS, ...LIABILITY_FIELDS, ...LICENSE_FIELDS],
    imageRequired: true,
    docsRequired: true,
  },
};

// Fallback for unknown deal types
const DEFAULT_RULES: DealTypeFieldRules = DEAL_TYPE_FIELD_RULES["full_takeover"];

/**
 * Get the field rules for a given deal type.
 */
export function getRules(dealType: string): DealTypeFieldRules {
  const rules = DEAL_TYPE_FIELD_RULES[dealType];
  if (!rules) {
    console.warn(`[dealTypeFieldRules] Unknown deal type "${dealType}", falling back to full_takeover`);
    return DEFAULT_RULES;
  }
  return rules;
}

/**
 * Check if a field should be visible (not hidden) for a deal type.
 */
export function isFieldVisible(dealType: string, field: string): boolean {
  const rules = getRules(dealType);
  return !rules.hiddenFields.includes(field);
}

/**
 * Check if a field is required for a deal type.
 */
export function isFieldRequired(dealType: string, field: string): boolean {
  return getRules(dealType).requiredFields.includes(field);
}

/**
 * Known Saudi cities for location validation.
 */
const KNOWN_CITIES = [
  "الرياض", "جدة", "مكة", "مكة المكرمة", "المدينة", "المدينة المنورة",
  "الدمام", "الخبر", "الظهران", "الاحساء", "الأحساء", "القطيف", "الجبيل",
  "تبوك", "بريدة", "عنيزة", "حائل", "أبها", "خميس مشيط", "الطائف",
  "نجران", "جيزان", "جازان", "ينبع", "الباحة", "سكاكا", "عرعر",
  "حفر الباطن", "الخرج", "القصيم", "المجمعة", "الزلفي", "شقراء",
  "وادي الدواسر", "بيشة", "رابغ", "الليث", "القنفذة", "المذنب",
  "الرس", "البكيرية", "محايل عسير", "صبيا", "أملج", "العلا",
  "الدوادمي", "عفيف", "رفحاء", "طريف", "تيماء", "الوجه",
  "ضباء", "حقل", "البدائع", "النماص", "رجال ألمع", "المويه",
  "ظهران الجنوب", "سراة عبيدة", "شرورة", "الحوطة",
];

/**
 * Check if a city name is a known Saudi city.
 */
export function isKnownCity(city: string): boolean {
  if (!city) return false;
  const normalized = city.trim();
  return KNOWN_CITIES.some(c =>
    c === normalized || normalized.includes(c) || c.includes(normalized)
  );
}

/**
 * Detect if a text value is gibberish / nonsensical.
 */
export function isGibberish(text: string): boolean {
  if (!text || text.trim().length < 3) return false;
  const trimmed = text.trim();

  // Single repeated character (e.g. "ااااا", "xxxxx")
  if (/^(.)\1{2,}$/.test(trimmed)) return true;

  // Mostly repeated chars (>70% same char)
  const charCounts: Record<string, number> = {};
  for (const c of trimmed.replace(/\s/g, '')) {
    charCounts[c] = (charCounts[c] || 0) + 1;
  }
  const maxCount = Math.max(...Object.values(charCounts));
  if (trimmed.replace(/\s/g, '').length > 3 && maxCount / trimmed.replace(/\s/g, '').length > 0.7) return true;

  // No Arabic or English letters at all (just symbols/numbers)
  if (!/[\u0600-\u06FFa-zA-Z]/.test(trimmed)) return true;

  // Random keyboard patterns — only flag if no vowels (real words have vowels)
  const latinOnly = trimmed.replace(/[^a-zA-Z]/g, '');
  if (latinOnly.length >= 4 && !/[aeiouAEIOU]/i.test(latinOnly)) return true;
  // Common keyboard row mashing patterns
  if (/^[asdfghjkl;]{4,}$/i.test(trimmed) || /^[qwertyu]{4,}$/i.test(trimmed) || /^[zxcvbnm]{4,}$/i.test(trimmed)) return true;
  // Single/double Arabic letter (not a word)
  if (/^[\u0600-\u06FF]{1,2}$/.test(trimmed)) return true;

  return false;
}

/**
 * Validate disclosure data against a deal type's rules.
 * Returns an object with field → error message for each failing required field.
 */
export function validateDisclosure(
  dealType: string,
  disclosure: Record<string, string>
): Record<string, string> {
  const rules = getRules(dealType);
  const errors: Record<string, string> = {};

  for (const field of rules.requiredFields) {
    const value = disclosure[field];
    if (field === "price") {
      if (!value || isNaN(Number(value)) || Number(value) <= 0) {
        errors[field] = "السعر مطلوب ويجب أن يكون رقماً أكبر من صفر";
      }
    } else if (field === "city") {
      if (!value || value.trim() === "") {
        errors[field] = "المدينة مطلوبة";
      } else if (isGibberish(value)) {
        errors[field] = "اسم المدينة غير مفهوم — سيجعل الصفقة تبدو مشبوهة";
      } else if (!isKnownCity(value)) {
        errors[field] = "يرجى إدخال اسم مدينة سعودية صحيحة — الموقع غير المعروف سيجعل الصفقة مشبوهة";
      }
    } else {
      if (!value || value.trim() === "") {
        errors[field] = `${FIELD_LABELS[field] || field} مطلوب`;
      } else if (isGibberish(value)) {
        errors[field] = `${FIELD_LABELS[field] || field} غير مفهوم — الوصف غير الواضح سيجعل الصفقة تبدو مشبوهة`;
      }
    }
  }

  // Also validate optional fields if filled with gibberish
  for (const field of rules.optionalFields) {
    const value = disclosure[field];
    if (value && value.trim() !== "" && isGibberish(value)) {
      errors[field] = `${FIELD_LABELS[field] || field} غير مفهوم — الوصف غير الواضح سيجعل الصفقة تبدو مشبوهة`;
    }
  }

  return errors;
}

/**
 * Check if images pass the deal-type requirement.
 */
export function validateImages(dealType: string, photoCount: number): boolean {
  const rules = getRules(dealType);
  if (!rules.imageRequired) return true;
  return photoCount > 0;
}

export const FIELD_LABELS: Record<string, string> = {
  business_activity: "نوع النشاط",
  city: "المدينة",
  district: "الحي",
  price: "السعر",
  annual_rent: "الإيجار السنوي",
  lease_duration: "مدة العقد",
  lease_paid_period: "الفترة المدفوعة",
  lease_remaining: "المتبقي من العقد",
  liabilities: "الالتزامات المالية",
  overdue_salaries: "الرواتب المتأخرة",
  overdue_rent: "الإيجار المتأخر",
  municipality_license: "رخصة البلدية",
  civil_defense_license: "الدفاع المدني",
  surveillance_cameras: "كاميرات المراقبة",
};
