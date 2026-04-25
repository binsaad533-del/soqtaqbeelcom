// Edge Function: translate-ai-content
// Translates AI-generated analysis content (deal_check / feasibility) to target language with caching.
// The translation is stored in a JSONB `translations` column on the source row, keyed by language.
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

// Top-level scalar string fields per content type that should be translated.
// Array fields (strengths/risks/recommendations/missingInfo/negotiationGuidance) are handled as bullet arrays.
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

// marketComparison nested string fields
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

const FEASIBILITY_ARRAY_FIELDS = [
  "recommendations",
  "strengths",
  "risks",
  "opportunities",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { content_id, content_type, target_language } = body as {
      content_id?: string;
      content_type?: "deal_check" | "feasibility";
      target_language?: string;
    };

    if (
      !content_id ||
      !content_type ||
      !target_language ||
      !ALLOWED_LANGUAGES.has(target_language) ||
      !["deal_check", "feasibility"].includes(content_type)
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid params: content_id, content_type, valid target_language required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const tableName = content_type === "deal_check" ? "deal_checks" : "feasibility_studies";
    const dataColumn = content_type === "deal_check" ? "summary" : "study_data";

    const { data: row, error: rowErr } = await supabase
      .from(tableName)
      .select(`id, ${dataColumn}, translations, updated_at`)
      .eq("id", content_id)
      .maybeSingle();

    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: "Content not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceData = (row as any)[dataColumn];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingTranslations = ((row as any).translations || {}) as Record<string, any>;

    if (!sourceData || typeof sourceData !== "object") {
      return new Response(JSON.stringify({ translated: {}, from_cache: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute hash of source content
    const sourceHash = await hashString(JSON.stringify(sourceData));
    const cached = existingTranslations[target_language];
    if (cached && typeof cached === "object" && cached.__hash === sourceHash) {
      return new Response(
        JSON.stringify({ translated: cached.data || {}, from_cache: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build flat key/value map for translation
    const toTranslate: Record<string, string> = {};
    const STRING_FIELDS = content_type === "deal_check" ? DEAL_CHECK_STRING_FIELDS : FEASIBILITY_STRING_FIELDS;
    const ARRAY_FIELDS = content_type === "deal_check" ? DEAL_CHECK_ARRAY_FIELDS : FEASIBILITY_ARRAY_FIELDS;

    for (const field of STRING_FIELDS) {
      const v = sourceData[field];
      if (typeof v === "string" && v.trim().length > 0) {
        toTranslate[field] = v;
      }
    }

    for (const field of ARRAY_FIELDS) {
      const arr = sourceData[field];
      if (Array.isArray(arr)) {
        arr.forEach((item: unknown, idx: number) => {
          if (typeof item === "string" && item.trim().length > 0) {
            toTranslate[`${field}.${idx}`] = item;
          }
        });
      }
    }

    // Deal-check specific: marketComparison nested fields + assetBreakdown
    if (content_type === "deal_check") {
      const mc = sourceData.marketComparison;
      if (mc && typeof mc === "object") {
        for (const field of MARKET_COMPARISON_FIELDS) {
          const v = mc[field];
          if (typeof v === "string" && v.trim().length > 0) {
            toTranslate[`marketComparison.${field}`] = v;
          }
        }
        if (Array.isArray(mc.assetBreakdown)) {
          mc.assetBreakdown.forEach((item: any, idx: number) => {
            if (item && typeof item === "object") {
              for (const k of ["assetName", "marketRange", "sellerPrice", "verdict", "source"]) {
                const v = item[k];
                if (typeof v === "string" && v.trim().length > 0) {
                  toTranslate[`marketComparison.assetBreakdown.${idx}.${k}`] = v;
                }
              }
            }
          });
        }
      }
    }

    if (Object.keys(toTranslate).length === 0) {
      const empty: Record<string, string> = {};
      await persistTranslation(supabase, tableName, content_id, existingTranslations, target_language, empty, sourceHash);
      return new Response(JSON.stringify({ translated: empty, from_cache: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const translated = await translateWithGemini(toTranslate, target_language);

    await persistTranslation(supabase, tableName, content_id, existingTranslations, target_language, translated, sourceHash);

    return new Response(JSON.stringify({ translated, from_cache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("translate-ai-content error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function persistTranslation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tableName: string,
  contentId: string,
  existing: Record<string, unknown>,
  language: string,
  data: Record<string, string>,
  sourceHash: string,
) {
  const next = {
    ...existing,
    [language]: { __hash: sourceHash, data, updated_at: new Date().toISOString() },
  };
  const { error } = await supabase
    .from(tableName)
    .update({ translations: next })
    .eq("id", contentId);
  if (error) console.error("persistTranslation error:", error);
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
2. PRESERVE all numbers, currency amounts (SAR / ر.س / ﷼), measurements, percentages, and specifications.
3. Maintain a PROFESSIONAL evaluative tone — this is investment analysis, not casual content.
4. Use industry-standard business / financial / valuation terminology in ${langName}.
5. For Saudi/Arabic-specific city names, use standard romanization (الرياض → Riyadh, الطائف → Taif, etc.).
6. Keep the meaning, severity, and certainty of risk and strength statements intact — do not soften or strengthen.
7. For verdict / rating words ("جيد", "معقول", "مخاطر عالية" etc.), use the natural professional equivalent in ${langName}.
8. Return EXACTLY the same JSON keys as the input — do not add, remove, or rename any keys.
9. Output ONLY valid JSON. No markdown, no explanations, no code fences.`;

  const userContent = JSON.stringify(fields, null, 2);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (response.status === 429) throw new Error("Rate limit exceeded, please try again later");
  if (response.status === 402) throw new Error("AI credits exhausted, please add funds");
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty translation response");

  try {
    return JSON.parse(content);
  } catch {
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  }
}
