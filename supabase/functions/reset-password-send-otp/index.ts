import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string" || phone.length < 10) {
      return new Response(JSON.stringify({ error: "رقم جوال غير صالح" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify a user with this phone exists
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, phone")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (!profile) {
      // Don't reveal if user exists or not - still return success
      return new Response(
        JSON.stringify({ success: true, status: "pending" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: max 3 requests per 5 minutes based on phone
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "reset_otp_sent")
      .eq("resource_type", "password_reset")
      .gte("created_at", fiveMinAgo)
      .eq("resource_id", phone.slice(-4));

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "تجاوزت الحد المسموح، حاول بعد 5 دقائق" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_VERIFY_SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_VERIFY_SERVICE_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials not configured");
    }

    const verifyUrl = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;

    const sendVerification = async (channel: string) => {
      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, Channel: channel }),
      });
      const data = await response.json();
      return { response, data, channel };
    };

    let attempt = await sendVerification("sms");

    if (!attempt.response.ok && (attempt.data?.code === 60410 || attempt.data?.code === 60203)) {
      attempt = await sendVerification("whatsapp");
      if (!attempt.response.ok) {
        attempt = await sendVerification("call");
      }
    }

    if (!attempt.response.ok) {
      console.error("Twilio Verify error:", JSON.stringify(attempt.data));
      return new Response(
        JSON.stringify({ error: attempt.data.message || "فشل إرسال رمز التحقق" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the OTP send
    await supabaseAdmin.from("audit_logs").insert({
      action: "reset_otp_sent",
      resource_type: "password_reset",
      resource_id: phone.slice(-4),
      details: { channel: attempt.channel },
    });

    return new Response(
      JSON.stringify({ success: true, status: attempt.data.status, channel: attempt.channel }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("reset-password-send-otp error:", error);
    return new Response(
      JSON.stringify({ error: "فشل إرسال رمز التحقق" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
