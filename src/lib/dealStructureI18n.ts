// ============================================================
// dealStructureI18n — runtime translation helpers for deal-structure
// content defined statically in dealStructureConfig.ts.
//
// Strategy:
//  - dealStructureConfig.ts stays the single source of truth (Arabic).
//  - This file looks up translations from i18n locale files using:
//      createListing.dealItems.{dealId}.{category}.{index}
//  - If the key is missing for the active language, the original
//    Arabic string is returned (full backward compatibility).
//  - Aliases (e.g. "full_transfer" -> "full_takeover") are resolved
//    so DB rows that store the legacy ID still translate correctly.
// ============================================================

import type { TFunction } from "i18next";
import { DEAL_TYPE_MAP, type DealTypeConfig } from "@/lib/dealStructureConfig";

export type DealItemCategory =
  | "includes"
  | "excludes"
  | "mandatoryDisclosures"
  | "cautionNotes";

const ALIAS_TO_CANONICAL: Record<string, string> = {
  full_transfer: "full_takeover",
  full: "full_takeover",
  assets_operating: "assets_setup",
};

function canonical(dealId: string): string {
  return ALIAS_TO_CANONICAL[dealId] ?? dealId;
}

/**
 * Translate a single deal-structure item (includes/excludes/disclosure/caution)
 * by looking it up by index inside its parent deal type.
 *
 * Returns the original Arabic `fallback` if no translation exists — this keeps
 * backward compatibility with any data persisted before localization.
 */
export function tDealItem(
  t: TFunction,
  dealId: string,
  category: DealItemCategory,
  index: number,
  fallback: string,
): string {
  const id = canonical(dealId);
  const key = `createListing.dealItems.${id}.${category}.${index}`;
  const translated = t(key, { defaultValue: fallback });
  // i18next can return the key itself when missing → guard against it.
  return translated && translated !== key ? translated : fallback;
}

/**
 * Translate every entry in a deal category, preserving order and original
 * Arabic strings as fallback for any missing index.
 */
export function tDealItems(
  t: TFunction,
  dealId: string,
  category: DealItemCategory,
  items: string[],
): string[] {
  return items.map((item, i) => tDealItem(t, dealId, category, i, item));
}

/**
 * Convenience: translated copy of a full DealTypeConfig (label + description
 * already handled elsewhere; here we localize the four list categories).
 * The returned object keeps the original `id`, `label`, `desc` untouched.
 */
export function localizeDealConfig(
  t: TFunction,
  config: DealTypeConfig,
): DealTypeConfig {
  return {
    ...config,
    includes: tDealItems(t, config.id, "includes", config.includes),
    excludes: tDealItems(t, config.id, "excludes", config.excludes),
    mandatoryDisclosures: tDealItems(
      t,
      config.id,
      "mandatoryDisclosures",
      config.mandatoryDisclosures,
    ),
    cautionNotes: tDealItems(t, config.id, "cautionNotes", config.cautionNotes),
  };
}

/**
 * Translate an arbitrary AR item string by searching every deal_type's
 * arrays for a match (used by ListingDetailsPage where stored data may
 * surface items without their original index/category context).
 */
export function tDealItemByValue(
  t: TFunction,
  value: string,
): string {
  if (!value) return value;
  for (const config of Object.values(DEAL_TYPE_MAP)) {
    const cats: DealItemCategory[] = [
      "includes",
      "excludes",
      "mandatoryDisclosures",
      "cautionNotes",
    ];
    for (const cat of cats) {
      const idx = config[cat].indexOf(value);
      if (idx !== -1) {
        return tDealItem(t, config.id, cat, idx, value);
      }
    }
  }
  return value;
}
