/**
 * Deal-type-aware transparency scoring.
 * Separates transparency (data completeness) from price reasonableness.
 */

import { DEAL_TYPE_MAP, type DealTypeConfig } from "./dealStructureConfig";

interface ListingData {
  primary_deal_type?: string | null;
  deal_type?: string;
  business_activity?: string | null;
  city?: string | null;
  district?: string | null;
  price?: number | null;
  annual_rent?: number | null;
  lease_duration?: string | null;
  lease_remaining?: string | null;
  liabilities?: string | null;
  overdue_salaries?: string | null;
  overdue_rent?: string | null;
  municipality_license?: string | null;
  civil_defense_license?: string | null;
  surveillance_cameras?: string | null;
  inventory?: any[];
  photos?: Record<string, string[]> | null;
  documents?: any[];
  deal_options?: any[];
}

// Fields relevant to each deal type
const DEAL_TYPE_REQUIRED_FIELDS: Record<string, string[]> = {
  full_takeover: [
    "business_activity", "city", "price", "annual_rent", "lease_duration",
    "lease_remaining", "liabilities", "municipality_license", "civil_defense_license",
    "overdue_salaries", "overdue_rent", "surveillance_cameras",
  ],
  transfer_no_liabilities: [
    "business_activity", "city", "price", "annual_rent", "lease_duration",
    "lease_remaining", "municipality_license", "civil_defense_license",
  ],
  assets_setup: [
    "business_activity", "city", "price",
  ],
  assets_only: [
    "business_activity", "city", "price",
  ],
  cr_only: [
    "business_activity", "city", "price",
  ],
  location_only: [
    "business_activity", "city", "price", "annual_rent", "lease_duration", "lease_remaining",
  ],
};

export type TransparencyLevel = "high" | "medium" | "low";
export type PriceLevel = "reasonable" | "high" | "low" | "unknown";

export interface TransparencyResult {
  score: number; // 0-100
  level: TransparencyLevel;
  label: string;
  missingFields: string[];
  totalRequired: number;
  filledRequired: number;
}

const FIELD_LABELS: Record<string, string> = {
  business_activity: "نوع النشاط",
  city: "المدينة",
  price: "السعر",
  annual_rent: "الإيجار السنوي",
  lease_duration: "مدة العقد",
  lease_remaining: "المتبقي من العقد",
  liabilities: "الالتزامات",
  overdue_salaries: "الرواتب المتأخرة",
  overdue_rent: "الإيجار المتأخر",
  municipality_license: "رخصة البلدية",
  civil_defense_license: "الدفاع المدني",
  surveillance_cameras: "كاميرات المراقبة",
};

export function calculateTransparency(listing: ListingData): TransparencyResult {
  const dealType = listing.primary_deal_type || listing.deal_type || "full_takeover";
  const requiredFields = DEAL_TYPE_REQUIRED_FIELDS[dealType] || DEAL_TYPE_REQUIRED_FIELDS["full_takeover"];

  const missing: string[] = [];
  let filled = 0;

  for (const field of requiredFields) {
    const value = (listing as any)[field];
    if (value !== null && value !== undefined && String(value).trim() !== "" && value !== 0) {
      filled++;
    } else {
      missing.push(FIELD_LABELS[field] || field);
    }
  }

  // Bonus points for having photos and inventory
  let bonusPoints = 0;
  let bonusTotal = 0;

  // Photos bonus (up to 15 points)
  bonusTotal += 15;
  const photoCount = listing.photos ? Object.values(listing.photos).flat().length : 0;
  if (photoCount >= 6) bonusPoints += 15;
  else if (photoCount >= 3) bonusPoints += 10;
  else if (photoCount >= 1) bonusPoints += 5;

  // Inventory bonus for asset-related deals (up to 10 points)
  const assetDeals = ["full_takeover", "transfer_no_liabilities", "assets_setup", "assets_only"];
  if (assetDeals.includes(dealType)) {
    bonusTotal += 10;
    const invCount = listing.inventory?.length || 0;
    if (invCount >= 5) bonusPoints += 10;
    else if (invCount >= 1) bonusPoints += 5;
  }

  // Documents bonus (up to 5 points)
  bonusTotal += 5;
  const docCount = listing.documents?.length || 0;
  if (docCount >= 2) bonusPoints += 5;
  else if (docCount >= 1) bonusPoints += 3;

  const fieldScore = requiredFields.length > 0 ? (filled / requiredFields.length) * 70 : 70;
  const bonusScore = bonusTotal > 0 ? (bonusPoints / bonusTotal) * 30 : 30;
  const totalScore = Math.round(fieldScore + bonusScore);

  let level: TransparencyLevel;
  let label: string;

  if (totalScore >= 75) {
    level = "high";
    label = "شفافية عالية";
  } else if (totalScore >= 45) {
    level = "medium";
    label = "شفافية متوسطة";
  } else {
    level = "low";
    label = "شفافية منخفضة";
  }

  return {
    score: totalScore,
    level,
    label,
    missingFields: missing,
    totalRequired: requiredFields.length,
    filledRequired: filled,
  };
}

/**
 * Get deal-type specific disclosure fields that should be shown to the user.
 */
export function getRelevantDisclosureFields(dealType: string): string[] {
  return DEAL_TYPE_REQUIRED_FIELDS[dealType] || DEAL_TYPE_REQUIRED_FIELDS["full_takeover"];
}

/**
 * Check if a specific field is relevant for a given deal type.
 */
export function isFieldRelevant(dealType: string, fieldName: string): boolean {
  const fields = DEAL_TYPE_REQUIRED_FIELDS[dealType] || DEAL_TYPE_REQUIRED_FIELDS["full_takeover"];
  return fields.includes(fieldName);
}
