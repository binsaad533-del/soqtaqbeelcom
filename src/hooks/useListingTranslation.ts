import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

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

export function useListingTranslation<T extends { id?: string; inventory?: any } | null | undefined>(
  listing: T,
) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "ar";

  const enabled = !!listing?.id && language !== "ar";

  const { data, isLoading, error } = useQuery({
    queryKey: ["listing-translation", listing?.id, language],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("translate-listing-content", {
        body: { listing_id: listing!.id, target_language: language },
      });
      if (error) throw error;
      return (data?.translated || {}) as TranslatedFields;
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1h
    gcTime: 1000 * 60 * 60 * 24, // 24h
    retry: 1,
  });

  // No translation needed (Arabic or no listing) → return original
  if (!listing || !enabled) {
    return {
      translatedListing: listing,
      isTranslating: false,
      translationError: null as unknown,
    };
  }

  // Loading first translation → still expose original (skeletons can rely on isTranslating)
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
