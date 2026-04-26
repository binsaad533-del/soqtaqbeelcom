import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type TranslatedFields = Record<string, string>;

const STRING_FIELDS = [
  "executive_summary",
  "executiveSummary",
  "summary",
  "recommendation",
  "verdict",
  "disclaimer",
];

const ARRAY_FIELDS = ["recommendations", "strengths", "risks", "opportunities"];

/**
 * Translates AI-generated feasibility study content to the active UI language.
 * Arabic → returns original; other languages → fetches and merges translations.
 *
 * Error handling: 429 retried once, 402 shows one-time toast, 504/other → silent AR fallback.
 */
export function useFeasibilityTranslation<T extends Record<string, unknown> | null | undefined>(
  listingId: string | null | undefined,
  studyData: T,
) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "ar";
  const enabled = !!listingId && !!studyData && language !== "ar";

  const quotaToastShownRef = useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["feasibility-translation", listingId, language],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("translate-ai-content", {
        body: {
          listing_id: listingId,
          content_type: "feasibility",
          target_language: language,
        },
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
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: (failureCount, err) => {
      const code = (err as { code?: string })?.code;
      if (code === "rate_limited" && failureCount < 1) return true;
      return false;
    },
    retryDelay: 2000,
  });

  if (!studyData || !enabled) {
    return {
      translatedStudyData: studyData,
      isTranslating: false,
      translationError: null as unknown,
    };
  }

  if (!data) {
    return {
      translatedStudyData: studyData,
      isTranslating: isLoading,
      translationError: error,
    };
  }

  const original = studyData as Record<string, unknown>;
  const result: Record<string, unknown> = { ...original };

  for (const field of STRING_FIELDS) {
    const v = data[field];
    if (typeof v === "string" && v.length > 0) result[field] = v;
  }

  for (const field of ARRAY_FIELDS) {
    const arr = original[field];
    if (Array.isArray(arr)) {
      result[field] = arr.map((item, idx) => {
        const tv = data[`${field}.${idx}`];
        return typeof tv === "string" && tv.length > 0 ? tv : item;
      });
    }
  }

  return {
    translatedStudyData: result as T,
    isTranslating: false,
    translationError: null as unknown,
  };
}

export default useFeasibilityTranslation;
