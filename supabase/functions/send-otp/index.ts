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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Rate limit 1: Max 3 requests per phone per 15 min
    const { count: phoneCount } = await supabaseAdmin
      .from("otp_attempts")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .eq("attempt_type", "request")
      .gte("created_at", fifteenMinAgo);

    if ((phoneCount ?? 0) >= 3) {
      await supabaseAdmin.from("otp_attempts").insert({
        phone, ip_address: clientIp, user_id: user.id, attempt_type: "request", success: false,
      });
      return new Response(
        JSON.stringify({ error: "تم تجاوز الحد المسموح. حاول بعد 15 دقيقة.", cooldown: 900 }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit 2: Max 5 requests per IP per 15 min
    if (clientIp !== "unknown") {
      const { count: ipCount } = await supabaseAdmin
        .from("otp_attempts")
        .select("*", { count: "exact", head: true })
        .eq("ip_address", clientIp)
        .eq("attempt_type", "request")
        .gte("created_at", fifteenMinAgo);

      if ((ipCount ?? 0) >= 5) {
        await supabaseAdmin.from("otp_attempts").insert({
          phone, ip_address: clientIp, user_id: user.id, attempt_type: "request", success: false,
        });
        return new Response(
          JSON.stringify({ error: "تم تجاوز الحد المسموح. حاول بعد 15 دقيقة.", cooldown: 900 }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Rate limit 3: Max 10 requests per user per hour
    const { count: userCount } = await supabaseAdmin
      .from("otp_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("attempt_type", "request")
      .gte("created_at", oneHourAgo);

    if ((userCount ?? 0) >= 10) {
      await supabaseAdmin.from("otp_attempts").insert({
        phone, ip_address: clientIp, user_id: user.id, attempt_type: "request", success: false,
      });
      return new Response(
        JSON.stringify({ error: "تم تجاوز الحد المسموح. حاول بعد ساعة.", cooldown: 3600 }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    if (!TWILIO_ACCOUNT_SID) throw new Error("TWILIO_ACCOUNT_SID is not configured");
    const TWILIO_VERIFY_SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    if (!TWILIO_VERIFY_SERVICE_SID) throw new Error("TWILIO_VERIFY_SERVICE_SID is not configured");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!TWILIO_AUTH_TOKEN) throw new Error("TWILIO_AUTH_TOKEN is not configured");

    const verifyUrl = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;

    const sendVerification = async (channel: "sms" | "call") => {
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
      console.warn("SMS blocked, falling back to WhatsApp", JSON.stringify(attempt.data));
      attempt = await sendVerification("whatsapp" as "sms");
      if (!attempt.response.ok) {
        console.warn("WhatsApp failed, falling back to voice call", JSON.stringify(attempt.data));
        attempt = await sendVerification("call");
      }
    }

    if (!attempt.response.ok) {
      console.error("Twilio Verify error:", JSON.stringify(attempt.data));
      await supabaseAdmin.from("otp_attempts").insert({
        phone, ip_address: clientIp, user_id: user.id, attempt_type: "request", success: false,
      });
      return new Response(
        JSON.stringify({ error: attempt.data.message || "فشل إرسال رمز التحقق" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log success
    await supabaseAdmin.from("otp_attempts").insert({
      phone, ip_address: clientIp, user_id: user.id, attempt_type: "request", success: true,
    });

    // Anti-enumeration: always same message
    return new Response(
      JSON.stringify({ success: true, status: attempt.data.status, channel: attempt.channel }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-otp error:", error);
    return new Response(
      JSON.stringify({ error: "فشل إرسال رمز التحقق" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
