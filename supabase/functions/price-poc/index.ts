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

const INDUSTRIAL_FALLBACK_DOMAINS = [
  "alibaba.com", "made-in-china.com", "arabic.alibaba.com",
  "sa.made-in-china.com", "ar.made-in-china.com",
];

const NON_COMMERCIAL_DOMAINS = [
  "instagram.com", "facebook.com", "youtube.com", "tiktok.com",
  "twitter.com", "x.com", "linkedin.com", "pinterest.com",
];

// كلمات تدل على دول أخرى (لو ذُكرت في snippet → رفض)
const FOREIGN_COUNTRY_KEYWORDS = [
  "يمني", "يمن", "صنعاء", "عدن",
  "عماني", "عمان", "مسقط", "oman", "muscat",
  "قطري", "قطر", "الدوحة", "qatar",
  "مصري", "مصر", "القاهرة", "egypt",
  "أردني", "اردني", "الأردن", "عمّان", "jordan",
  "إماراتي", "اماراتي", "دبي", "أبوظبي", "ابوظبي", "الإمارات", "uae", "dubai",
  "كويتي", "الكويت", "kuwait",
  "بحريني", "البحرين", "bahrain",
  "عراقي", "العراق", "بغداد", "iraq",
  "سوري", "سوريا", "دمشق", "syria",
  "ليبي", "ليبيا", "طرابلس", "libya",
  "فلسطيني", "فلسطين", "palestine",
  "إيراني", "ايراني", "إيران", "iran",
];

// كلمات إيجابية — لو ظهرت → ثقة أعلى
const SAUDI_KEYWORDS = [
  "السعودية", "المملكة", "المملكه", "الرياض", "جدة", "مكة",
  "الدمام", "الخبر", "المدينة", "الطائف", "ksa", "saudi",
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

function buildSearchQueries(asset: any): Array<{query: string, type: string}> {
  const queries: Array<{query: string, type: string}> = [];
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

// فحص ذكي محسّن في V5: نقبل بوجود عملة ريال + عدم وجود إشارة دولة أخرى
function analyzeContext(item: any): {
  isSaudi: boolean,
  confidence: "عالي" | "متوسط" | "منخفض" | "مرفوض",
  reasons: string[],
} {
  const reasons: string[] = [];
  const domain = extractDomain(item.link || "");
  const url = (item.link || "").toLowerCase();
  const text = `${item.title || ""} ${item.snippet || ""}`.toLowerCase();

  // 1) فحص القائمة السوداء أولاً
  if (BLACKLISTED_DOMAINS.some(d => domain.includes(d))) {
    reasons.push("قائمة سوداء - عملة مختلفة");
    return { isSaudi: false, confidence: "مرفوض", reasons };
  }
  if (NON_COMMERCIAL_DOMAINS.some(d => domain.includes(d))) {
    reasons.push("موقع اجتماعي");
    return { isSaudi: false, confidence: "مرفوض", reasons };
  }

  // 2) فحص وجود إشارة دولة أخرى في النص
  const foreignKeywordsFound = FOREIGN_COUNTRY_KEYWORDS.filter(kw => text.includes(kw));
  if (foreignKeywordsFound.length > 0) {
    reasons.push(`دولة أخرى مذكورة: ${foreignKeywordsFound.slice(0, 2).join(", ")}`);
    return { isSaudi: false, confidence: "مرفوض", reasons };
  }

  // 3) إشارات سعودية قوية
  let saudiScore = 0;
  const saudiSignals: string[] = [];

  if (domain.endsWith(".sa") || domain.endsWith(".com.sa")) {
    saudiScore += 3; saudiSignals.push("TLD سعودي");
  }
  if (url.includes("/sa/") || url.includes("/ar-sa/") || url.includes("/saudi-arabia/") || url.includes("/ksa/")) {
    saudiScore += 3; saudiSignals.push("مسار سعودي");
  }
  if (domain.includes("saudi") || domain.includes("ksa")) {
    saudiScore += 3; saudiSignals.push("دومين سعودي صريح");
  }

  // 4) فحص وجود عملة ريال/SAR/SR
  const hasRiyalCurrency = /ريال|ر\.?س|\bsar\b|\bsr\s+\d|\d\s*sr\b/i.test(text);
  if (hasRiyalCurrency) {
    saudiScore += 2; saudiSignals.push("عملة ريال/SAR/SR");
  }

  // 5) كلمات سعودية صريحة
  const saudiKeywordsFound = SAUDI_KEYWORDS.filter(kw => text.includes(kw));
  if (saudiKeywordsFound.length > 0) {
    saudiScore += 2; saudiSignals.push(`كلمة سعودية: ${saudiKeywordsFound[0]}`);
  }

  reasons.push(...saudiSignals);

  // قرار القبول
  if (saudiScore >= 5) return { isSaudi: true, confidence: "عالي", reasons };
  if (saudiScore >= 3) return { isSaudi: true, confidence: "متوسط", reasons };

  // منطق V5 الجديد: إذا وُجد عملة ريال ولا توجد دولة أخرى → قبول بثقة منخفضة
  if (hasRiyalCurrency) {
    reasons.push("قبول V5: ريال موجود بدون دولة أخرى");
    return { isSaudi: true, confidence: "منخفض", reasons };
  }

  reasons.push(`لا إشارة سعودية كافية (score: ${saudiScore})`);
  return { isSaudi: false, confidence: "مرفوض", reasons };
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
  const acceptedPrices: any[] = [];
  const rejectedItems: any[] = [];

  for (const item of organic) {
    const domain = extractDomain(item.link || "");

    // للـ alibaba fallback: نقبل الصناعي فقط (بدون فحص سعودي)
    if (queryType === "alibaba_fallback") {
      if (BLACKLISTED_DOMAINS.some(d => domain.includes(d))) {
        rejectedItems.push({ domain, reason: "قائمة سوداء", title: item.title });
        continue;
      }
      const isIndustrial = INDUSTRIAL_FALLBACK_DOMAINS.some(d => domain.includes(d));
      if (!isIndustrial) {
        rejectedItems.push({ domain, reason: "ليس alibaba/made-in-china", title: item.title });
        continue;
      }
      const combinedText = `${item.title || ""} ${item.snippet || ""}`;
      const usdPrices = extractUSDPrices(combinedText);
      for (const priceInSar of usdPrices) {
        acceptedPrices.push({
          price: priceInSar, source: domain, url: item.link || "",
          title: item.title || "", snippet: item.snippet || "",
          from: "organic_usd_converted", confidence_level: "متوسط",
          reasons: ["alibaba fallback"],
        });
      }
      continue;
    }

    // للاستعلامات السعودية: نستخدم V5 logic
    const contextAnalysis = analyzeContext(item);
    if (!contextAnalysis.isSaudi) {
      rejectedItems.push({
        domain,
        reason: contextAnalysis.reasons.join(" / "),
        title: item.title,
      });
      continue;
    }

    const combinedText = `${item.title || ""} ${item.snippet || ""}`;
    const sarPrices = extractPricesFromText(combinedText);
    for (const price of sarPrices) {
      acceptedPrices.push({
        price, source: domain, url: item.link || "",
        title: item.title || "", snippet: item.snippet || "",
        from: "organic_sar",
        confidence_level: contextAnalysis.confidence,
        reasons: contextAnalysis.reasons,
      });
    }
  }

  return {
    query_type: queryType,
    total_results: organic.length,
    prices_found: acceptedPrices.length,
    extracted_prices: acceptedPrices,
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
      const analysis = analyzeSearchResults(serperResult, q.type);
      assetResult.searches.push({ query: q.query, type: q.type, ...analysis });

      const prices = analysis.extracted_prices.map((p: any) => p.price);
      if (q.type === "new_ksa") assetResult.all_prices_by_type.new.push(...prices);
      else if (q.type === "used_ksa") assetResult.all_prices_by_type.used.push(...prices);
      else if (q.type === "alibaba_fallback") assetResult.all_prices_by_type.alibaba.push(...prices);
    }

    const newPrices = assetResult.all_prices_by_type.new;
    const medianNew = calculateMedian(newPrices);

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
      reasoning = `median من ${usedPrices.length} إعلان مستعمل (رُفض ${rejectedUsedCount})`;
      source = "used_market";
      priceRange = { min: Math.min(...usedPrices), max: Math.max(...usedPrices) };
    } else if (medianNew > 0) {
      const multiplier = getUsedDiscount(asset.condition, asset.category);
      recommendedPrice = Math.round(medianNew * multiplier);
      confidence = newPrices.length >= 5 ? "عالي" : newPrices.length >= 3 ? "متوسط" : "منخفض";
      reasoning = `${medianNew} ر.س جديد × ${multiplier} (${asset.condition}, ${asset.category})`;
      source = "new_with_discount";
      priceRange = { min: Math.min(...newPrices), max: Math.max(...newPrices) };
    } else if (medianAlibaba > 0) {
      const multiplier = getUsedDiscount(asset.condition, asset.category);
      recommendedPrice = Math.round(medianAlibaba * multiplier);
      confidence = alibabaPrices.length >= 3 ? "متوسط" : "منخفض";
      reasoning = `${medianAlibaba} ر.س من Alibaba × ${multiplier}`;
      source = "alibaba_fallback";
      priceRange = { min: Math.min(...alibabaPrices), max: Math.max(...alibabaPrices) };
    } else {
      confidence = "يتطلب_معاينة";
      reasoning = "لم نجد مصادر سعرية موثوقة";
      source = "no_results";
    }

    assetResult.final_recommendation = {
      price_sar: recommendedPrice,
      confidence, reasoning, source,
      median_new: medianNew, median_used: medianUsed, median_alibaba: medianAlibaba,
      count_new: newPrices.length, count_used: usedPrices.length, count_alibaba: alibabaPrices.length,
      rejected_used_count: rejectedUsedCount,
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
        estimated_cost_usd: (totalSerperCalls * 0.001).toFixed(4),
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
