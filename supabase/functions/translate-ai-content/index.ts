// Edge Function: translate-ai-content
// Translates AI-generated analysis content (deal_check / feasibility) cached on listings.ai_analysis_cache.
// Translations are persisted under listings.ai_analysis_cache.translations[language].
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_LANGUAGES = new Set(["en", "zh", "hi", "ur", "bn"]);

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  zh: "Simplified Chinese",
  hi: "Hindi",
  ur: "Urdu",
  bn: "Bengali",
};

const DEAL_CHECK_STRING_FIELDS = [
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
const DEAL_CHECK_ARRAY_FIELDS = [
  "strengths",
  "risks",
  "recommendations",
  "missingInfo",
  "negotiationGuidance",
];
const MARKET_COMPARISON_FIELDS = [
  "matchQuality",
  "observedPriceRange",
  "marketPosition",
  "confidence",
  "details",
];

const FEASIBILITY_STRING_FIELDS = [
  "executive_summary",
  "executiveSummary",
  "summary",
  "recommendation",
  "verdict",
  "disclaimer",
];
const FEASIBILITY_ARRAY_FIELDS = ["recommendations", "strengths", "risks", "opportunities"];

// Custom error class so we can map AI-gateway HTTP statuses → outer HTTP statuses
class TranslationError extends Error {
  constructor(public code: "rate_limited" | "quota_exceeded" | "timeout" | "unknown", message: string, public retryAfterMs?: number) {
    super(message);
  }
}

const TRANSLATION_TIMEOUT_MS = 30_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { listing_id, content_type, target_language, payload } = body as {
      listing_id?: string;
      content_type?: "deal_check" | "feasibility" | "inline";
      target_language?: string;
      payload?: Record<string, string>;
    };

    if (
      !content_type ||
      !target_language ||
      !ALLOWED_LANGUAGES.has(target_language) ||
      !["deal_check", "feasibility", "inline"].includes(content_type)
    ) {
      return jsonResponse({ error: "Invalid params" }, 400);
    }

    // inline mode: translate an arbitrary flat string→string map without any DB lookup or persistence.
    if (content_type === "inline") {
      if (!payload || typeof payload !== "object") {
        return jsonResponse({ error: "Missing payload" }, 400);
      }
      // Filter out empty / non-string values
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(payload)) {
        if (typeof v === "string" && v.trim().length > 0) clean[k] = v;
      }
      if (Object.keys(clean).length === 0) {
        return jsonResponse({ translated: {}, from_cache: false });
      }
      try {
        const translated = await translateWithGemini(clean, target_language);
        return jsonResponse({ translated, from_cache: false });
      } catch (err) {
        return mapTranslationError(err);
      }
    }

    if (!listing_id) {
      return jsonResponse({ error: "Missing listing_id" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    try {
      if (content_type === "deal_check") {
        return await handleDealCheck(supabase, listing_id, target_language);
      } else {
        return await handleFeasibility(supabase, listing_id, target_language);
      }
    } catch (err) {
      return mapTranslationError(err);
    }
  } catch (error) {
    console.error("translate-ai-content error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});

function mapTranslationError(err: unknown): Response {
  if (err instanceof TranslationError) {
    if (err.code === "rate_limited") {
      return jsonResponse({ error: "rate_limited", retry_after_ms: err.retryAfterMs ?? 2000 }, 429);
    }
    if (err.code === "quota_exceeded") {
      return jsonResponse({ error: "quota_exceeded" }, 402);
    }
    if (err.code === "timeout") {
      return jsonResponse({ error: "timeout" }, 504);
    }
  }
  console.error("translate-ai-content unmapped error:", err);
  const message = err instanceof Error ? err.message : "Unknown error";
  return jsonResponse({ error: message }, 500);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleDealCheck(supabase: any, listingId: string, lang: string) {
  const { data: row, error } = await supabase
    .from("listings")
    .select("id, ai_analysis_cache, ai_structure_validation, ai_trust_score")
    .eq("id", listingId)
    .maybeSingle();

  if (error || !row) {
    return jsonResponse({ error: "Listing not found" }, 404);
  }

  const cache = (row.ai_analysis_cache && typeof row.ai_analysis_cache === "object")
    ? row.ai_analysis_cache as Record<string, unknown>
    : {};
  const dealCheck = (cache.dealCheck && typeof cache.dealCheck === "object")
    ? cache.dealCheck as Record<string, unknown>
    : (row.ai_structure_validation && typeof row.ai_structure_validation === "object"
      ? row.ai_structure_validation as Record<string, unknown>
      : null);

  const trustScore = (row.ai_trust_score && typeof row.ai_trust_score === "object")
    ? row.ai_trust_score as Record<string, unknown>
    : null;

  if (!dealCheck && !trustScore) {
    return jsonResponse({ translated: {}, from_cache: false });
  }

  // Combine dealCheck + trustScore for hashing & translation
  const combinedSource = { dealCheck, trustScore };
  const sourceHash = await hashString(JSON.stringify(combinedSource));
  const translations = (cache.translations && typeof cache.translations === "object")
    ? cache.translations as Record<string, any>
    : {};
  const cached = translations[lang];
  if (cached && typeof cached === "object" && cached.__hash === sourceHash) {
    return jsonResponse({ translated: cached.data || {}, from_cache: true });
  }

  const toTranslate: Record<string, string> = {};
  if (dealCheck) Object.assign(toTranslate, buildDealCheckPayload(dealCheck));
  if (trustScore) Object.assign(toTranslate, buildTrustScorePayload(trustScore));

  if (Object.keys(toTranslate).length === 0) {
    await persistListingTranslation(supabase, listingId, cache, translations, lang, {}, sourceHash);
    return jsonResponse({ translated: {}, from_cache: false });
  }

  const translated = await translateWithGemini(toTranslate, lang);
  await persistListingTranslation(supabase, listingId, cache, translations, lang, translated, sourceHash);
  return jsonResponse({ translated, from_cache: false });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleFeasibility(supabase: any, listingId: string, lang: string) {
  const { data: row, error } = await supabase
    .from("feasibility_studies")
    .select("id, study_data, translations")
    .eq("listing_id", listingId)
    .maybeSingle();

  if (error || !row) {
    return jsonResponse({ translated: {}, from_cache: false });
  }

  const studyData = row.study_data && typeof row.study_data === "object"
    ? row.study_data as Record<string, unknown>
    : null;
  if (!studyData) {
    return jsonResponse({ translated: {}, from_cache: false });
  }

  const sourceHash = await hashString(JSON.stringify(studyData));
  const translations = (row.translations && typeof row.translations === "object")
    ? row.translations as Record<string, any>
    : {};
  const cached = translations[lang];
  if (cached && typeof cached === "object" && cached.__hash === sourceHash) {
    return jsonResponse({ translated: cached.data || {}, from_cache: true });
  }

  const toTranslate = buildFeasibilityPayload(studyData);
  if (Object.keys(toTranslate).length === 0) {
    const next = { ...translations, [lang]: { __hash: sourceHash, data: {}, updated_at: new Date().toISOString() } };
    await supabase.from("feasibility_studies").update({ translations: next }).eq("id", row.id);
    return jsonResponse({ translated: {}, from_cache: false });
  }

  const translated = await translateWithGemini(toTranslate, lang);
  const next = { ...translations, [lang]: { __hash: sourceHash, data: translated, updated_at: new Date().toISOString() } };
  await supabase.from("feasibility_studies").update({ translations: next }).eq("id", row.id);
  return jsonResponse({ translated, from_cache: false });
}

function buildDealCheckPayload(dealCheck: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of DEAL_CHECK_STRING_FIELDS) {
    const v = dealCheck[f];
    if (typeof v === "string" && v.trim().length > 0) out[f] = v;
  }
  for (const f of DEAL_CHECK_ARRAY_FIELDS) {
    const arr = dealCheck[f];
    if (Array.isArray(arr)) {
      arr.forEach((item, idx) => {
        if (typeof item === "string" && item.trim().length > 0) out[`${f}.${idx}`] = item;
      });
    }
  }
  const mc = dealCheck.marketComparison;
  if (mc && typeof mc === "object") {
    const mcObj = mc as Record<string, unknown>;
    for (const f of MARKET_COMPARISON_FIELDS) {
      const v = mcObj[f];
      if (typeof v === "string" && v.trim().length > 0) out[`marketComparison.${f}`] = v;
    }
    if (Array.isArray(mcObj.assetBreakdown)) {
      mcObj.assetBreakdown.forEach((item: any, idx: number) => {
        if (item && typeof item === "object") {
          for (const k of ["assetName", "marketRange", "sellerPrice", "verdict", "source"]) {
            const v = item[k];
            if (typeof v === "string" && v.trim().length > 0) out[`marketComparison.assetBreakdown.${idx}.${k}`] = v;
          }
        }
      });
    }
  }
  return out;
}

const TRUST_SCORE_STRING_FIELDS = ["summary", "level", "verdict"];
const TRUST_SCORE_ARRAY_FIELDS = ["strengths", "weaknesses", "warnings", "recommendations"];

function buildTrustScorePayload(trustScore: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of TRUST_SCORE_STRING_FIELDS) {
    const v = trustScore[f];
    if (typeof v === "string" && v.trim().length > 0) out[`trustScore.${f}`] = v;
  }
  for (const f of TRUST_SCORE_ARRAY_FIELDS) {
    const arr = trustScore[f];
    if (Array.isArray(arr)) {
      arr.forEach((item, idx) => {
        if (typeof item === "string" && item.trim().length > 0) out[`trustScore.${f}.${idx}`] = item;
      });
    }
  }
  return out;
}

function buildFeasibilityPayload(studyData: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of FEASIBILITY_STRING_FIELDS) {
    const v = studyData[f];
    if (typeof v === "string" && v.trim().length > 0) out[f] = v;
  }
  for (const f of FEASIBILITY_ARRAY_FIELDS) {
    const arr = studyData[f];
    if (Array.isArray(arr)) {
      arr.forEach((item, idx) => {
        if (typeof item === "string" && item.trim().length > 0) out[`${f}.${idx}`] = item;
      });
    }
  }
  return out;
}

async function persistListingTranslation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  listingId: string,
  cache: Record<string, unknown>,
  translations: Record<string, any>,
  lang: string,
  data: Record<string, string>,
  sourceHash: string,
) {
  const next = {
    ...cache,
    translations: {
      ...translations,
      [lang]: { __hash: sourceHash, data, updated_at: new Date().toISOString() },
    },
  };
  const { error } = await supabase.from("listings").update({ ai_analysis_cache: next }).eq("id", listingId);
  if (error) console.error("persistListingTranslation error:", error);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function translateWithGemini(
  fields: Record<string, string>,
  targetLang: string,
): Promise<Record<string, string>> {
  const langName = LANGUAGE_NAMES[targetLang];
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const systemPrompt = `You are a professional translator specializing in business analysis and investment evaluation reports for the Saudi Arabian market.

Translate the following Arabic AI-generated business deal analysis content to ${langName}.

CRITICAL RULES:
1. PRESERVE all brand names, model numbers, technical codes, and company names EXACTLY as written.
2. PRESERVE all numbers, currency amounts (SAR / ر.س / ﷼), measurements, percentages.
3. Maintain a PROFESSIONAL evaluative tone — this is investment analysis.
4. Use industry-standard business / financial / valuation terminology in ${langName}.
5. For Saudi/Arabic city names, use standard romanization (الرياض → Riyadh, الطائف → Taif).
6. Keep the meaning, severity, and certainty of risk and strength statements intact.
7. For verdict / rating words ("جيد", "معقول", "مخاطر عالية"), use natural professional equivalents.
8. Return EXACTLY the same JSON keys as the input — do not add, remove, or rename keys.
9. Output ONLY valid JSON. No markdown, no code fences.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(fields, null, 2) },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new TranslationError("timeout", "Translation request timed out");
    }
    throw new TranslationError("unknown", (err as Error)?.message ?? "Network error");
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 2000;
    throw new TranslationError("rate_limited", "Rate limit exceeded", retryAfterMs);
  }
  if (response.status === 402) {
    throw new TranslationError("quota_exceeded", "AI credits exhausted");
  }
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new TranslationError("unknown", `Gemini API error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  if (!content) throw new TranslationError("unknown", "Empty translation response");

  try {
    return JSON.parse(content);
  } catch {
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  }
}
