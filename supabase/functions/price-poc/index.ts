const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// قائمة الدومينات السعودية المعتمدة
const APPROVED_SA_DOMAINS = [
  "sa.opensooq.com",
  "haraj.com.sa",
  "extra.com",
  "saco.sa",
  "aptools.sa",
  "arabiatools.com",
  "carrefourksa.com",
  "iffstore.com",
  "noon.com",
  "amazon.sa",
  "kanbkam.com",
  "toyota.com.sa",
  "arabwheels.sa",
  "ksa.yallamotor.com",
  "syarah.com",
  "motory.com",
  "dubizzle.com.sa",
  "microless.com",
  "saudi.microless.com",
  "chinesecars.me",
  "carsvid.com",
];

// دومينات مرفوضة صراحة (عملات مختلفة)
const REJECTED_DOMAINS = [
  "ye.opensooq.com", "om.opensooq.com", "eg.opensooq.com",
  "jo.opensooq.com", "lb.opensooq.com", "iq.opensooq.com",
  "sy.opensooq.com", "ae.dubizzle.com", "uae.dubizzle.com",
  "qa.opensooq.com", "bh.opensooq.com", "kw.opensooq.com",
];

// Alibaba مقبول فقط كـ fallback للمعدات الصناعية
const INDUSTRIAL_FALLBACK_DOMAINS = ["alibaba.com", "made-in-china.com"];

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

// فحص إذا الأصل غامض (بدون ماركة ووصف غير محدد)
function isVagueAsset(asset: any): boolean {
  if (asset.brand && asset.model) return false;
  const name = asset.name.toLowerCase();
  // كلمات محددة تكفي
  const specificTerms = ["حصان", "hp", "cnc", "كيلو واط", "kw", "لتر", "liter", "متر", "mm", "سكرو", "راوتر", "صناعي"];
  const hasSpecifics = specificTerms.some(t => name.includes(t));
  if (!hasSpecifics) return true;
  return false;
}

function buildSearchQueries(asset: any): Array<{query: string, type: string}> {
  const queries: Array<{query: string, type: string}> = [];
  const hasModel = asset.model && asset.brand;

  if (hasModel) {
    queries.push({ query: `${asset.brand} ${asset.model} سعر السعودية`, type: "new_ksa" });
    queries.push({ query: `${asset.brand} ${asset.model} مستعمل site:opensooq.com OR site:haraj.com.sa OR site:dubizzle.com.sa`, type: "used_site" });
  } else {
    queries.push({ query: `${asset.name} سعر السعودية`, type: "new_ksa" });
    queries.push({ query: `${asset.name} مستعمل site:opensooq.com OR site:haraj.com.sa OR site:dubizzle.com.sa`, type: "used_site" });
  }

  // Alibaba fallback فقط للمعدات الصناعية
  if (asset.category === "industrial_machine" || asset.category === "industrial_equipment") {
    const q = hasModel ? `${asset.brand} ${asset.model}` : asset.name;
    queries.push({ query: `${q} industrial machinery price`, type: "alibaba_fallback" });
  }

  return queries;
}

async function searchSerper(query: string, apiKey: string): Promise<any> {
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

// فحص هل الدومين مقبول
function isDomainAllowed(domain: string, queryType: string): { allowed: boolean, reason: string } {
  if (REJECTED_DOMAINS.some(d => domain.includes(d))) {
    return { allowed: false, reason: "دومين مرفوض (عملة مختلفة)" };
  }
  if (queryType === "alibaba_fallback") {
    const isIndustrial = INDUSTRIAL_FALLBACK_DOMAINS.some(d => domain.includes(d));
    if (isIndustrial) return { allowed: true, reason: "alibaba (مقبول للصناعي)" };
  }
  const isSA = APPROVED_SA_DOMAINS.some(d => domain.includes(d));
  if (isSA) return { allowed: true, reason: "دومين سعودي معتمد" };
  return { allowed: false, reason: "دومين غير معتمد" };
}

function extractPricesFromText(text: string): number[] {
  if (!text) return [];
  const prices: number[] = [];
  const normalized = text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const patterns = [
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:ريال|ر\.?س|SAR|SR)/gi,
    /(?:ريال|ر\.?س|SAR|SR)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(normalized)) !== null) {
      const price = parseFloat(match[1].replace(/,/g, ""));
      if (price >= 50 && price <= 10000000) prices.push(price);
    }
  }
  return prices;
}

function extractUSDPrices(text: string): number[] {
  if (!text) return [];
  const prices: number[] = [];
  const patterns = [
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/g,
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*USD/gi,
    /US\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const usd = parseFloat(match[1].replace(/,/g, ""));
      if (usd >= 100 && usd <= 1000000) {
        prices.push(Math.round(usd * 3.75));
      }
    }
  }
  return prices;
}

function analyzeSearchResults(serperResult: any, queryType: string) {
  const organic = serperResult?.organic || [];
  const extractedPrices: any[] = [];
  const rejectedItems: any[] = [];

  for (const item of organic) {
    const domain = extractDomain(item.link || "");
    const domainCheck = isDomainAllowed(domain, queryType);

    if (!domainCheck.allowed) {
      rejectedItems.push({ domain, reason: domainCheck.reason, title: item.title });
      continue;
    }

    const combinedText = `${item.title || ""} ${item.snippet || ""}`;
    const sarPrices = extractPricesFromText(combinedText);

    for (const price of sarPrices) {
      extractedPrices.push({
        price, source: domain, url: item.link || "",
        title: item.title || "", snippet: item.snippet || "",
        from: "organic_sar",
      });
    }

    if (queryType === "alibaba_fallback") {
      const usdPrices = extractUSDPrices(combinedText);
      for (const priceInSar of usdPrices) {
        extractedPrices.push({
          price: priceInSar, source: domain, url: item.link || "",
          title: item.title || "", snippet: item.snippet || "",
          from: "organic_usd_converted",
        });
      }
    }
  }

  return {
    query_type: queryType,
    total_results: organic.length,
    prices_found: extractedPrices.length,
    extracted_prices: extractedPrices,
    rejected_count: rejectedItems.length,
    rejected_samples: rejectedItems.slice(0, 3),
  };
}

function calculateMedian(prices: number[]): number {
  if (!prices.length) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

// خصومات مبسطة — 4 فئات فقط
function getUsedDiscount(condition: string, category: string): number {
  if (category === "vehicle") {
    const v: any = { "جديد": 0.95, "شبه جديد": 0.85, "جيد": 0.70, "مستعمل": 0.60, "تالف": 0.35 };
    return v[condition] || 0.60;
  }
  if (category === "industrial_machine" || category === "industrial_equipment") {
    const i: any = { "جديد": 0.85, "شبه جديد": 0.70, "جيد": 0.55, "مستعمل": 0.45, "تالف": 0.25 };
    return i[condition] || 0.50;
  }
  // power_tool وأي شيء غيره
  const p: any = { "جديد": 0.85, "شبه جديد": 0.75, "جيد": 0.65, "مستعمل": 0.55, "تالف": 0.30 };
  return p[condition] || 0.60;
}

// Sanity check: رفض الأسعار المستعملة أكبر من الجديد × 1.5
function sanityFilterUsedPrices(usedPrices: number[], medianNew: number): number[] {
  if (medianNew <= 0) return usedPrices;
  const threshold = medianNew * 1.5;
  return usedPrices.filter(p => p <= threshold);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
  if (!SERPER_API_KEY) {
    return new Response(
      JSON.stringify({ error: "SERPER_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const results: any[] = [];
  let totalSerperCalls = 0;

  for (const asset of TEST_ASSETS) {
    const assetResult: any = {
      asset_name: asset.name, brand: asset.brand, model: asset.model,
      condition: asset.condition, category: asset.category,
      is_vague: isVagueAsset(asset),
      searches: [],
      all_prices_by_type: { new: [], used: [], alibaba: [] },
      final_recommendation: null,
    };

    // إذا الأصل غامض بدون ماركة، نسكب عن البحث
    if (isVagueAsset(asset)) {
      assetResult.final_recommendation = {
        price_sar: 0,
        confidence: "يتطلب_معاينة",
        reasoning: "أصل غامض بدون ماركة أو وصف محدد — نوصي بمعاينة ميدانية",
        source: "vague_asset_skip",
      };
      results.push(assetResult);
      continue;
    }

    const queries = buildSearchQueries(asset);

    for (const q of queries) {
      const serperResult = await searchSerper(q.query, SERPER_API_KEY);
      totalSerperCalls++;
      const analysis = analyzeSearchResults(serperResult, q.type);
      assetResult.searches.push({ query: q.query, type: q.type, ...analysis });

      const prices = analysis.extracted_prices.map((p: any) => p.price);
      if (q.type === "new_ksa") assetResult.all_prices_by_type.new.push(...prices);
      else if (q.type === "used_site") assetResult.all_prices_by_type.used.push(...prices);
      else if (q.type === "alibaba_fallback") assetResult.all_prices_by_type.alibaba.push(...prices);
    }

    const newPrices = assetResult.all_prices_by_type.new;
    const medianNew = calculateMedian(newPrices);

    // Sanity check على أسعار المستعمل
    const rawUsedPrices = assetResult.all_prices_by_type.used;
    const usedPrices = sanityFilterUsedPrices(rawUsedPrices, medianNew);
    const rejectedUsedCount = rawUsedPrices.length - usedPrices.length;

    const alibabaPrices = assetResult.all_prices_by_type.alibaba;
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
      reasoning = `median من ${usedPrices.length} إعلان مستعمل (بعد تصفية ${rejectedUsedCount})`;
      source = "used_market";
      priceRange = { min: Math.min(...usedPrices), max: Math.max(...usedPrices) };
    } else if (medianNew > 0) {
      const multiplier = getUsedDiscount(asset.condition, asset.category);
      recommendedPrice = Math.round(medianNew * multiplier);
      confidence = newPrices.length >= 3 ? "متوسط" : "منخفض";
      reasoning = `${medianNew} ر.س جديد × ${multiplier} (${asset.condition}, ${asset.category})`;
      source = "new_with_discount";
      priceRange = { min: Math.min(...newPrices), max: Math.max(...newPrices) };
    } else if (medianAlibaba > 0) {
      const multiplier = getUsedDiscount(asset.condition, asset.category);
      recommendedPrice = Math.round(medianAlibaba * multiplier);
      confidence = "منخفض";
      reasoning = `${medianAlibaba} ر.س من Alibaba × ${multiplier}`;
      source = "alibaba_fallback";
      priceRange = { min: Math.min(...alibabaPrices), max: Math.max(...alibabaPrices) };
    } else {
      confidence = "يتطلب_معاينة";
      reasoning = "لم نجد مصادر سعرية موثوقة في السوق السعودي";
      source = "no_results";
    }

    assetResult.final_recommendation = {
      price_sar: recommendedPrice,
      confidence,
      reasoning,
      source,
      median_new: medianNew,
      median_used: medianUsed,
      median_alibaba: medianAlibaba,
      count_new: newPrices.length,
      count_used: usedPrices.length,
      count_alibaba: alibabaPrices.length,
      rejected_used_count: rejectedUsedCount,
      price_range: priceRange,
    };

    results.push(assetResult);
  }

  // إحصائيات
  const covered = results.filter(r => r.final_recommendation.confidence !== "يتطلب_معاينة").length;
  const inspectionOnly = results.filter(r => r.final_recommendation.confidence === "يتطلب_معاينة").length;
  const highConfidence = results.filter(r => r.final_recommendation.confidence === "عالي").length;
  const coveragePercent = Math.round((covered / results.length) * 100);

  return new Response(
    JSON.stringify({
      summary: {
        total_assets_tested: TEST_ASSETS.length,
        total_serper_calls: totalSerperCalls,
        estimated_cost_usd: (totalSerperCalls * 0.001).toFixed(4),
        coverage_percent: coveragePercent,
        covered_assets: covered,
        high_confidence_assets: highConfidence,
        requires_inspection: inspectionOnly,
      },
      results,
    }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
