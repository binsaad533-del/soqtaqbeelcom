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

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone, code } = await req.json();
    if (!phone || !code || typeof code !== "string" || code.length !== 6) {
      return new Response(JSON.stringify({ error: "البيانات غير صالحة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting: max 5 verify attempts per 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseAnon
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action", "otp_verify_attempt")
      .gte("created_at", tenMinAgo);

    if ((count ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "تجاوزت عدد المحاولات المسموح بها" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log attempt
    await supabaseAnon.from("audit_logs").insert({
      user_id: user.id,
      action: "otp_verify_attempt",
      resource_type: "phone_verification",
      details: { phone: phone.slice(-4) },
    });

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    if (!TWILIO_ACCOUNT_SID) throw new Error("TWILIO_ACCOUNT_SID is not configured");

    const TWILIO_VERIFY_SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    if (!TWILIO_VERIFY_SERVICE_SID) throw new Error("TWILIO_VERIFY_SERVICE_SID is not configured");

    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_AUTH_TOKEN) throw new Error("TWILIO_API_KEY is not configured");

    // Call Twilio Verify Check API directly
    const checkUrl = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;

    const response = await fetch(checkUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        Code: code,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status !== "approved") {
      console.error("Twilio verify check error:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "الكود غير صحيح، جرّب مرة ثانية", verified: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile with verification status using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
        phone: phone,
        is_verified: true,
        verification_level: "basic",
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return new Response(
        JSON.stringify({ error: "فشل تحديث حالة التحقق" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log success
    await supabaseAnon.from("audit_logs").insert({
      user_id: user.id,
      action: "phone_verified",
      resource_type: "phone_verification",
      details: { phone: phone.slice(-4) },
    });

    return new Response(
      JSON.stringify({ success: true, verified: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("verify-otp error:", error);
    return new Response(
      JSON.stringify({ error: "فشل التحقق من الرمز" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
