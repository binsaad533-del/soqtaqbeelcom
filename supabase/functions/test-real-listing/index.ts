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

const TARGET_LISTING_ID = "65df6840-c2ac-43d5-bc2e-6771f35acfbb";

function isVagueAsset(asset: any): boolean {
  if (asset.brand && asset.model) return false;
  const name = (asset.asset_name || asset.name || "").toLowerCase();
  const specificTerms = ["حصان", "hp", "cnc", "كيلو واط", "kw", "لتر", "liter", "مم", "mm", "سكرو", "راوتر", "صناعي", "فولت", "volt"];
  return !specificTerms.some(t => name.includes(t));
}

function normalizeAssetKey(asset: any): string {
  const brand = (asset.brand || "").toLowerCase().trim();
  const model = (asset.model || "").toLowerCase().trim();
  const name = (asset.asset_name || asset.name || "").toLowerCase().trim();
  const condition = (asset.condition || "جيد").trim();
  if (brand && model) return `${brand}|${model}|${condition}`;
  return `${name}|${condition}`;
}

function buildSearchQueries(asset: any) {
  const queries = [];
  const hasModel = asset.model && asset.brand;
  const name = asset.asset_name || asset.name;
  const category = asset.category || "generic_equipment";
  if (hasModel) {
    queries.push({ query: `${asset.brand} ${asset.model} سعر السعودية`, type: "new_ksa" });
    queries.push({ query: `${asset.brand} ${asset.model} مستعمل السعودية`, type: "used_ksa" });
  } else {
    queries.push({ query: `${name} سعر السعودية`, type: "new_ksa" });
    queries.push({ query: `${name} مستعمل السعودية`, type: "used_ksa" });
  }
  if (category === "industrial_machine" || category === "industrial_equipment") {
    const q = hasModel ? `${asset.brand} ${asset.model}` : name;
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

async function arbitrateAssetWithGemini(asset: any, allCandidates: any[], apiKey: string) {
  if (allCandidates.length === 0) {
    return { prices: [], reasoning: "لا توجد نتائج للفحص" };
  }
  const candidatesText = allCandidates.map((c, i) =>
    `[${i + 1}] نوع البحث: ${c.query_type}\n    الموقع: ${c.domain}\n    العنوان: ${c.title}\n    النص: ${c.snippet}`
  ).join("\n\n");

  const systemPrompt = `أنت محكّم أسعار للسوق السعودي. مهمتك الوحيدة: اختيار الأسعار الموثوقة من نتائج بحث معطاة لك.

**قواعد صارمة غير قابلة للكسر:**
1. **ممنوع اختراع أو تقدير أسعار من ذاكرتك**. استخرج الأسعار من النصوص المعطاة فقط.
2. اقبل الأسعار فقط إذا:
   - للمنتج المطلوب بالضبط
   - من السوق السعودي (ليس يمني/عماني/أردني إلخ)
   - معقولة (ليست رمزية)
3. تمييز سياقي:
   - "قطر الدولة" → رفض. "قطر الدائرة" → اقبل
   - "سلطنة عُمان" → رفض. "عمّان الأردن" → رفض
4. لـ alibaba_fallback: الأسعار بالدولار (ضرب 3.75 للريال).
5. لـ new_ksa/used_ksa: يجب أن تكون بالريال السعودي.
6. حدد لكل سعر: is_new (جديد/مستعمل) و source_type (ksa_retail/ksa_used/alibaba).
7. **Outlier detection**: إذا وجدت سعراً يختلف عن الأسعار الأخرى للمنتج نفسه أكثر من 3 أضعاف، استبعده.
8. إذا لم تجد نتائج موثوقة، أرجع selected_prices مصفوفة فارغة. الفراغ أفضل من الاختراع.

**شكل الإجابة (JSON فقط):**
{
  "selected_prices": [
    {
      "candidate_index": 1,
      "price_sar": 199,
      "is_new": true,
      "source_type": "ksa_retail",
      "reason": "شرح مختصر"
    }
  ],
  "reasoning": "شرح القرار",
  "rejected_count": 5,
  "rejected_reasons": "ملخص الرفض"
}`;

  const userPrompt = `الأصل المطلوب تسعيره:
- الاسم: ${asset.asset_name || asset.name}
${asset.brand ? `- الماركة: ${asset.brand}` : ""}
${asset.model ? `- الموديل: ${asset.model}` : ""}
- الحالة: ${asset.condition}
- الفئة: ${asset.category || "غير محدد"}

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
      return { prices: [], reasoning: `خطأ Gemini: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) { try { parsed = JSON.parse(match[0]); } catch {} }
    }

    if (!parsed || !Array.isArray(parsed.selected_prices)) {
      return { prices: [], reasoning: "فشل قراءة Gemini" };
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
        };
      });

    return {
      prices: enrichedPrices,
      reasoning: parsed.reasoning || "",
      rejected_count: parsed.rejected_count || 0,
      rejected_reasons: parsed.rejected_reasons || "",
    };
  } catch (e: any) {
    return { prices: [], reasoning: `خطأ: ${e.message}` };
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

async function priceUniqueAsset(asset: any, serperKey: string, lovableKey: string) {
  if (isVagueAsset(asset)) {
    return {
      price_sar: 0,
      confidence: "يتطلب_معاينة",
      reasoning: "أصل غامض بدون ماركة أو وصف محدد",
      source: "vague_asset_skip",
      gemini_verdict: null,
    };
  }

  const queries = buildSearchQueries(asset);
  const serperResults = await Promise.all(
    queries.map(q => searchSerper(q.query, serperKey).then(r => ({ ...r, queryInfo: q })))
  );

  const allCandidates: any[] = [];
  for (const sr of serperResults) {
    const organic = sr?.organic || [];
    const candidates = basicFilter(organic, sr.queryInfo.type);
    allCandidates.push(...candidates);
  }

  const verdict = await arbitrateAssetWithGemini(asset, allCandidates, lovableKey);

  const newPrices: number[] = [];
  const usedPrices: number[] = [];
  const alibabaPrices: number[] = [];
  for (const p of verdict.prices) {
    if (p.source_type === "alibaba") alibabaPrices.push(p.price);
    else if (p.is_new) newPrices.push(p.price);
    else usedPrices.push(p.price);
  }

  const medianNew = calculateMedian(newPrices);
  const medianUsed = calculateMedian(usedPrices);
  const medianAlibaba = calculateMedian(alibabaPrices);
  const category = asset.category || "generic_equipment";

  let recommendedPrice = 0;
  let confidence = "منخفض";
  let reasoning = "";
  let source = "";

  if (medianUsed > 0 && usedPrices.length >= 2) {
    recommendedPrice = medianUsed;
    confidence = usedPrices.length >= 3 ? "عالي" : "متوسط";
    reasoning = `median من ${usedPrices.length} إعلان مستعمل`;
    source = "used_market";
  } else if (medianNew > 0) {
    const multiplier = getUsedDiscount(asset.condition, category);
    recommendedPrice = Math.round(medianNew * multiplier);
    confidence = newPrices.length >= 5 ? "عالي" : newPrices.length >= 3 ? "متوسط" : "منخفض";
    reasoning = `${medianNew} ر.س جديد × ${multiplier}`;
    source = "new_with_discount";
  } else if (medianAlibaba > 0) {
    const multiplier = getUsedDiscount(asset.condition, category);
    recommendedPrice = Math.round(medianAlibaba * multiplier);
    confidence = alibabaPrices.length >= 3 ? "متوسط" : "منخفض";
    reasoning = `${medianAlibaba} ر.س من Alibaba × ${multiplier}`;
    source = "alibaba_fallback";
  } else {
    confidence = "يتطلب_معاينة";
    reasoning = "لا توجد مصادر موثوقة";
    source = "no_results";
  }

  return {
    price_sar: recommendedPrice,
    confidence,
    reasoning,
    source,
    gemini_verdict: verdict,
    medians: { new: medianNew, used: medianUsed, alibaba: medianAlibaba },
    counts: { new: newPrices.length, used: usedPrices.length, alibaba: alibabaPrices.length },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SERPER_API_KEY || !LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: "مفاتيح API غير مكتملة" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const startTime = Date.now();

  const assetsResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/listing_assets?listing_id=eq.${TARGET_LISTING_ID}&select=*`,
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  if (!assetsResponse.ok) {
    return new Response(JSON.stringify({ error: "فشل جلب الأصول من Supabase" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const allAssets = await assetsResponse.json();

  if (!Array.isArray(allAssets) || allAssets.length === 0) {
    return new Response(JSON.stringify({ error: "لا توجد أصول لهذا الإعلان", listing_id: TARGET_LISTING_ID }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  console.log(`[TestReal] عدد الأصول: ${allAssets.length}`);

  const assetGroups = new Map<string, any[]>();
  for (const asset of allAssets) {
    const key = normalizeAssetKey(asset);
    if (!assetGroups.has(key)) assetGroups.set(key, []);
    assetGroups.get(key)!.push(asset);
  }

  const uniqueAssets = Array.from(assetGroups.entries()).map(([key, group]) => ({
    key,
    representative: group[0],
    count: group.length,
    all_ids: group.map((a: any) => a.id),
  }));

  console.log(`[TestReal] عدد الأنواع الفريدة: ${uniqueAssets.length} (من ${allAssets.length} أصل)`);

  const pricingResults = await Promise.all(
    uniqueAssets.map(async (group) => {
      const result = await priceUniqueAsset(group.representative, SERPER_API_KEY, LOVABLE_API_KEY);
      return { ...group, pricing: result };
    })
  );

  const perAssetResults = [];
  for (const group of pricingResults) {
    for (const assetId of group.all_ids) {
      const originalAsset = allAssets.find((a: any) => a.id === assetId);
      perAssetResults.push({
        asset_id: assetId,
        asset_name: originalAsset?.asset_name || originalAsset?.name,
        brand: originalAsset?.brand,
        model: originalAsset?.model,
        condition: originalAsset?.condition,
        grouped_with: group.count - 1,
        price_sar: group.pricing.price_sar,
        confidence: group.pricing.confidence,
        reasoning: group.pricing.reasoning,
        source: group.pricing.source,
      });
    }
  }

  const elapsed = Date.now() - startTime;

  const totalValue = perAssetResults.reduce((sum, r) => sum + (r.price_sar || 0), 0);
  const covered = perAssetResults.filter(r => r.confidence !== "يتطلب_معاينة").length;
  const highConf = perAssetResults.filter(r => r.confidence === "عالي").length;
  const mediumConf = perAssetResults.filter(r => r.confidence === "متوسط").length;
  const lowConf = perAssetResults.filter(r => r.confidence === "منخفض").length;
  const inspection = perAssetResults.filter(r => r.confidence === "يتطلب_معاينة").length;

  return new Response(
    JSON.stringify({
      summary: {
        listing_id: TARGET_LISTING_ID,
        total_assets: allAssets.length,
        unique_asset_types: uniqueAssets.length,
        deduplication_saved: allAssets.length - uniqueAssets.length,
        execution_time_seconds: (elapsed / 1000).toFixed(1),
        total_serper_calls: uniqueAssets.filter(g => !isVagueAsset(g.representative)).length * 3,
        total_gemini_calls: uniqueAssets.filter(g => !isVagueAsset(g.representative)).length,
        coverage_percent: Math.round((covered / allAssets.length) * 100),
        covered_assets: covered,
        high_confidence: highConf,
        medium_confidence: mediumConf,
        low_confidence: lowConf,
        requires_inspection: inspection,
        total_estimated_value_sar: totalValue,
      },
      unique_groups: pricingResults.map(g => ({
        representative_name: g.representative.asset_name || g.representative.name,
        brand: g.representative.brand,
        model: g.representative.model,
        count: g.count,
        pricing: g.pricing,
      })),
      per_asset_results: perAssetResults,
    }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
