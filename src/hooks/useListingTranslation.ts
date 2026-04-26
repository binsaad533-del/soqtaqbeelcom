import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type TranslatedFields = Record<string, string>;

// Must stay in sync with TRANSLATABLE_LISTING_FIELDS in
// supabase/functions/translate-listing-content/index.ts
const TRANSLATABLE_LISTING_FIELDS = [
  "title",
  "description",
  "city",
  "district",
  "business_activity",
  "lease_duration",
  "lease_paid_period",
  "lease_remaining",
  "liabilities",
  "municipality_license",
  "civil_defense_license",
  "surveillance_cameras",
  "overdue_rent",
  "overdue_salaries",
] as const;

/**
 * Translates a listing for the active UI language. Arabic returns the original.
 *
 * Error handling (aligned with useDealCheckTranslation):
 *   - 429 → React Query retries once after 2s; then falls back to AR silently
 *   - 402 → falls back to AR + one-time toast.info("الترجمة غير متاحة مؤقتاً")
 *   - 504 → falls back to AR silently
 *   - any other error → falls back to AR silently
 */
export function useListingTranslation<T extends { id?: string; inventory?: any } | null | undefined>(
  listing: T,
) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "ar";

  const enabled = !!listing?.id && language !== "ar";
  const quotaToastShownRef = useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["listing-translation", listing?.id, language],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("translate-listing-content", {
        body: { listing_id: listing!.id, target_language: language },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        const status = ctx?.status;
        if (status === 429) {
          throw Object.assign(new Error("rate_limited"), { code: "rate_limited", status });
        }
        if (status === 402) {
          if (!quotaToastShownRef.current) {
            quotaToastShownRef.current = true;
            toast.info("الترجمة غير متاحة مؤقتاً", { duration: 4000 });
          }
          throw Object.assign(new Error("quota_exceeded"), { code: "quota_exceeded", status });
        }
        if (status === 504) {
          throw Object.assign(new Error("timeout"), { code: "timeout", status });
        }
        throw error;
      }
      return (data?.translated || {}) as TranslatedFields;
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1h
    gcTime: 1000 * 60 * 60 * 24, // 24h
    retry: (failureCount, err) => {
      const code = (err as { code?: string })?.code;
      if (code === "rate_limited" && failureCount < 1) return true;
      return false;
    },
    retryDelay: 2000,
  });

  // No translation needed (Arabic or no listing) → return original
  if (!listing || !enabled) {
    return {
      translatedListing: listing,
      isTranslating: false,
      translationError: null as unknown,
    };
  }

  // Loading first translation OR failure → expose original (skeletons can rely on isTranslating)
  if (!data) {
    return {
      translatedListing: listing,
      isTranslating: isLoading,
      translationError: error,
    };
  }

  const original = listing as any;
  const inventory = Array.isArray(original.inventory) ? original.inventory : null;

  const mergedInventory = inventory
    ? inventory.map((item: any, idx: number) => {
        if (!item || typeof item !== "object") return item;
        return {
          ...item,
          name: data[`inventory.${idx}.name`] || item.name,
          details: data[`inventory.${idx}.details`] || item.details,
          description: data[`inventory.${idx}.description`] || item.description,
          category: data[`inventory.${idx}.category`] || item.category,
        };
      })
    : original.inventory;

  const translatedListing = {
    ...original,
    inventory: mergedInventory,
  } as any;

  for (const field of TRANSLATABLE_LISTING_FIELDS) {
    if (data[field]) translatedListing[field] = data[field];
  }

  return {
    translatedListing: translatedListing as T,
    isTranslating: false,
    translationError: null as unknown,
  };
}

export default useListingTranslation;
