import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all users with AI memory (active users)
    const { data: memories } = await supabaseAdmin
      .from("ai_user_memory")
      .select("user_id, preferred_cities, preferred_activities, budget_min, budget_max, viewed_listings");

    if (!memories || memories.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent listings (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: newListings } = await supabaseAdmin
      .from("listings")
      .select("id, title, city, business_activity, price, owner_id, published_at, ai_rating")
      .eq("status", "published")
      .is("deleted_at", null)
      .gte("published_at", yesterday);

    // Get listings with price changes (updated recently)
    const { data: updatedListings } = await supabaseAdmin
      .from("listings")
      .select("id, title, city, business_activity, price, owner_id")
      .eq("status", "published")
      .is("deleted_at", null)
      .gte("updated_at", yesterday)
      .lt("published_at", yesterday); // published before yesterday but updated recently

    let alertsCreated = 0;

    for (const mem of memories) {
      const alerts: any[] = [];
      const viewedSet = new Set(mem.viewed_listings || []);

      // 1. New listings matching user interests
      if (newListings) {
        for (const listing of newListings) {
          if (listing.owner_id === mem.user_id) continue;
          if (viewedSet.has(listing.id)) continue;

          const cityMatch = !mem.preferred_cities?.length || mem.preferred_cities.includes(listing.city);
          const activityMatch = !mem.preferred_activities?.length || mem.preferred_activities.some((a: string) =>
            listing.business_activity?.includes(a) || a.includes(listing.business_activity || "")
          );
          const budgetMatch = (!mem.budget_min || (listing.price && listing.price >= mem.budget_min)) &&
                             (!mem.budget_max || (listing.price && listing.price <= mem.budget_max));

          if (cityMatch && activityMatch && budgetMatch) {
            alerts.push({
              user_id: mem.user_id,
              alert_type: "opportunity",
              priority: listing.ai_rating === "excellent" ? "high" : "normal",
              title: "فرصة جديدة تطابق اهتماماتك",
              message: `${listing.title || "فرصة جديدة"} في ${listing.city || "مدينة غير محددة"} بسعر ${listing.price?.toLocaleString() || "غير محدد"} ر.س`,
              reference_type: "listing",
              reference_id: listing.id,
              metadata: { listing_id: listing.id, match_score: (cityMatch ? 1 : 0) + (activityMatch ? 1 : 0) + (budgetMatch ? 1 : 0) },
            });
          }
        }
      }

      // 2. Price changes on activities user is interested in
      if (updatedListings) {
        for (const listing of updatedListings) {
          if (listing.owner_id === mem.user_id) continue;
          const activityMatch = mem.preferred_activities?.some((a: string) =>
            listing.business_activity?.includes(a)
          );
          if (activityMatch) {
            alerts.push({
              user_id: mem.user_id,
              alert_type: "price_change",
              priority: "normal",
              title: "تحديث على فرصة قد تهمك",
              message: `تم تحديث "${listing.title || "فرصة"}" — تحقق من التغييرات الجديدة`,
              reference_type: "listing",
              reference_id: listing.id,
              metadata: { listing_id: listing.id },
            });
          }
        }
      }

      // 3. Seller-specific: check if their listings need updates
      const { data: sellerListings } = await supabaseAdmin
        .from("listings")
        .select("id, title, updated_at, status")
        .eq("owner_id", mem.user_id)
        .eq("status", "published")
        .is("deleted_at", null);

      if (sellerListings) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        for (const sl of sellerListings) {
          if (sl.updated_at < weekAgo) {
            alerts.push({
              user_id: mem.user_id,
              alert_type: "reminder",
              priority: "normal",
              title: "إعلانك يحتاج تحديث",
              message: `"${sl.title || "إعلانك"}" لم يُحدّث منذ أسبوع. حدّثه لزيادة الظهور`,
              reference_type: "listing",
              reference_id: sl.id,
              metadata: { listing_id: sl.id },
            });
          }
        }
      }

      // 4. Check unpaid commissions
      const { data: unpaidCommissions } = await supabaseAdmin
        .from("deal_commissions")
        .select("id, deal_amount, commission_amount")
        .eq("seller_id", mem.user_id)
        .eq("payment_status", "unpaid");

      if (unpaidCommissions && unpaidCommissions.length > 0) {
        alerts.push({
          user_id: mem.user_id,
          alert_type: "commission",
          priority: "high",
          title: "عمولة معلّقة",
          message: `لديك ${unpaidCommissions.length} عمولة بحاجة سداد. السداد يحسّن ظهور إعلاناتك`,
          reference_type: "commission",
          reference_id: unpaidCommissions[0].id,
          metadata: { count: unpaidCommissions.length },
        });
      }

      // Insert alerts (deduplicate by checking existing unread alerts)
      if (alerts.length > 0) {
        // Check existing unread alerts to avoid duplicates
        const { data: existingAlerts } = await supabaseAdmin
          .from("market_alerts")
          .select("reference_id, alert_type")
          .eq("user_id", mem.user_id)
          .eq("is_read", false);

        const existingSet = new Set((existingAlerts || []).map(a => `${a.alert_type}_${a.reference_id}`));
        const newAlerts = alerts.filter(a => !existingSet.has(`${a.alert_type}_${a.reference_id}`));

        if (newAlerts.length > 0) {
          await supabaseAdmin.from("market_alerts").insert(newAlerts);
          alertsCreated += newAlerts.length;

          // Also create notifications for high priority alerts
          const highPriority = newAlerts.filter(a => a.priority === "high");
          if (highPriority.length > 0) {
            await supabaseAdmin.from("notifications").insert(
              highPriority.map(a => ({
                user_id: a.user_id,
                title: a.title,
                body: a.message,
                type: "market_alert",
                reference_type: a.reference_type,
                reference_id: a.reference_id,
              }))
            );
          }
        }
      }
    }

    return new Response(JSON.stringify({ processed: memories.length, alerts_created: alertsCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("market-radar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
