import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user memory/preferences
    const { data: memory } = await supabase
      .from("ai_user_memory")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (!memory) {
      return new Response(JSON.stringify({ matches: [], message: "لا توجد بيانات كافية بعد" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build query based on preferences
    let query = supabase
      .from("listings")
      .select("id, title, price, city, district, business_activity, photos, ai_rating, created_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .neq("owner_id", user_id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Filter by preferred cities
    if (memory.preferred_cities && memory.preferred_cities.length > 0) {
      query = query.in("city", memory.preferred_cities);
    }

    // Filter by budget
    if (memory.budget_max) {
      query = query.lte("price", memory.budget_max * 1.1); // 10% tolerance
    }
    if (memory.budget_min) {
      query = query.gte("price", memory.budget_min * 0.9);
    }

    const { data: listings } = await query;

    if (!listings || listings.length === 0) {
      return new Response(JSON.stringify({ matches: [], message: "لا توجد فرص مطابقة حالياً" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Score each listing
    const scored = listings.map(listing => {
      let score = 0;
      let reasons: string[] = [];

      // Activity match
      if (memory.preferred_activities?.includes(listing.business_activity)) {
        score += 35;
        reasons.push("نشاط مفضل");
      }

      // City match
      if (memory.preferred_cities?.includes(listing.city)) {
        score += 25;
        reasons.push("مدينة مفضلة");
      }

      // Budget match
      if (listing.price && memory.budget_min && memory.budget_max) {
        if (listing.price >= memory.budget_min && listing.price <= memory.budget_max) {
          score += 25;
          reasons.push("ضمن الميزانية");
        } else if (listing.price < memory.budget_min * 1.2 || listing.price > memory.budget_max * 0.8) {
          score += 10;
          reasons.push("قريب من الميزانية");
        }
      }

      // Not viewed yet
      if (!memory.viewed_listings?.includes(listing.id)) {
        score += 10;
        reasons.push("فرصة جديدة");
      }

      // AI rating bonus
      if (listing.ai_rating === "excellent") {
        score += 5;
        reasons.push("تقييم ممتاز");
      }

      return { ...listing, match_score: Math.min(score, 100), match_reasons: reasons };
    });

    // Filter 85%+ and sort
    const matches = scored
      .filter(s => s.match_score >= 50) // Show 50%+ for now
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 10);

    return new Response(JSON.stringify({
      matches,
      total_analyzed: listings.length,
      high_matches: matches.filter(m => m.match_score >= 85).length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
