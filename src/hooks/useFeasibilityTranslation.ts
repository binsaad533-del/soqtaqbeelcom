import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

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
 */
export function useFeasibilityTranslation<T extends Record<string, unknown> | null | undefined>(
  feasibilityId: string | null | undefined,
  studyData: T,
) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "ar";
  const enabled = !!feasibilityId && !!studyData && language !== "ar";

  const { data, isLoading, error } = useQuery({
    queryKey: ["feasibility-translation", feasibilityId, language],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("translate-ai-content", {
        body: {
          content_id: feasibilityId,
          content_type: "feasibility",
          target_language: language,
        },
      });
      if (error) throw error;
      return (data?.translated || {}) as TranslatedFields;
    },
    enabled,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
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
