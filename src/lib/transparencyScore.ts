/**
 * Deal-type-aware transparency scoring.
 * Now driven by the central dealTypeFieldRules schema.
 */

import { getRules, FIELD_LABELS } from "./dealTypeFieldRules";

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

export function calculateTransparency(listing: ListingData): TransparencyResult {
  const dealType = listing.primary_deal_type || listing.deal_type || "full_takeover";
  const rules = getRules(dealType);

  // --- Required text fields (weight: 40 points) ---
  const missing: string[] = [];
  let requiredFilled = 0;
  let totalRequired = rules.requiredFields.length;

  for (const field of rules.requiredFields) {
    const value = (listing as any)[field];
    if (value !== null && value !== undefined && String(value).trim() !== "" && value !== 0) {
      requiredFilled++;
    } else {
      missing.push(FIELD_LABELS[field] || field);
    }
  }

  const requiredScore = totalRequired > 0
    ? (requiredFilled / totalRequired) * 40
    : 40;

  // --- Photos as a required item (weight: 20 points) ---
  let photosScore = 0;
  const includesAssets = rules.imageRequired || !rules.hiddenFields.includes("annual_rent");
  if (includesAssets) {
    totalRequired++;
    const photoCount = listing.photos ? Object.values(listing.photos).flat().length : 0;
    if (photoCount >= 6) { photosScore = 20; requiredFilled++; }
    else if (photoCount >= 3) { photosScore = 15; requiredFilled++; }
    else if (photoCount >= 1) { photosScore = 10; requiredFilled++; }
    else { missing.push("صور الإعلان"); }
  } else {
    photosScore = 20; // not applicable, full score
  }

  // --- Invoices / maintenance contracts as required (weight: 20 points) ---
  let docsScore = 0;
  const hasAssetScope = rules.imageRequired; // asset-related deals
  if (hasAssetScope) {
    totalRequired++;
    const docs = listing.documents || [];
    const hasInvoices = docs.some((d: any) => {
      const name = (d?.name || d?.type || "").toLowerCase();
      return name.includes("فاتور") || name.includes("invoice") || name.includes("فواتير");
    });
    const hasMaintenanceContracts = docs.some((d: any) => {
      const name = (d?.name || d?.type || "").toLowerCase();
      return name.includes("صيانة") || name.includes("maintenance") || name.includes("عقد صيانة");
    });

    if (hasInvoices && hasMaintenanceContracts) { docsScore = 20; requiredFilled++; }
    else if (hasInvoices || hasMaintenanceContracts) { docsScore = 10; }
    else { missing.push("فواتير الشراء أو عقود الصيانة"); }
  } else {
    docsScore = 20; // not applicable
  }

  // --- Optional fields (weight: 10 points) ---
  let optionalFilled = 0;
  for (const field of rules.optionalFields) {
    const value = (listing as any)[field];
    if (value !== null && value !== undefined && String(value).trim() !== "" && value !== 0) {
      optionalFilled++;
    }
  }
  const optionalScore = rules.optionalFields.length > 0
    ? (optionalFilled / rules.optionalFields.length) * 10
    : 10;

  // --- Inventory bonus (weight: 10 points) ---
  let inventoryScore = 0;
  if (hasAssetScope) {
    const invCount = listing.inventory?.length || 0;
    if (invCount >= 5) inventoryScore = 10;
    else if (invCount >= 1) inventoryScore = 5;
  } else {
    inventoryScore = 10;
  }

  const totalScore = Math.min(100, Math.round(requiredScore + photosScore + docsScore + optionalScore + inventoryScore));

  let level: TransparencyLevel;
  let label: string;

  if (totalScore >= 85) {
    level = "high";
    label = "شفافية عالية";
  } else if (totalScore >= 50) {
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
    totalRequired,
    filledRequired: requiredFilled,
  };
}

/**
 * Check if a specific field is relevant for a given deal type.
 * Kept for backward compatibility in other files.
 */
export function isFieldRelevant(dealType: string, fieldName: string): boolean {
  const rules = getRules(dealType);
  return !rules.hiddenFields.includes(fieldName);
}

/**
 * Get deal-type specific disclosure fields that should be shown.
 */
export function getRelevantDisclosureFields(dealType: string): string[] {
  const rules = getRules(dealType);
  return [...rules.requiredFields, ...rules.optionalFields];
}
