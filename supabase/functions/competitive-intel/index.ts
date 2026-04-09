import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get the listing
    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();

    if (!listing) throw new Error("Listing not found");

    // Get similar listings (same activity, same city)
    const { data: competitors } = await supabase
      .from("listings")
      .select("id, title, price, city, district, business_activity, created_at, status")
      .eq("status", "published")
      .eq("city", listing.city)
      .eq("business_activity", listing.business_activity)
      .neq("id", listing_id)
      .limit(20);

    const competitorCount = competitors?.length || 0;
    const prices = (competitors || []).filter(c => c.price).map(c => c.price as number);
    const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    // Price position
    let pricePosition = "unknown";
    if (listing.price && avgPrice) {
      const ratio = listing.price / avgPrice;
      if (ratio < 0.8) pricePosition = "below_market";
      else if (ratio > 1.2) pricePosition = "above_market";
      else pricePosition = "market_range";
    }

    // Same district competitors
    const sameDistrict = (competitors || []).filter(c => c.district === listing.district);

    // AI analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiInsights = "";

    if (LOVABLE_API_KEY && competitorCount > 0) {
      const prompt = `حلل الوضع التنافسي لهذا الإعلان بالعامية السعودية وبشكل مختصر:
- النشاط: ${listing.business_activity}
- المدينة: ${listing.city}, الحي: ${listing.district || "غير محدد"}
- السعر: ${listing.price} ريال
- عدد المنافسين: ${competitorCount}
- متوسط أسعار المنافسين: ${avgPrice} ريال
- أقل سعر: ${minPrice}, أعلى سعر: ${maxPrice}
- منافسين بنفس الحي: ${sameDistrict.length}

قدم: 1) تقييم الموقف التنافسي 2) نقاط القوة 3) توصيات تحسين 4) استراتيجية التسعير المقترحة`;

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
      competitor_count: competitorCount,
      same_district_count: sameDistrict.length,
      avg_price: avgPrice,
      min_price: minPrice,
      max_price: maxPrice,
      price_position: pricePosition,
      competitors: (competitors || []).slice(0, 5).map(c => ({
        id: c.id,
        title: c.title,
        price: c.price,
        district: c.district,
      })),
      ai_insights: aiInsights,
      analyzed_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
