// Edge Function: translate-listing-content
// Translates Arabic listing content to target language with caching
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TRANSLATABLE_INVENTORY_FIELDS = ["name", "details", "description", "category"];

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  zh: "Simplified Chinese",
  hi: "Hindi",
  ur: "Urdu",
  bn: "Bengali",
};

const ALLOWED_LANGUAGES = new Set(["en", "zh", "hi", "ur", "bn"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { listing_id, target_language } = body as {
      listing_id?: string;
      target_language?: string;
    };

    if (!listing_id || !target_language || !ALLOWED_LANGUAGES.has(target_language)) {
      return new Response(
        JSON.stringify({ error: "Invalid params: listing_id and valid target_language required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Read the listing
    const { data: listing, error: listingErr } = await supabase
      .from("listings")
      .select("id, title, description, city, district, inventory, updated_at")
      .eq("id", listing_id)
      .maybeSingle();

    if (listingErr || !listing) {
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Compute hash of source content
    const sourceContent = JSON.stringify({
      title: listing.title ?? "",
      description: listing.description ?? "",
      city: listing.city ?? "",
      district: listing.district ?? "",
      inventory: listing.inventory ?? [],
    });
    const sourceHash = await hashString(sourceContent);

    // 3. Cache lookup
    const { data: cached } = await supabase
      .from("listing_translations")
      .select("translated_data, source_hash")
      .eq("listing_id", listing_id)
      .eq("language", target_language)
      .maybeSingle();

    if (cached && cached.source_hash === sourceHash) {
      return new Response(
        JSON.stringify({ translated: cached.translated_data, from_cache: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Build translation payload
    const toTranslate: Record<string, string> = {};
    if (listing.title && typeof listing.title === "string") toTranslate.title = listing.title;
    if (listing.description && typeof listing.description === "string") {
      toTranslate.description = listing.description;
    }
    if (listing.city && typeof listing.city === "string") toTranslate.city = listing.city;
    if (listing.district && typeof listing.district === "string") {
      toTranslate.district = listing.district;
    }

    const inventory = Array.isArray(listing.inventory) ? listing.inventory : [];
    inventory.forEach((item: any, idx: number) => {
      if (!item || typeof item !== "object") return;
      TRANSLATABLE_INVENTORY_FIELDS.forEach((field) => {
        const val = item[field];
        if (val && typeof val === "string" && val.trim().length > 0) {
          toTranslate[`inventory.${idx}.${field}`] = val;
        }
      });
    });

    if (Object.keys(toTranslate).length === 0) {
      const empty: Record<string, string> = {};
      await supabase.from("listing_translations").upsert(
        {
          listing_id,
          language: target_language,
          translated_data: empty,
          source_hash: sourceHash,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "listing_id,language" },
      );
      return new Response(JSON.stringify({ translated: empty, from_cache: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Call Gemini for translation
    const translated = await translateWithGemini(toTranslate, target_language);

    // 6. Persist to cache
    const { error: upsertErr } = await supabase.from("listing_translations").upsert(
      {
        listing_id,
        language: target_language,
        translated_data: translated,
        source_hash: sourceHash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "listing_id,language" },
    );

    if (upsertErr) {
      console.error("Cache upsert error:", upsertErr);
    }

    return new Response(JSON.stringify({ translated, from_cache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Translation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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

  const systemPrompt = `You are a professional translator specializing in business marketplace content for the Saudi Arabian market.

Translate the following Arabic business listing content to ${langName}.

CRITICAL RULES:
1. PRESERVE all brand names, model numbers, and technical codes EXACTLY as written (e.g., "HUAHUA SKG-812M", "BBOSIICH 2.0", "ROUST/LONGMA")
2. PRESERVE all numbers, measurements, and specifications (e.g., "1500*3000", "9 kW", "24000 RPM")
3. Use INDUSTRY-STANDARD terminology for machinery, equipment, and business terms
4. For Saudi/Arabic specific terms, use the closest equivalent in ${langName}
5. Keep the translation natural and professional, not literal
6. Maintain the same level of detail as the original
7. For city names, use the standard romanization (e.g., "الطائف" → "Taif", "الرياض" → "Riyadh")
8. Return EXACTLY the same JSON keys as the input — do not add, remove, or rename any keys

Return ONLY a valid JSON object with the same keys, where values are the translations. No markdown, no explanations, no code fences.`;

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

  if (response.status === 429) {
    throw new Error("Rate limit exceeded, please try again later");
  }
  if (response.status === 402) {
    throw new Error("AI credits exhausted, please add funds");
  }
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
    // Fallback: strip code fences
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  }
}
