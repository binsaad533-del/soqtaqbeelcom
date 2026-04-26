import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { InventoryItem, DedupAction } from "@/pages/create-listing/types";

interface Input {
  analysisSummary: string | null | undefined;
  dedupActions: DedupAction[];
  inventory: InventoryItem[];
}

interface Output {
  analysisSummary: string;
  dedupActions: DedupAction[];
  inventory: InventoryItem[];
  isTranslating: boolean;
  translationError: unknown;
}

/**
 * Returns true for inventory items that came from the AI (analyze-inventory),
 * not items added/edited manually or extracted from a file row by id-prefix convention.
 * Convention used in CreateListingStep3 / CreateListingPage:
 *   - "manual-..." → user-added
 *   - "file-..."   → extracted from a single row of an Excel/CSV file
 */
const isAiDetectedItem = (item: InventoryItem) => {
  if (!item.id) return false;
  if (item.id.startsWith("manual-")) return false;
  if (item.id.startsWith("file-")) return false;
  if (item.confidence !== "high" && item.confidence !== "medium") return false;
  return true;
};

/**
 * Translates inventory analysis output from analyze-inventory (analysisSummary,
 * dedupActions[].description, inventory[].name, inventory[].detectionNote) into
 * the active UI language. Arabic returns the original objects untouched.
 *
 * - Caches by (language + content hash) via React Query
 * - On 429: retries once after the suggested delay (handled by React Query retry)
 * - On 402 / 504 / other failures: silently falls back to the original Arabic
 */
export function useInventoryAnalysisTranslation(input: Input): Output {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "ar";
  const isArabic = language === "ar";

  // Build a stable payload — only AI-detected items, only translatable strings.
  const { payload, indexMap } = useMemo(() => {
    const p: Record<string, string> = {};
    const idx: { type: "summary" | "dedup" | "name" | "note"; itemId?: string; arrayIdx?: number }[] = [];

    if (input.analysisSummary && input.analysisSummary.trim().length > 0) {
      p["analysisSummary"] = input.analysisSummary;
      idx.push({ type: "summary" });
    }

    input.dedupActions.forEach((action, i) => {
      if (action?.description && action.description.trim().length > 0) {
        p[`dedup.${i}`] = action.description;
        idx.push({ type: "dedup", arrayIdx: i });
      }
    });

    input.inventory.forEach((item) => {
      if (!isAiDetectedItem(item)) return;
      if (item.name && item.name.trim().length > 0) {
        p[`name.${item.id}`] = item.name;
        idx.push({ type: "name", itemId: item.id });
      }
      if (item.detectionNote && item.detectionNote.trim().length > 0) {
        p[`note.${item.id}`] = item.detectionNote;
        idx.push({ type: "note", itemId: item.id });
      }
    });

    return { payload: p, indexMap: idx };
  }, [input.analysisSummary, input.dedupActions, input.inventory]);

  // Stable cache key: language + sorted-keys + sorted-values content
  const payloadHash = useMemo(() => {
    const keys = Object.keys(payload).sort();
    return keys.map((k) => `${k}=${payload[k]}`).join("||");
  }, [payload]);

  const hasContent = Object.keys(payload).length > 0;
  const enabled = !isArabic && hasContent;

  // Track soft-error toast deduplication (avoid spamming on every render)
  const quotaToastShownRef = useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["inventory-analysis-translation", language, payloadHash],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("translate-ai-content", {
        body: {
          content_type: "inline",
          target_language: language,
          payload,
        },
      });

      if (error) {
        // supabase.functions.invoke wraps non-2xx as FunctionsHttpError; surface a structured shape
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

      return (data?.translated || {}) as Record<string, string>;
    },
    enabled,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: (failureCount, err) => {
      const code = (err as { code?: string })?.code;
      // Retry once on rate_limited; never retry on quota / timeout / unknown
      if (code === "rate_limited" && failureCount < 1) return true;
      return false;
    },
    retryDelay: 2000,
  });

  // Build merged output. If no translation yet (still loading or failed), return originals.
  const merged = useMemo<Output>(() => {
    if (isArabic || !hasContent) {
      return {
        analysisSummary: input.analysisSummary || "",
        dedupActions: input.dedupActions,
        inventory: input.inventory,
        isTranslating: false,
        translationError: null,
      };
    }

    if (!data) {
      return {
        analysisSummary: input.analysisSummary || "",
        dedupActions: input.dedupActions,
        inventory: input.inventory,
        isTranslating: isLoading,
        translationError: error,
      };
    }

    const translatedSummary =
      typeof data["analysisSummary"] === "string" && data["analysisSummary"].length > 0
        ? data["analysisSummary"]
        : input.analysisSummary || "";

    const translatedDedup = input.dedupActions.map((action, i) => {
      const tv = data[`dedup.${i}`];
      return typeof tv === "string" && tv.length > 0 ? { ...action, description: tv } : action;
    });

    const translatedInventory = input.inventory.map((item) => {
      if (!isAiDetectedItem(item)) return item;
      const next = { ...item };
      const tName = data[`name.${item.id}`];
      const tNote = data[`note.${item.id}`];
      if (typeof tName === "string" && tName.length > 0) next.name = tName;
      if (typeof tNote === "string" && tNote.length > 0) next.detectionNote = tNote;
      return next;
    });

    return {
      analysisSummary: translatedSummary,
      dedupActions: translatedDedup,
      inventory: translatedInventory,
      isTranslating: false,
      translationError: null,
    };
    // We intentionally avoid depending on indexMap (derived from inputs already)
  }, [data, error, hasContent, input.analysisSummary, input.dedupActions, input.inventory, isArabic, isLoading]);

  // suppress unused warning
  void indexMap;
  return merged;
}

export default useInventoryAnalysisTranslation;
