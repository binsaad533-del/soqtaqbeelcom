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
  if (!response.ok) return { error: `HTTP ${response.status}`, organic: [] };
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
      query_type: queryType,
    });
  }
  return candidates;
}

async function arbitrateAssetWithGemini(
  asset: any,
  allCandidates: any[],
  apiKey: string
) {
  if (allCandidates.length === 0) {
    return { prices: [], reasoning: "لا توجد نتائج للفحص", raw_response: null };
  }

  const candidatesText = allCandidates.map((c, i) =>
    `[${i + 1}] نوع البحث: ${c.query_type}\n    الموقع: ${c.domain}\n    العنوان: ${c.title}\n    النص: ${c.snippet}`
  ).join("\n\n");

  const systemPrompt = `أنت محكّم أسعار للسوق السعودي. مهمتك الوحيدة: اختيار الأسعار الموثوقة من نتائج بحث معطاة لك.

**قواعد صارمة غير قابلة للكسر:**
1. **ممنوع اختراع أو تقدير أسعار من ذاكرتك**. استخرج الأسعار من النصوص المعطاة فقط. إذا لم تجد سعراً صريحاً في النص، لا تضفه.
2. اقبل الأسعار فقط إذا:
   - للمنتج المطلوب بالضبط (ليس منتج مشابه أو مختلف الموديل)
   - واضح أنها من السوق السعودي (ليس يمني/عماني/أردني إلخ)
   - معقولة (ليست رمزية أو إعلان مقطوع)
3. تمييز سياقي حاسم:
   - "قطر الدولة" → رفض. "قطر الدائرة/الأنبوب" → اقبل
   - "سلطنة عُمان/مسقط" → رفض. "عمّان الأردن" → رفض
   - لو الكلمة تظهر كجزء من اسم المنتج أو قياس تقني → اقبل
4. لنتائج نوع "alibaba_fallback": الأسعار بالدولار (حوّل للريال بضرب 3.75). اقبلها فقط كـ alibaba_source.
5. لنتائج نوع "new_ksa" أو "used_ksa": يجب أن تكون بالريال السعودي.
6. حدد لكل سعر:
   - is_new: true إذا المنتج جديد (متجر تجزئة)
   - is_new: false إذا المنتج مستعمل (إعلان من فرد أو قسم "مستعمل")
   - source_type: "ksa_retail" أو "ksa_used" أو "alibaba"
7. إذا لم تجد أي نتيجة موثوقة، أرجع selected_prices مصفوفة فارغة. **الفراغ أفضل من الاختراع.**

**شكل الإجابة (JSON فقط بدون نص إضافي):**
{
  "selected_prices": [
    {
      "candidate_index": 1,
      "price_sar": 199,
      "is_new": true,
      "source_type": "ksa_retail",
      "reason": "Bosch GSB 570 جديد من extra.com بـ 199 ريال"
    }
  ],
  "reasoning": "شرح مختصر للقرار العام",
  "rejected_count": 5,
  "rejected_reasons": "مثال: 3 نتائج من دول أخرى، 2 منتج مختلف"
}`;

  const userPrompt = `الأصل المطلوب تسعيره:
- الاسم: ${asset.name}
${asset.brand ? `- الماركة: ${asset.brand}` : ""}
${asset.model ? `- الموديل: ${asset.model}` : ""}
- الحالة: ${asset.condition}
- الفئة: ${asset.category}

جميع نتائج البحث (من استعلامات متعددة):
${candidatesText}

اختر الأسعار الموثوقة فقط من كل النتائج. أرجع JSON.`;

  try {
    console.log(`[Gemini] بدء تحكيم: ${asset.name}`);
    const startTime = Date.now();

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

    const elapsed = Date.now() - startTime;
    console.log(`[Gemini] انتهى تحكيم: ${asset.name} خلال ${elapsed}ms`);

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
      return { prices: [], reasoning: "فشل قراءة استجابة Gemini", raw_response: content };
    }

    const enrichedPrices = parsed.selected_prices
      .filter((p: any) => typeof p.price_sar === "number" && p.price_sar > 0)
      .map((p: any) => {
        const candidate = allCandidates[p.candidate_index - 1];
        return {
          price: p.price_sar,
          is_new: p.is_new,
          source_type: p.source_type || "unknown",
          reason: p.reason,
          source: candidate?.domain || "unknown",
          url: candidate?.url || "",
          title: candidate?.title || "",
          snippet: candidate?.snippet || "",
          query_type: candidate?.query_type || "unknown",
        };
      });

    return {
      prices: enrichedPrices,
      reasoning: parsed.reasoning || "",
      rejected_count: parsed.rejected_count || 0,
      rejected_reasons: parsed.rejected_reasons || "",
      raw_response: content,
    };
  } catch (e: any) {
    console.error(`[Gemini] خطأ: ${asset.name} - ${e.message}`);
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

async function processAsset(asset: any, serperKey: string, lovableKey: string) {
  const assetResult: any = {
    asset_name: asset.name,
    brand: asset.brand,
    model: asset.model,
    condition: asset.condition,
    category: asset.category,
    is_vague: isVagueAsset(asset),
    searches: [],
    gemini_verdict: null,
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
    return assetResult;
  }

  const queries = buildSearchQueries(asset);

  console.log(`[Serper] ${asset.name}: بدء ${queries.length} استعلامات`);
  const serperResults = await Promise.all(
    queries.map(q => searchSerper(q.query, serperKey).then(r => ({ ...r, queryInfo: q })))
  );
  console.log(`[Serper] ${asset.name}: انتهت كل الاستعلامات`);

  const allCandidates: any[] = [];
  for (const sr of serperResults) {
    const organic = sr?.organic || [];
    const candidates = basicFilter(organic, sr.queryInfo.type);
    allCandidates.push(...candidates);
    assetResult.searches.push({
      query: sr.queryInfo.query,
      type: sr.queryInfo.type,
      total_results: organic.length,
      candidates_after_filter: candidates.length,
    });
  }

  const verdict = await arbitrateAssetWithGemini(asset, allCandidates, lovableKey);

  assetResult.gemini_verdict = {
    total_candidates_sent: allCandidates.length,
    selected_count: verdict.prices.length,
    reasoning: verdict.reasoning,
    rejected_count: verdict.rejected_count,
    rejected_reasons: verdict.rejected_reasons,
    prices: verdict.prices,
  };

  for (const p of verdict.prices) {
    if (p.source_type === "alibaba") {
      assetResult.all_prices.alibaba.push(p.price);
    } else if (p.is_new) {
      assetResult.all_prices.new.push(p.price);
    } else {
      assetResult.all_prices.used.push(p.price);
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
    reasoning = `median من ${usedPrices.length} إعلان مستعمل (تحكيم Gemini)`;
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
    reasoning = "Gemini لم يجد أسعاراً موثوقة في النتائج";
    source = "gemini_rejected_all";
  }

  assetResult.final_recommendation = {
    price_sar: recommendedPrice,
    confidence, reasoning, source,
    median_new: medianNew, median_used: medianUsed, median_alibaba: medianAlibaba,
    count_new: newPrices.length, count_used: usedPrices.length, count_alibaba: alibabaPrices.length,
    price_range: priceRange,
  };

  return assetResult;
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

  const overallStart = Date.now();
  console.log(`[V6.2] بدء معالجة ${TEST_ASSETS.length} أصول بالتوازي`);

  const results = await Promise.all(
    TEST_ASSETS.map(asset => processAsset(asset, SERPER_API_KEY, LOVABLE_API_KEY))
  );

  const totalElapsed = Date.now() - overallStart;
  console.log(`[V6.2] انتهى خلال ${totalElapsed}ms`);

  const totalSerperCalls = results.reduce((sum, r) => sum + (r.searches?.length || 0), 0);
  const totalGeminiCalls = results.filter(r => !r.is_vague).length;
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
        execution_time_seconds: (totalElapsed / 1000).toFixed(1),
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
