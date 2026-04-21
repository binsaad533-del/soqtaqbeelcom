const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLACKLISTED_DOMAINS = [
  "ye.opensooq.com", "om.opensooq.com", "eg.opensooq.com",
  "jo.opensooq.com", "lb.opensooq.com", "iq.opensooq.com",
  "sy.opensooq.com", "ae.dubizzle.com", "uae.dubizzle.com",
  "qa.opensooq.com", "bh.opensooq.com", "kw.opensooq.com",
  "ly.opensooq.com", "ps.opensooq.com", "dz.opensooq.com",
  "ma.opensooq.com", "tn.opensooq.com", "sd.opensooq.com",
];

const NON_COMMERCIAL_DOMAINS = [
  "instagram.com", "facebook.com", "youtube.com", "tiktok.com",
  "twitter.com", "x.com", "linkedin.com", "pinterest.com",
];

const INDUSTRIAL_FALLBACK_DOMAINS = [
  "alibaba.com", "made-in-china.com", "arabic.alibaba.com",
  "sa.made-in-china.com", "ar.made-in-china.com",
];

const TEST_ASSETS = [
  { name: "منشار دائري ماكيتا 5800NB", brand: "Makita", model: "5800NB", condition: "مستعمل", category: "power_tool" },
  { name: "دريل Bosch GSB 570", brand: "Bosch", model: "GSB 570", condition: "جيد", category: "power_tool" },
  { name: "ماكينة CNC Sign-CNC A2-1530", brand: "Sign-CNC", model: "A2-1530", condition: "جيد", category: "industrial_machine" },
  { name: "ضاغط هواء أحمر", brand: null, model: null, condition: "جيد", category: "generic_equipment" },
  { name: "سيارة بيك أب بيضاء", brand: null, model: null, condition: "مستعمل", category: "vehicle" },
  { name: "ضاغط هواء صناعي 30 حصان سكرو", brand: null, model: null, condition: "جيد", category: "industrial_equipment" },
  { name: "ماكينة CNC للخشب صينية راوتر", brand: null, model: null, condition: "جيد", category: "industrial_machine" },
  { name: "لوحة تحكم لآلة خياطة صناعية", brand: null, model: null, condition: "جيد", category: "unclear" },
];

function isVagueAsset(asset: any): boolean {
  if (asset.brand && asset.model) return false;
  const name = asset.name.toLowerCase();
  const specificTerms = ["حصان", "hp", "cnc", "كيلو واط", "kw", "لتر", "liter", "مم", "mm", "سكرو", "راوتر", "صناعي"];
  return !specificTerms.some(t => name.includes(t));
}

function buildSearchQueries(asset: any) {
  const queries = [];
  const hasModel = asset.model && asset.brand;
  if (hasModel) {
    queries.push({ query: `${asset.brand} ${asset.model} سعر السعودية`, type: "new_ksa" });
    queries.push({ query: `${asset.brand} ${asset.model} مستعمل السعودية`, type: "used_ksa" });
  } else {
    queries.push({ query: `${asset.name} سعر السعودية`, type: "new_ksa" });
    queries.push({ query: `${asset.name} مستعمل السعودية`, type: "used_ksa" });
  }
  if (asset.category === "industrial_machine" || asset.category === "industrial_equipment") {
    const q = hasModel ? `${asset.brand} ${asset.model}` : asset.name;
    queries.push({ query: `${q} industrial machinery price USD`, type: "alibaba_fallback" });
  }
  return queries;
}

async function searchSerper(query: string, apiKey: string) {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: "sa", hl: "ar", num: 10 }),
  });
  if (!response.ok) return { error: `HTTP ${response.status}`, query };
  return await response.json();
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return "unknown"; }
}

function basicFilter(organic: any[], queryType: string) {
  const candidates = [];
  for (const item of organic) {
    const domain = extractDomain(item.link || "");
    if (BLACKLISTED_DOMAINS.some(d => domain.includes(d))) continue;
    if (NON_COMMERCIAL_DOMAINS.some(d => domain.includes(d))) continue;
    if (queryType === "alibaba_fallback") {
      const isIndustrial = INDUSTRIAL_FALLBACK_DOMAINS.some(d => domain.includes(d));
      if (!isIndustrial) continue;
    }
    candidates.push({
      title: item.title || "",
      snippet: item.snippet || "",
      url: item.link || "",
      domain,
    });
  }
  return candidates;
}

async function arbitrateWithGemini(
  asset: any,
  candidates: any[],
  queryType: string,
  apiKey: string
) {
  if (candidates.length === 0) {
    return { prices: [], reasoning: "لا توجد نتائج للفحص", raw_response: null };
  }

  const candidatesText = candidates.map((c, i) =>
    `[${i + 1}] الموقع: ${c.domain}\n    العنوان: ${c.title}\n    النص: ${c.snippet}`
  ).join("\n\n");

  const isAlibaba = queryType === "alibaba_fallback";
  const currencyNote = isAlibaba 
    ? "ملاحظة: النتائج من Alibaba/Made-in-China وأسعارها بالدولار. حوّل للريال بضرب 3.75."
    : "ملاحظة: النتائج من السوق السعودي. قبول فقط الأسعار بالريال السعودي (ر.س، SAR، SR).";

  const systemPrompt = `أنت محكّم أسعار للسوق السعودي. مهمتك الوحيدة: اختيار الأسعار الموثوقة من نتائج بحث معطاة لك.

**قواعد صارمة غير قابلة للكسر:**
1. **ممنوع اختراع أو تقدير أسعار من ذاكرتك**. استخرج الأسعار من النصوص المعطاة فقط. إذا لم تجد سعراً صريحاً في النص، لا تضفه.
2. اقبل الأسعار فقط إذا:
   - للمنتج المطلوب بالضبط (ليس منتج مشابه أو مختلف الموديل)
   - واضح أنها من السوق السعودي (ليس يمني/عماني/أردني إلخ)
   - معقولة (ليست رمزية أو إعلان مقطوع)
3. إذا رأيت كلمة "قطر" في النص، ميّز:
   - "قطر الدولة" → رفض النتيجة
   - "قطر الدائرة/الأنبوب" (قياس) → اقبل
4. إذا رأيت كلمة "عمان":
   - "سلطنة عُمان/مسقط" → رفض
   - "عمّان" (الأردن) → رفض
   - لو مذكور كاسم منتج أو سياق مختلف → استخدم حكمك
5. إذا لم تجد أي نتيجة موثوقة، أرجع مصفوفة فارغة. **الفراغ أفضل من الاختراع.**
6. كل سعر تختاره يجب أن يرتبط برقم نتيجة [1..N] من القائمة المعطاة. لا ترجع أسعاراً من غير القائمة.

${currencyNote}

**شكل الإجابة (JSON فقط بدون نص إضافي):**
{
  "selected_prices": [
    {
      "candidate_index": 1,
      "price_sar": 199,
      "is_new": true,
      "reason": "Bosch GSB 570 جديد من extra.com بـ 199 ريال"
    }
  ],
  "reasoning": "شرح مختصر للقرار العام"
}`;

  const userPrompt = `الأصل المطلوب تسعيره:
- الاسم: ${asset.name}
${asset.brand ? `- الماركة: ${asset.brand}` : ""}
${asset.model ? `- الموديل: ${asset.model}` : ""}
- الحالة: ${asset.condition}
- نوع البحث: ${queryType}

نتائج البحث:
${candidatesText}

اختر الأسعار الموثوقة فقط. أرجع JSON.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { prices: [], reasoning: `خطأ Gemini: ${response.status}`, raw_response: errText };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {}
      }
    }

    if (!parsed || !Array.isArray(parsed.selected_prices)) {
      return { prices: [], reasoning: "فشل في قراءة استجابة Gemini", raw_response: content };
    }

    const enrichedPrices = parsed.selected_prices
      .filter((p: any) => typeof p.price_sar === "number" && p.price_sar > 0)
      .map((p: any) => {
        const candidate = candidates[p.candidate_index - 1];
        return {
          price: p.price_sar,
          is_new: p.is_new,
          reason: p.reason,
          source: candidate?.domain || "unknown",
          url: candidate?.url || "",
          title: candidate?.title || "",
          snippet: candidate?.snippet || "",
        };
      });

    return {
      prices: enrichedPrices,
      reasoning: parsed.reasoning || "",
      raw_response: content,
    };
  } catch (e: any) {
    return { prices: [], reasoning: `خطأ: ${e.message}`, raw_response: null };
  }
}

function calculateMedian(prices: number[]): number {
  if (!prices.length) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function getUsedDiscount(condition: string, category: string): number {
  if (category === "vehicle") {
    const v: any = { "جديد": 0.95, "شبه جديد": 0.85, "جيد": 0.70, "مستعمل": 0.60, "تالف": 0.35 };
    return v[condition] || 0.60;
  }
  if (category === "industrial_machine" || category === "industrial_equipment") {
    const i: any = { "جديد": 0.85, "شبه جديد": 0.70, "جيد": 0.55, "مستعمل": 0.45, "تالف": 0.25 };
    return i[condition] || 0.50;
  }
  const p: any = { "جديد": 0.85, "شبه جديد": 0.75, "جيد": 0.65, "مستعمل": 0.55, "تالف": 0.30 };
  return p[condition] || 0.60;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!SERPER_API_KEY) {
    return new Response(JSON.stringify({ error: "SERPER_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const results = [];
  let totalSerperCalls = 0;
  let totalGeminiCalls = 0;

  for (const asset of TEST_ASSETS) {
    const assetResult: any = {
      asset_name: asset.name, brand: asset.brand, model: asset.model,
      condition: asset.condition, category: asset.category,
      is_vague: isVagueAsset(asset),
      searches: [],
      gemini_verdicts: [],
      all_prices: { new: [], used: [], alibaba: [] },
      final_recommendation: null,
    };

    if (isVagueAsset(asset)) {
      assetResult.final_recommendation = {
        price_sar: 0,
        confidence: "يتطلب_معاينة",
        reasoning: "أصل غامض بدون ماركة أو وصف محدد",
        source: "vague_asset_skip",
      };
      results.push(assetResult);
      continue;
    }

    const queries = buildSearchQueries(asset);

    for (const q of queries) {
      const serperResult = await searchSerper(q.query, SERPER_API_KEY);
      totalSerperCalls++;

      const organic = serperResult?.organic || [];
      const candidates = basicFilter(organic, q.type);
      
      assetResult.searches.push({
        query: q.query,
        type: q.type,
        total_results: organic.length,
        candidates_count: candidates.length,
      });

      if (candidates.length > 0) {
        const verdict = await arbitrateWithGemini(asset, candidates, q.type, LOVABLE_API_KEY);
        totalGeminiCalls++;
        
        assetResult.gemini_verdicts.push({
          query_type: q.type,
          selected_count: verdict.prices.length,
          reasoning: verdict.reasoning,
          prices: verdict.prices,
        });

        const prices = verdict.prices.map((p: any) => p.price);
        if (q.type === "new_ksa") {
          assetResult.all_prices.new.push(...prices);
        } else if (q.type === "used_ksa") {
          for (const p of verdict.prices) {
            if (p.is_new) assetResult.all_prices.new.push(p.price);
            else assetResult.all_prices.used.push(p.price);
          }
        } else if (q.type === "alibaba_fallback") {
          assetResult.all_prices.alibaba.push(...prices);
        }
      }
    }

    const newPrices = assetResult.all_prices.new;
    const usedPrices = assetResult.all_prices.used;
    const alibabaPrices = assetResult.all_prices.alibaba;

    const medianNew = calculateMedian(newPrices);
    const medianUsed = calculateMedian(usedPrices);
    const medianAlibaba = calculateMedian(alibabaPrices);

    let recommendedPrice = 0;
    let confidence = "منخفض";
    let reasoning = "";
    let source = "";
    let priceRange: any = null;

    if (medianUsed > 0 && usedPrices.length >= 2) {
      recommendedPrice = medianUsed;
      confidence = usedPrices.length >= 3 ? "عالي" : "متوسط";
      reasoning = `median من ${usedPrices.length} إعلان مستعمل (اختيار Gemini)`;
      source = "used_market_gemini";
      priceRange = { min: Math.min(...usedPrices), max: Math.max(...usedPrices) };
    } else if (medianNew > 0) {
      const multiplier = getUsedDiscount(asset.condition, asset.category);
      recommendedPrice = Math.round(medianNew * multiplier);
      confidence = newPrices.length >= 5 ? "عالي" : newPrices.length >= 3 ? "متوسط" : "منخفض";
      reasoning = `${medianNew} ر.س جديد × ${multiplier} (${asset.condition}, ${asset.category})`;
      source = "new_with_discount_gemini";
      priceRange = { min: Math.min(...newPrices), max: Math.max(...newPrices) };
    } else if (medianAlibaba > 0) {
      const multiplier = getUsedDiscount(asset.condition, asset.category);
      recommendedPrice = Math.round(medianAlibaba * multiplier);
      confidence = alibabaPrices.length >= 3 ? "متوسط" : "منخفض";
      reasoning = `${medianAlibaba} ر.س من Alibaba × ${multiplier}`;
      source = "alibaba_fallback_gemini";
      priceRange = { min: Math.min(...alibabaPrices), max: Math.max(...alibabaPrices) };
    } else {
      confidence = "يتطلب_معاينة";
      reasoning = "Gemini لم يجد أسعاراً موثوقة";
      source = "gemini_rejected_all";
    }

    assetResult.final_recommendation = {
      price_sar: recommendedPrice,
      confidence, reasoning, source,
      median_new: medianNew, median_used: medianUsed, median_alibaba: medianAlibaba,
      count_new: newPrices.length, count_used: usedPrices.length, count_alibaba: alibabaPrices.length,
      price_range: priceRange,
    };

    results.push(assetResult);
  }

  const covered = results.filter(r => r.final_recommendation.confidence !== "يتطلب_معاينة").length;
  const highConfidence = results.filter(r => r.final_recommendation.confidence === "عالي").length;
  const mediumConfidence = results.filter(r => r.final_recommendation.confidence === "متوسط").length;
  const inspectionOnly = results.filter(r => r.final_recommendation.confidence === "يتطلب_معاينة").length;
  const coveragePercent = Math.round((covered / results.length) * 100);

  return new Response(
    JSON.stringify({
      summary: {
        total_assets_tested: TEST_ASSETS.length,
        total_serper_calls: totalSerperCalls,
        total_gemini_calls: totalGeminiCalls,
        estimated_serper_cost_usd: (totalSerperCalls * 0.001).toFixed(4),
        coverage_percent: coveragePercent,
        covered_assets: covered,
        high_confidence_assets: highConfidence,
        medium_confidence_assets: mediumConfidence,
        requires_inspection: inspectionOnly,
      },
      results,
    }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
