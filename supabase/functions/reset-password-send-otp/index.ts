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

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Rate limit: Max 3 requests per phone per 15 min
    const { count: phoneCount } = await supabaseAdmin
      .from("otp_attempts")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .eq("attempt_type", "request")
      .gte("created_at", fifteenMinAgo);

    if ((phoneCount ?? 0) >= 3) {
      await supabaseAdmin.from("otp_attempts").insert({
        phone, ip_address: clientIp, attempt_type: "request", success: false,
      });
      // Anti-enumeration: always return success
      return new Response(
        JSON.stringify({ success: true, status: "pending" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: Max 5 requests per IP per 15 min
    if (clientIp !== "unknown") {
      const { count: ipCount } = await supabaseAdmin
        .from("otp_attempts")
        .select("*", { count: "exact", head: true })
        .eq("ip_address", clientIp)
        .eq("attempt_type", "request")
        .gte("created_at", fifteenMinAgo);

      if ((ipCount ?? 0) >= 5) {
        await supabaseAdmin.from("otp_attempts").insert({
          phone, ip_address: clientIp, attempt_type: "request", success: false,
        });
        return new Response(
          JSON.stringify({ success: true, status: "pending" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if user exists (don't reveal to caller)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, phone")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (!profile) {
      // Log attempt but return success (anti-enumeration)
      await supabaseAdmin.from("otp_attempts").insert({
        phone, ip_address: clientIp, attempt_type: "request", success: false,
      });
      return new Response(
        JSON.stringify({ success: true, status: "pending" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      await supabaseAdmin.from("otp_attempts").insert({
        phone, ip_address: clientIp, user_id: profile.user_id, attempt_type: "request", success: false,
      });
      // Anti-enumeration: still return success
      return new Response(
        JSON.stringify({ success: true, status: "pending" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log success
    await supabaseAdmin.from("otp_attempts").insert({
      phone, ip_address: clientIp, user_id: profile.user_id, attempt_type: "request", success: true,
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
