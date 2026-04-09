import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, action, params } = await req.json();
    if (!user_id || !action) throw new Error("user_id and action are required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get agent settings
    const { data: settings } = await supabaseAdmin
      .from("agent_settings")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (!settings?.is_active) {
      return new Response(JSON.stringify({ error: "Agent is not active" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any = {};

    switch (action) {
      case "auto_reply_inquiry": {
        // Auto-reply to a message or inquiry
        const { message_content, sender_name, listing_id } = params || {};
        
        // Get listing context
        const { data: listing } = await supabaseAdmin
          .from("listings")
          .select("title, price, city, business_activity, description")
          .eq("id", listing_id)
          .single();

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `أنت وكيل ذكي يرد بالنيابة عن صاحب الإعلان. كن مهنياً وودوداً. أسلوب الرد: ${settings.preferred_response_tone || "professional"}. أجب باختصار وادعُ للتواصل عبر المنصة.
                
بيانات الإعلان:
- العنوان: ${listing?.title || "غير محدد"}
- السعر: ${listing?.price || "غير محدد"} ر.س
- المدينة: ${listing?.city || "غير محددة"}
- النشاط: ${listing?.business_activity || "غير محدد"}`,
              },
              { role: "user", content: `رسالة من ${sender_name}: "${message_content}"` },
            ],
          }),
        });

        if (!aiResponse.ok) throw new Error("AI failed");
        const aiData = await aiResponse.json();
        const replyText = aiData.choices?.[0]?.message?.content || "شكراً لتواصلك، سيتم الرد عليك قريباً.";

        result = { reply: replyText, action: "auto_reply" };

        // Log the action
        await supabaseAdmin.from("agent_actions_log").insert({
          user_id,
          action_type: "auto_reply",
          action_details: { inquiry: message_content, reply: replyText, listing_id },
          result: "success",
          reference_type: "listing",
          reference_id: listing_id,
        });
        break;
      }

      case "evaluate_offer": {
        // Evaluate an incoming offer
        const { offer_id, offered_price, listing_id } = params || {};
        
        const { data: listing } = await supabaseAdmin
          .from("listings")
          .select("price, title, ai_price_analysis")
          .eq("id", listing_id)
          .single();

        const askingPrice = listing?.price || 0;
        const offerRatio = askingPrice > 0 ? offered_price / askingPrice : 0;

        let recommendation: string;
        let autoAction: string | null = null;

        if (settings.auto_reject_below_min && settings.min_acceptable_price && offered_price < settings.min_acceptable_price) {
          recommendation = "رفض تلقائي — أقل من الحد الأدنى المحدد";
          autoAction = "reject";
        } else if (offerRatio >= 0.95) {
          recommendation = "عرض ممتاز — يُنصح بالقبول";
          autoAction = null; // don't auto-accept, just recommend
        } else if (offerRatio >= 0.85) {
          recommendation = "عرض جيد — يمكن التفاوض قليلاً أو القبول";
        } else if (offerRatio >= 0.70) {
          recommendation = "عرض متوسط — يحتاج تفاوض";
        } else {
          recommendation = "عرض منخفض — يُنصح بالرفض أو تقديم عرض مضاد";
        }

        result = {
          offer_id,
          offered_price,
          asking_price: askingPrice,
          ratio: Math.round(offerRatio * 100),
          recommendation,
          auto_action: autoAction,
        };

        await supabaseAdmin.from("agent_actions_log").insert({
          user_id,
          action_type: "evaluate_offer",
          action_details: { offer_id, offered_price, asking_price: askingPrice, recommendation },
          result: autoAction || "recommendation_only",
          reference_type: "offer",
          reference_id: offer_id,
        });
        break;
      }

      case "daily_summary": {
        // Generate daily summary
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString();

        const [
          { count: newOffers },
          { count: newMessages },
          { count: newViews },
          { data: activeDeals },
        ] = await Promise.all([
          supabaseAdmin.from("listing_offers").select("id", { count: "exact", head: true })
            .gte("created_at", yesterday)
            .in("listing_id", (await supabaseAdmin.from("listings").select("id").eq("owner_id", user_id)).data?.map(l => l.id) || []),
          supabaseAdmin.from("messages").select("id", { count: "exact", head: true })
            .eq("receiver_id", user_id).gte("created_at", yesterday),
          supabaseAdmin.from("listing_views").select("id", { count: "exact", head: true })
            .gte("created_at", yesterday)
            .in("listing_id", (await supabaseAdmin.from("listings").select("id").eq("owner_id", user_id)).data?.map(l => l.id) || []),
          supabaseAdmin.from("deals").select("id, status, listing_id")
            .or(`buyer_id.eq.${user_id},seller_id.eq.${user_id}`)
            .not("status", "in", '("completed","cancelled")'),
        ]);

        result = {
          summary: {
            new_offers: newOffers || 0,
            new_messages: newMessages || 0,
            new_views: newViews || 0,
            active_deals: activeDeals?.length || 0,
          },
          generated_at: new Date().toISOString(),
        };

        await supabaseAdmin.from("agent_actions_log").insert({
          user_id,
          action_type: "daily_summary",
          action_details: result.summary,
          result: "success",
        });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
