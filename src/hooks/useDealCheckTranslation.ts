import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

type TranslatedFields = Record<string, string>;

const STRING_FIELDS = [
  "dealOverview",
  "summary",
  "executiveSummary",
  "businessActivity",
  "assetAssessment",
  "locationAssessment",
  "competitionSnapshot",
  "operationalReadiness",
  "recommendation",
  "fairnessVerdict",
  "confidenceLevel",
  "rating",
];

const ARRAY_FIELDS = [
  "strengths",
  "risks",
  "recommendations",
  "missingInfo",
  "negotiationGuidance",
];

const MARKET_COMPARISON_STRING_FIELDS = [
  "matchQuality",
  "observedPriceRange",
  "marketPosition",
  "confidence",
  "details",
];

/**
 * Translates AI-generated deal_check content (and ai_trust_score) into the active UI language.
 * For Arabic, returns the original objects untouched.
 * For other languages, fetches translations via the translate-ai-content edge function and merges them.
 */
export function useDealCheckTranslation<T extends Record<string, unknown> | null | undefined>(
  listingId: string | null | undefined,
  analysis: T,
  trustScore?: Record<string, unknown> | null,
) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "ar";
  const enabled = !!listingId && (!!analysis || !!trustScore) && language !== "ar";

  const { data, isLoading, error } = useQuery({
    queryKey: ["deal-check-translation", listingId, language],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("translate-ai-content", {
        body: {
          listing_id: listingId,
          content_type: "deal_check",
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

  if (!enabled || !data) {
    return {
      translatedAnalysis: analysis,
      translatedTrustScore: trustScore ?? null,
      isTranslating: enabled && isLoading,
      translationError: enabled ? error : null,
    };
  }

  const merged = analysis ? mergeTranslation(analysis as Record<string, unknown>, data) : analysis;
  const mergedTrust = trustScore ? mergeTrustScoreTranslation(trustScore, data) : trustScore ?? null;
  return {
    translatedAnalysis: merged as T,
    translatedTrustScore: mergedTrust,
    isTranslating: false,
    translationError: null as unknown,
  };
}

function mergeTranslation(
  original: Record<string, unknown>,
  translated: TranslatedFields,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...original };

  for (const field of STRING_FIELDS) {
    const v = translated[field];
    if (typeof v === "string" && v.length > 0) {
      result[field] = v;
    }
  }

  for (const field of ARRAY_FIELDS) {
    const arr = original[field];
    if (Array.isArray(arr)) {
      result[field] = arr.map((item, idx) => {
        const tv = translated[`${field}.${idx}`];
        return typeof tv === "string" && tv.length > 0 ? tv : item;
      });
    }
  }

  // marketComparison
  const mc = original.marketComparison;
  if (mc && typeof mc === "object") {
    const mcOrig = mc as Record<string, unknown>;
    const mcMerged: Record<string, unknown> = { ...mcOrig };
    for (const field of MARKET_COMPARISON_STRING_FIELDS) {
      const tv = translated[`marketComparison.${field}`];
      if (typeof tv === "string" && tv.length > 0) {
        mcMerged[field] = tv;
      }
    }
    if (Array.isArray(mcOrig.assetBreakdown)) {
      mcMerged.assetBreakdown = (mcOrig.assetBreakdown as Array<Record<string, unknown>>).map(
        (item, idx) => {
          if (!item || typeof item !== "object") return item;
          const next = { ...item };
          for (const k of ["assetName", "marketRange", "sellerPrice", "verdict", "source"]) {
            const tv = translated[`marketComparison.assetBreakdown.${idx}.${k}`];
            if (typeof tv === "string" && tv.length > 0) next[k] = tv;
          }
          return next;
        },
      );
    }
    result.marketComparison = mcMerged;
  }

  return result;
}

const TRUST_STRING_FIELDS = ["summary", "level", "verdict"];
const TRUST_ARRAY_FIELDS = ["strengths", "weaknesses", "warnings", "recommendations"];

function mergeTrustScoreTranslation(
  original: Record<string, unknown>,
  translated: TranslatedFields,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...original };
  for (const f of TRUST_STRING_FIELDS) {
    const tv = translated[`trustScore.${f}`];
    if (typeof tv === "string" && tv.length > 0) result[f] = tv;
  }
  for (const f of TRUST_ARRAY_FIELDS) {
    const arr = original[f];
    if (Array.isArray(arr)) {
      result[f] = arr.map((item, idx) => {
        const tv = translated[`trustScore.${f}.${idx}`];
        return typeof tv === "string" && tv.length > 0 ? tv : item;
      });
    }
  }
  return result;
}

export default useDealCheckTranslation;
