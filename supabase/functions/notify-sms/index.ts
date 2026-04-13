import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const SITE_URL = "https://soqtaqbeel.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, event_type, data } = await req.json();

    if (!user_id || !event_type) {
      return new Response(JSON.stringify({ error: "بيانات ناقصة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check notification preferences
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    // Map event types to preference keys
    const prefMap: Record<string, string> = {
      offer_accepted: "offers_sms",
      offer_rejected: "offers_sms",
      deal_completed: "deals_sms",
      deal_status_change: "deals_sms",
      negotiation_message: "messages_sms",
      pending_offer_reminder: "offers_sms",
      search_alert_match: "marketing_sms",
    };

    const prefKey = prefMap[event_type];
    if (prefs && prefKey && (prefs as any)[prefKey] === false) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "sms_disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user phone
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("phone, full_name, phone_verified")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!profile?.phone || !profile.phone_verified) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "no_verified_phone" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Throttle: for negotiation messages, max 1 SMS per hour per deal
    if (event_type === "negotiation_message" && data?.deal_id) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentLog } = await supabaseAdmin
        .from("audit_logs")
        .select("id")
        .eq("action", "sms_sent")
        .eq("resource_type", "deal")
        .eq("resource_id", data.deal_id)
        .eq("user_id", user_id)
        .gte("created_at", oneHourAgo)
        .limit(1);

      if (recentLog && recentLog.length > 0) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "throttled" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build SMS body
    const smsBody = buildSmsBody(event_type, data);
    if (!smsBody) {
      return new Response(
        JSON.stringify({ error: "نوع حدث غير مدعوم" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    await supabaseAdmin.from("audit_logs").insert({
      user_id,
      action: "sms_sent",
      resource_type: data?.deal_id ? "deal" : data?.listing_id ? "listing" : "notification",
      resource_id: data?.deal_id || data?.listing_id || event_type,
      details: { event_type, sid: smsData.sid, phone_last4: profile.phone.slice(-4) },
    });

    return new Response(
      JSON.stringify({ success: true, sid: smsData.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("notify-sms error:", error);
    return new Response(
      JSON.stringify({ error: "فشل إرسال الإشعار" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSmsBody(eventType: string, data: any): string | null {
  const price = data?.price ? Number(data.price).toLocaleString("en-US") : "";
  const title = data?.title || "إعلانك";
  const SITE = SITE_URL;

  switch (eventType) {
    case "offer_accepted":
      return `تم قبول عرضك بقيمة ${price} ر.س على "${title}". ادخل المنصة لإكمال الصفقة.\n${SITE}`;

    case "offer_rejected":
      return `للأسف تم رفض عرضك على "${title}". يمكنك تقديم عرض جديد.\n${SITE}`;

    case "deal_completed":
      return `تم إتمام صفقتك على "${title}" بنجاح. شكراً لاستخدامك سوق تقبيل.\n${SITE}`;

    case "deal_status_change":
      return `تم تحديث حالة صفقتك على "${title}" إلى ${data?.newStatusLabel || "حالة جديدة"}. تابع من المنصة.\n${SITE}`;

    case "negotiation_message":
      return `وصلتك رسالة جديدة في صفقة "${title}". ادخل المنصة للرد.\n${SITE}`;

    case "pending_offer_reminder":
      return `عرض بقيمة ${price} ر.س بانتظار ردك على "${title}". رد من المنصة.\n${SITE}`;

    case "search_alert_match":
      return `فرصة جديدة تطابق بحثك: "${title}" بسعر ${price} ر.س. شوفها الآن.\n${SITE}`;

    case "commission_reminder":
      return `تذكير: عمولة بقيمة ${price} ر.س مستحقة على صفقة "${title}". سدد عبر التحويل البنكي ثم أرفق الإثبات من المنصة.\n${SITE}`;

    case "commission_verified":
      return `تم تأكيد سداد عمولتك على "${title}". شكراً لك.\n${SITE}`;

    default:
      return null;
  }
}
