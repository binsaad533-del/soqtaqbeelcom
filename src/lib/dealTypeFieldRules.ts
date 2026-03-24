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
    } else {
      if (!value || value.trim() === "") {
        errors[field] = `${FIELD_LABELS[field] || field} مطلوب`;
      }
    }
  }

  // Image validation is done separately (needs photo count)
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
