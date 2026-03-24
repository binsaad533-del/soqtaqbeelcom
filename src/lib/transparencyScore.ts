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

  // Only score required + optional (visible) fields
  const scoredFields = [...rules.requiredFields, ...rules.optionalFields];
  const missing: string[] = [];
  let filled = 0;

  for (const field of scoredFields) {
    const value = (listing as any)[field];
    if (value !== null && value !== undefined && String(value).trim() !== "" && value !== 0) {
      filled++;
    } else if (rules.requiredFields.includes(field)) {
      missing.push(FIELD_LABELS[field] || field);
    }
  }

  // Bonus points for having photos and inventory
  let bonusPoints = 0;
  let bonusTotal = 0;

  // Photos bonus (up to 15 points) — skip for CR-only
  if (rules.imageRequired || !rules.hiddenFields.includes("annual_rent")) {
    bonusTotal += 15;
    const photoCount = listing.photos ? Object.values(listing.photos).flat().length : 0;
    if (photoCount >= 6) bonusPoints += 15;
    else if (photoCount >= 3) bonusPoints += 10;
    else if (photoCount >= 1) bonusPoints += 5;
  }

  // Inventory bonus for asset-related deals (up to 10 points)
  if (rules.imageRequired) {
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

  const fieldScore = scoredFields.length > 0 ? (filled / scoredFields.length) * 70 : 70;
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
    totalRequired: rules.requiredFields.length,
    filledRequired: filled,
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
