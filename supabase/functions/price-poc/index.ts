// POC: اختبار Serper API لتسعير الأصول من السوق السعودي
// الهدف: نتأكد من جودة النتائج قبل بناء Edge Function كاملة

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// الأصول التجريبية
const TEST_ASSETS = [
  { name: "منشار دائري ماكيتا 5800NB", brand: "Makita", model: "5800NB", condition: "مستعمل", category: "أداة" },
  { name: "دريل Bosch GSB 570", brand: "Bosch", model: "GSB 570", condition: "جيد", category: "أداة" },
  { name: "ماكينة CNC Sign-CNC A2-1530", brand: "Sign-CNC", model: "A2-1530", condition: "جيد", category: "آلة صناعية" },
  { name: "ضاغط هواء أحمر", brand: null, model: null, condition: "جيد", category: "معدة" },
  { name: "سيارة بيك أب بيضاء", brand: null, model: null, condition: "مستعمل", category: "مركبة" },
];

// بناء استعلام ذكي حسب نوع الأصل وحالته
function buildSearchQuery(asset: any, priceType: "new" | "used"): string {
  const hasModel = asset.model && asset.brand;

  if (priceType === "new") {
    if (hasModel) {
      return `${asset.brand} ${asset.model} سعر السعودية`;
    }
    return `${asset.name} سعر جديد السعودية`;
  } else {
    // used
    if (hasModel) {
      return `${asset.brand} ${asset.model} مستعمل حراج`;
    }
    return `${asset.name} مستعمل حراج OpenSooq`;
  }
}

// استدعاء Serper API
async function searchSerper(query: string, apiKey: string): Promise<any> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      gl: "sa", // Saudi Arabia
      hl: "ar", // Arabic
      num: 10,
    }),
  });

  if (!response.ok) {
    return { error: `HTTP ${response.status}`, query };
  }
  return await response.json();
}

// استخراج الأسعار من نص (snippet أو title)
function extractPricesFromText(text: string): number[] {
  if (!text) return [];

  const prices: number[] = [];

  // تحويل الأرقام العربية إلى إنجليزية
  const normalized = text.replace(/[٠-٩]/g, (d) =>
    String("٠١٢٣٤٥٦٧٨٩".indexOf(d))
  );

  // أنماط الأسعار السعودية
  const patterns = [
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:ريال|ر\.?س|SAR|SR)/gi,
    /(?:ريال|ر\.?س|SAR|SR)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/gi,
    /(\d{3,6})\s*(?:\$|USD)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(normalized)) !== null) {
      const priceStr = match[1].replace(/,/g, "");
      const price = parseFloat(priceStr);

      if (price >= 50 && price <= 10_000_000) {
        if (match[0].includes("$") || match[0].includes("USD")) {
          prices.push(Math.round(price * 3.75));
        } else {
          prices.push(price);
        }
      }
    }
  }

  return prices;
}

function analyzeSearchResults(serperResult: any, queryType: string) {
  const organic = serperResult?.organic || [];
  const shopping = serperResult?.shopping || [];

  const extractedPrices: Array<{
    price: number;
    source: string;
    url: string;
    title: string;
    snippet: string;
  }> = [];

  for (const item of shopping) {
    if (item.price) {
      const priceMatch = String(item.price).match(/[\d,\.]+/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[0].replace(/,/g, ""));
        if (price >= 50 && price <= 10_000_000) {
          extractedPrices.push({
            price,
            source: item.source || "Shopping",
            url: item.link || "",
            title: item.title || "",
            snippet: `Shopping: ${item.price}`,
          });
        }
      }
    }
  }

  for (const item of organic) {
    const combinedText = `${item.title || ""} ${item.snippet || ""}`;
    const prices = extractPricesFromText(combinedText);

    for (const price of prices) {
      extractedPrices.push({
        price,
        source: extractDomain(item.link || ""),
        url: item.link || "",
        title: item.title || "",
        snippet: item.snippet || "",
      });
    }
  }

  return {
    query_type: queryType,
    total_results: organic.length + shopping.length,
    prices_found: extractedPrices.length,
    extracted_prices: extractedPrices,
    raw_organic_count: organic.length,
    raw_shopping_count: shopping.length,
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
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
      searches: {},
      final_recommendation: null,
    };

    const newQuery = buildSearchQuery(asset, "new");
    const newSerper = await searchSerper(newQuery, SERPER_API_KEY);
    totalSerperCalls++;

    const newAnalysis = analyzeSearchResults(newSerper, "new");
    assetResult.searches.new = {
      query: newQuery,
      ...newAnalysis,
    };

    const usedQuery = buildSearchQuery(asset, "used");
    const usedSerper = await searchSerper(usedQuery, SERPER_API_KEY);
    totalSerperCalls++;

    const usedAnalysis = analyzeSearchResults(usedSerper, "used");
    assetResult.searches.used = {
      query: usedQuery,
      ...usedAnalysis,
    };

    const newPrices = newAnalysis.extracted_prices.map((p) => p.price);
    const usedPrices = usedAnalysis.extracted_prices.map((p) => p.price);

    const medianNew = calculateMedian(newPrices);
    const medianUsed = calculateMedian(usedPrices);

    let recommendedPrice = 0;
    let confidence = "منخفض";
    let reasoning = "";

    if (medianUsed > 0) {
      recommendedPrice = medianUsed;
      confidence = usedPrices.length >= 3 ? "عالي" : usedPrices.length >= 2 ? "متوسط" : "منخفض";
      reasoning = `median من ${usedPrices.length} مصدر مستعمل`;
    } else if (medianNew > 0) {
      const conditionDiscount: Record<string, number> = {
        "جديد": 0.90,
        "شبه جديد": 0.75,
        "جيد": 0.55,
        "مستعمل": 0.45,
        "تالف": 0.25,
      };
      const multiplier = conditionDiscount[asset.condition] || 0.50;
      recommendedPrice = Math.round(medianNew * multiplier);
      confidence = newPrices.length >= 3 ? "متوسط" : "منخفض";
      reasoning = `${medianNew} ر.س جديد × ${multiplier} (حالة ${asset.condition})`;
    } else {
      confidence = "يتطلب_معاينة";
      reasoning = "لم نجد مصادر سعرية موثوقة في البحث";
    }

    assetResult.final_recommendation = {
      price_sar: recommendedPrice,
      confidence,
      reasoning,
      median_new: medianNew,
      median_used: medianUsed,
      count_new: newPrices.length,
      count_used: usedPrices.length,
    };

    results.push(assetResult);
  }

  return new Response(
    JSON.stringify({
      summary: {
        total_assets_tested: TEST_ASSETS.length,
        total_serper_calls: totalSerperCalls,
        estimated_cost_usd: (totalSerperCalls * 0.001).toFixed(4),
      },
      results,
    }, null, 2),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
