import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Activity similarity map for expanded search
const similarActivities: Record<string, string[]> = {
  "مطاعم": ["كافيهات", "مخابز"],
  "كافيهات": ["مطاعم", "مخابز"],
  "مخابز": ["مطاعم", "كافيهات"],
  "صالونات": ["مغاسل"],
  "مغاسل": ["صالونات"],
  "ورش": ["محلات", "مستودعات"],
  "محلات": ["بقالات", "ورش"],
  "بقالات": ["محلات"],
  "مكاتب": ["محلات"],
  "مستودعات": ["ورش"],
  "صيدليات": ["محلات"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { listing_id } = await req.json();
    if (!listing_id) throw new Error("listing_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();

    if (!listing) throw new Error("Listing not found");

    // === Layer 1: Same city + same activity (direct competitors) ===
    const { data: directCompetitors } = await supabase
      .from("listings")
      .select("id, title, price, city, district, business_activity, created_at, status, deal_type")
      .eq("status", "published")
      .eq("city", listing.city)
      .eq("business_activity", listing.business_activity)
      .neq("id", listing_id)
      .is("deleted_at", null)
      .limit(30);

    const direct = directCompetitors || [];

    // === Layer 2: Same activity, nearby/all cities (national benchmark) ===
    let nationalBenchmark: typeof direct = [];
    if (direct.length < 5) {
      const { data: national } = await supabase
        .from("listings")
        .select("id, title, price, city, district, business_activity, created_at, status, deal_type")
        .eq("status", "published")
        .eq("business_activity", listing.business_activity)
        .neq("id", listing_id)
        .neq("city", listing.city)
        .is("deleted_at", null)
        .limit(30);
      nationalBenchmark = national || [];
    }

    // === Layer 3: Same city, similar activities ===
    const relatedActivities = similarActivities[listing.business_activity] || [];
    let similarInCity: typeof direct = [];
    if (relatedActivities.length > 0) {
      const { data: similar } = await supabase
        .from("listings")
        .select("id, title, price, city, district, business_activity, created_at, status, deal_type")
        .eq("status", "published")
        .eq("city", listing.city)
        .in("business_activity", relatedActivities)
        .neq("id", listing_id)
        .is("deleted_at", null)
        .limit(20);
      similarInCity = similar || [];
    }

    // === Layer 4: Same deal type across all ===
    let sameDealType: typeof direct = [];
    if (direct.length < 3) {
      const { data: dealTypeMatches } = await supabase
        .from("listings")
        .select("id, title, price, city, district, business_activity, created_at, status, deal_type")
        .eq("status", "published")
        .eq("deal_type", listing.deal_type)
        .neq("id", listing_id)
        .is("deleted_at", null)
        .limit(20);
      sameDealType = (dealTypeMatches || []).filter(
        (d) => !direct.some((c) => c.id === d.id) && !nationalBenchmark.some((c) => c.id === d.id)
      );
    }

    // === Calculate stats per layer ===
    const calcStats = (items: typeof direct) => {
      const prices = items.filter((c) => c.price).map((c) => c.price as number);
      return {
        count: items.length,
        avg: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
        min: prices.length > 0 ? Math.min(...prices) : null,
        max: prices.length > 0 ? Math.max(...prices) : null,
      };
    };

    const directStats = calcStats(direct);
    const nationalStats = calcStats(nationalBenchmark);
    const similarStats = calcStats(similarInCity);
    const dealTypeStats = calcStats(sameDealType);

    // Combined for overall market view
    const allRelevant = [...direct, ...nationalBenchmark, ...similarInCity];
    const uniqueRelevant = allRelevant.filter(
      (item, idx, arr) => arr.findIndex((i) => i.id === item.id) === idx
    );
    const overallStats = calcStats(uniqueRelevant);

    // Use the best available pricing data
    const bestAvg = directStats.avg || overallStats.avg;
    
    let pricePosition = "unknown";
    if (listing.price && bestAvg) {
      const ratio = listing.price / bestAvg;
      if (ratio < 0.8) pricePosition = "below_market";
      else if (ratio > 1.2) pricePosition = "above_market";
      else pricePosition = "market_range";
    }

    const sameDistrict = direct.filter((c) => c.district === listing.district);

    // Search scope description for AI
    const searchScope = direct.length >= 5
      ? "مباشر (نفس المدينة والنشاط)"
      : nationalBenchmark.length > 0
        ? "موسّع (شامل مدن أخرى)"
        : "محدود";

    // === AI Analysis with richer context ===
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiInsights = "";

    if (LOVABLE_API_KEY && uniqueRelevant.length > 0) {
      const cityBreakdown = [...new Set(uniqueRelevant.map((c) => c.city))].join("، ");
      const activityBreakdown = [...new Set(uniqueRelevant.map((c) => c.business_activity))].join("، ");

      const prompt = `أنت محلل تنافسي خبير في سوق تقبيل المشاريع بالسعودية. حلل بالعامية السعودية:

📍 الإعلان المستهدف:
- النشاط: ${listing.business_activity}
- المدينة: ${listing.city}، الحي: ${listing.district || "غير محدد"}
- السعر: ${listing.price ? listing.price + " ريال" : "غير محدد"}
- نوع الصفقة: ${listing.deal_type}

📊 المنافسون المباشرون (نفس المدينة + النشاط):
- العدد: ${directStats.count}
- متوسط السعر: ${directStats.avg ? directStats.avg + " ريال" : "لا يوجد"}
- النطاق: ${directStats.min ? directStats.min + " - " + directStats.max + " ريال" : "لا يوجد"}
- منافسون بنفس الحي: ${sameDistrict.length}

📊 المعيار الوطني (نفس النشاط مدن أخرى):
- العدد: ${nationalStats.count}
- متوسط السعر: ${nationalStats.avg ? nationalStats.avg + " ريال" : "لا يوجد"}
- المدن: ${cityBreakdown}

📊 أنشطة مشابهة بنفس المدينة:
- الأنشطة: ${activityBreakdown}
- العدد: ${similarStats.count}
- متوسط السعر: ${similarStats.avg ? similarStats.avg + " ريال" : "لا يوجد"}

نطاق البحث: ${searchScope}

قدم تحليل مختصر وعملي يشمل:
1) **الموقف التنافسي** — هل السعر مناسب مقارنة بالسوق؟
2) **نقاط القوة والضعف** — بناءً على البيانات المتاحة
3) **توصيات التسعير** — نصيحة واضحة بالأرقام
4) **فرص التحسين** — خطوات عملية لزيادة الجاذبية

⚠️ إذا كان عدد المنافسين المباشرين قليل، نوّه أن التحليل مبني على نطاق موسّع وقد لا يكون دقيق 100%.`;

      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });
        const aiData = await aiResp.json();
        aiInsights = aiData.choices?.[0]?.message?.content || "";
      } catch { /* skip AI */ }
    }

    const result = {
      listing_id,
      search_scope: searchScope,
      // Direct competitors
      competitor_count: directStats.count,
      same_district_count: sameDistrict.length,
      avg_price: directStats.avg,
      min_price: directStats.min,
      max_price: directStats.max,
      // National benchmark
      national_count: nationalStats.count,
      national_avg_price: nationalStats.avg,
      // Similar activities
      similar_count: similarStats.count,
      similar_avg_price: similarStats.avg,
      // Overall
      total_analyzed: uniqueRelevant.length,
      overall_avg_price: overallStats.avg,
      price_position: pricePosition,
      competitors: direct.slice(0, 5).map((c) => ({
        id: c.id,
        title: c.title,
        price: c.price,
        district: c.district,
        city: c.city,
      })),
      national_competitors: nationalBenchmark.slice(0, 5).map((c) => ({
        id: c.id,
        title: c.title,
        price: c.price,
        city: c.city,
      })),
      ai_insights: aiInsights,
      analyzed_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
