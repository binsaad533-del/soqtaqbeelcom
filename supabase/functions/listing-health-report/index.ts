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

    const { data: listing } = await supabase.from("listings").select("*").eq("id", listing_id).single();
    if (!listing) throw new Error("Listing not found");

    // Views count
    const { count: viewsCount } = await supabase
      .from("listing_views")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listing_id);

    // Likes count
    const { count: likesCount } = await supabase
      .from("listing_likes")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listing_id);

    // Offers count
    const { count: offersCount } = await supabase
      .from("listing_offers")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listing_id);

    // Views last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentViews } = await supabase
      .from("listing_views")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listing_id)
      .gte("created_at", weekAgo);

    // Data completeness score
    let completeness = 0;
    const fields = ["title", "description", "price", "city", "district", "business_activity", "photos", "location_lat"];
    for (const f of fields) {
      if (listing[f] != null && listing[f] !== "" && listing[f] !== "{}") completeness++;
    }
    const completenessScore = Math.round((completeness / fields.length) * 100);

    // Engagement rate
    const views = viewsCount || 0;
    const engagement = views > 0 ? Math.round(((likesCount || 0) + (offersCount || 0)) / views * 100) : 0;

    // Health score
    let healthScore = 0;
    healthScore += completenessScore * 0.3;
    healthScore += Math.min(engagement * 2, 30);
    healthScore += Math.min((recentViews || 0) * 2, 20);
    healthScore += (listing.photos && Array.isArray(listing.photos) ? Math.min(listing.photos.length * 5, 20) : 0);
    healthScore = Math.round(Math.min(healthScore, 100));

    // AI recommendations
    const recommendations: string[] = [];
    if (completenessScore < 80) recommendations.push("أكمل بيانات الإعلان لزيادة المصداقية");
    if (!listing.photos || (Array.isArray(listing.photos) && listing.photos.length < 3)) recommendations.push("أضف صور أكثر للمشروع");
    if (!listing.description || listing.description.length < 100) recommendations.push("اكتب وصف تفصيلي أطول");
    if ((recentViews || 0) < 5) recommendations.push("إعلانك يحتاج تحديث لزيادة الظهور");
    if (engagement < 5 && views > 10) recommendations.push("راجع السعر — التفاعل منخفض مقارنة بالمشاهدات");

    const report = {
      listing_id,
      health_score: healthScore,
      completeness_score: completenessScore,
      stats: {
        total_views: views,
        recent_views: recentViews || 0,
        likes: likesCount || 0,
        offers: offersCount || 0,
        engagement_rate: engagement,
      },
      recommendations,
      generated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
