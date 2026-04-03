import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { listing_id, offered_price } = await req.json();
    if (!listing_id || !offered_price) {
      return new Response(JSON.stringify({ error: "بيانات ناقصة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get listing owner
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: listing } = await serviceClient
      .from("listings")
      .select("owner_id, title")
      .eq("id", listing_id)
      .single();

    if (!listing) {
      return new Response(JSON.stringify({ error: "إعلان غير موجود" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check seller notification preferences
    const { data: prefs } = await serviceClient
      .from("notification_preferences")
      .select("offers_sms")
      .eq("user_id", listing.owner_id)
      .single();

    if (prefs && prefs.offers_sms === false) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "sms_disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get seller phone
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("phone, full_name, phone_verified")
      .eq("user_id", listing.owner_id)
      .single();

    if (!profile?.phone || !profile.phone_verified) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "no_verified_phone" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get buyer name
    const { data: buyerProfile } = await serviceClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const buyerName = buyerProfile?.full_name || "مشتري";
    const listingTitle = listing.title || "إعلانك";
    const priceFormatted = Number(offered_price).toLocaleString("en-US");

    const smsBody = `عرض سعر جديد 💰\n${buyerName} قدّم عرض ${priceFormatted} ر.س على "${listingTitle}".\nراجع العرض في منصة سوق تقبيل.`;

    // Send SMS via Twilio Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
    if (!MESSAGING_SERVICE_SID) throw new Error("TWILIO_MESSAGING_SERVICE_SID is not configured");

    const smsResponse = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: profile.phone,
        MessagingServiceSid: MESSAGING_SERVICE_SID,
        Body: smsBody,
      }),
    });

    const smsData = await smsResponse.json();

    if (!smsResponse.ok) {
      console.error("Twilio SMS error:", JSON.stringify(smsData));
      return new Response(
        JSON.stringify({ success: false, error: smsData.message || "فشل إرسال SMS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log
    await serviceClient.from("audit_logs").insert({
      user_id: listing.owner_id,
      action: "offer_sms_sent",
      resource_type: "listing",
      resource_id: listing_id,
      details: { buyer_id: user.id, phone_last4: profile.phone.slice(-4), sid: smsData.sid },
    });

    return new Response(
      JSON.stringify({ success: true, sid: smsData.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("notify-offer-sms error:", error);
    return new Response(
      JSON.stringify({ error: "فشل إرسال الإشعار" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
