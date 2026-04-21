const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// بناء استعلامات متعددة حسب الفئة
function buildSearchQueries(asset: any): Array<{query: string, type: string, priority: number}> {
  const queries: Array<{query: string, type: string, priority: number}> = [];
  const hasModel = asset.model && asset.brand;

  // استعلام الجديد
  if (hasModel) {
    queries.push({
      query: `${asset.brand} ${asset.model} سعر السعودية`,
      type: "new_ksa",
      priority: 1,
    });
  } else {
    queries.push({
      query: `${asset.name} سعر جديد السعودية`,
      type: "new_ksa",
      priority: 1,
    });
  }

  // استعلام المستعمل - استخدام site: operator بدل حراج
  if (hasModel) {
    queries.push({
      query: `${asset.brand} ${asset.model} مستعمل site:opensooq.com OR site:dubizzle.com`,
      type: "used_site",
      priority: 2,
    });
  } else {
    queries.push({
      query: `${asset.name} مستعمل site:opensooq.com OR site:dubizzle.com`,
      type: "used_site",
      priority: 2,
    });
  }

  // للمعدات الصناعية: fallback على Alibaba إذا لزم
  if (asset.category === "industrial_machine" || asset.category === "industrial_equipment") {
    if (hasModel) {
      queries.push({
        query: `${asset.brand} ${asset.model} industrial machinery price`,
        type: "alibaba_fallback",
        priority: 3,
      });
    } else {
      queries.push({
        query: `${asset.name} industrial machinery alibaba price`,
        type: "alibaba_fallback",
        priority: 3,
      });
    }
  }

  return queries;
}

async function searchSerper(query: string, apiKey: string, useShopping = false): Promise<any> {
  const endpoint = useShopping ? "https://google.serper.dev/shopping" : "https://google.serper.dev/search";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: "sa", hl: "ar", num: 10 }),
  });
  if (!response.ok) return { error: `HTTP ${response.status}`, query };
  return await response.json();
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

// استخراج أسعار بالدولار وتحويلها لريال
function extractUSDPrices(text: string): number[] {
  if (!text) return [];
  const prices: number[] = [];
  const patterns = [
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/g,
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*USD/gi,
    /USD\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const usd = parseFloat(match[1].replace(/,/g, ""));
      if (usd >= 10 && usd <= 1000000) {
        prices.push(Math.round(usd * 3.75));
      }
    }
  }
  return prices;
}

function analyzeSearchResults(serperResult: any, queryType: string) {
  const organic = serperResult?.organic || [];
  const shopping = serperResult?.shopping || [];
  const extractedPrices: any[] = [];

  for (const item of shopping) {
    if (item.price) {
      const priceMatch = String(item.price).match(/[\d,\.]+/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[0].replace(/,/g, ""));
        if (price >= 50 && price <= 10000000) {
          extractedPrices.push({
            price,
            source: item.source || "Shopping",
            url: item.link || "",
            title: item.title || "",
            from: "shopping",
          });
        }
      }
    }
  }

  for (const item of organic) {
    const combinedText = `${item.title || ""} ${item.snippet || ""}`;
    
    // استخراج الأسعار بالريال
    const sarPrices = extractPricesFromText(combinedText);
    for (const price of sarPrices) {
      extractedPrices.push({
        price,
        source: extractDomain(item.link || ""),
        url: item.link || "",
        title: item.title || "",
        snippet: item.snippet || "",
        from: "organic_sar",
      });
    }

    // للـ Alibaba fallback: استخراج الأسعار بالدولار
    if (queryType === "alibaba_fallback") {
      const usdPrices = extractUSDPrices(combinedText);
      for (const priceInSar of usdPrices) {
        extractedPrices.push({
          price: priceInSar,
          source: extractDomain(item.link || ""),
          url: item.link || "",
          title: item.title || "",
          snippet: item.snippet || "",
          from: "organic_usd_converted",
        });
      }
    }
  }

  return {
    query_type: queryType,
    total_results: organic.length + shopping.length,
    prices_found: extractedPrices.length,
    extracted_prices: extractedPrices,
  };
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } 
  catch { return "unknown"; }
}

function calculateMedian(prices: number[]): number {
  if (!prices.length) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

// خصومات ذكية حسب الفئة والسعر الجديد
function smartUsedDiscount(newPrice: number, condition: string, category: string): number {
  const tierMultipliers: any = {
    "جديد": { cheap: 0.90, mid: 0.85, heavy: 0.80 },
    "شبه جديد": { cheap: 0.75, mid: 0.70, heavy: 0.65 },
    "جيد": { cheap: 0.60, mid: 0.50, heavy: 0.40 },
    "مستعمل": { cheap: 0.50, mid: 0.40, heavy: 0.35 },
    "تالف": { cheap: 0.25, mid: 0.20, heavy: 0.15 },
  };
  
  // تحديد tier حسب السعر الجديد
  let tier = "mid";
  if (newPrice < 500) tier = "cheap";
  else if (newPrice > 5000) tier = "heavy";
  
  // السيارات تحتفظ بقيمتها أكثر
  if (category === "vehicle") {
    const vehicleMultipliers: any = {
      "جديد": 0.95, "شبه جديد": 0.85, "جيد": 0.65, "مستعمل": 0.55, "تالف": 0.30,
    };
    return vehicleMultipliers[condition] || 0.55;
  }
  
  return tierMultipliers[condition]?.[tier] || 0.50;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      asset_name: asset.name,
      brand: asset.brand,
      model: asset.model,
      condition: asset.condition,
      category: asset.category,
      searches: [],
      all_prices_by_type: { new: [], used: [], alibaba: [] },
      final_recommendation: null,
    };

    const queries = buildSearchQueries(asset);

    for (const q of queries) {
      const serperResult = await searchSerper(q.query, SERPER_API_KEY, false);
      totalSerperCalls++;
      const analysis = analyzeSearchResults(serperResult, q.type);
      assetResult.searches.push({
        query: q.query,
        type: q.type,
        ...analysis,
      });

      // تصنيف الأسعار
      const prices = analysis.extracted_prices.map((p: any) => p.price);
      if (q.type === "new_ksa") {
        assetResult.all_prices_by_type.new.push(...prices);
      } else if (q.type === "used_site") {
        assetResult.all_prices_by_type.used.push(...prices);
      } else if (q.type === "alibaba_fallback") {
        assetResult.all_prices_by_type.alibaba.push(...prices);
      }
    }

    // Shopping API محاولة إضافية للماركات المعروفة
    if (asset.brand && asset.model) {
      const shoppingQuery = `${asset.brand} ${asset.model}`;
      const shoppingResult = await searchSerper(shoppingQuery, SERPER_API_KEY, true);
      totalSerperCalls++;
      const shoppingAnalysis = analyzeSearchResults(shoppingResult, "shopping");
      
      assetResult.searches.push({
        query: shoppingQuery,
        type: "shopping",
        ...shoppingAnalysis,
      });
      
      const shoppingPrices = shoppingAnalysis.extracted_prices.map((p: any) => p.price);
      assetResult.all_prices_by_type.new.push(...shoppingPrices);
    }

    // حساب التوصية النهائية
    const newPrices = assetResult.all_prices_by_type.new;
    const usedPrices = assetResult.all_prices_by_type.used;
    const alibabaPrices = assetResult.all_prices_by_type.alibaba;

    const medianNew = calculateMedian(newPrices);
    const medianUsed = calculateMedian(usedPrices);
    const medianAlibaba = calculateMedian(alibabaPrices);
    
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
      const multiplier = smartUsedDiscount(medianNew, asset.condition, asset.category);
      recommendedPrice = Math.round(medianNew * multiplier);
      confidence = newPrices.length >= 3 ? "متوسط" : "منخفض";
      reasoning = `${medianNew} ر.س جديد × ${multiplier} (${asset.condition}, ${asset.category})`;
      source = "new_with_discount";
    } else if (medianAlibaba > 0) {
      const multiplier = smartUsedDiscount(medianAlibaba, asset.condition, asset.category);
      recommendedPrice = Math.round(medianAlibaba * multiplier);
      confidence = "منخفض";
      reasoning = `${medianAlibaba} ر.س من Alibaba (${alibabaPrices.length} مرجع) × ${multiplier}`;
      source = "alibaba_fallback";
    } else {
      confidence = "يتطلب_معاينة";
      reasoning = "لم نجد مصادر سعرية موثوقة";
      source = "none";
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
    };

    results.push(assetResult);
  }

  // حساب نسبة التغطية
  const covered = results.filter(r => r.final_recommendation.confidence !== "يتطلب_معاينة").length;
  const coveragePercent = Math.round((covered / results.length) * 100);

  return new Response(
    JSON.stringify({
      summary: {
        total_assets_tested: TEST_ASSETS.length,
        total_serper_calls: totalSerperCalls,
        estimated_cost_usd: (totalSerperCalls * 0.001).toFixed(4),
        coverage_percent: coveragePercent,
        covered_assets: covered,
        uncovered_assets: results.length - covered,
      },
      results,
    }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
