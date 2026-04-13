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

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if phone is locked (5 failed verify attempts → 30 min lock)
    const { data: lockRecord } = await supabaseAdmin
      .from("otp_attempts")
      .select("locked_until")
      .eq("phone", phone)
      .eq("attempt_type", "verify")
      .not("locked_until", "is", null)
      .gte("locked_until", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lockRecord?.locked_until) {
      const remainingMs = new Date(lockRecord.locked_until).getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return new Response(
        JSON.stringify({ error: `تم إدخال رمز خاطئ عدة مرات. حاول بعد ${remainingMin} دقيقة.`, verified: false, locked: true }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count failed verify attempts for this phone in last 30 min
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count: failCount } = await supabaseAdmin
      .from("otp_attempts")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .eq("attempt_type", "verify")
      .eq("success", false)
      .gte("created_at", thirtyMinAgo);

    if ((failCount ?? 0) >= 5) {
      // Lock the phone for 30 minutes
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await supabaseAdmin.from("otp_attempts").insert({
        phone, ip_address: clientIp, user_id: user.id, attempt_type: "verify", success: false, locked_until: lockedUntil,
      });
      return new Response(
        JSON.stringify({ error: "تم إدخال رمز خاطئ عدة مرات. حاول بعد 30 دقيقة.", verified: false, locked: true }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    if (!TWILIO_ACCOUNT_SID) throw new Error("TWILIO_ACCOUNT_SID is not configured");
    const TWILIO_VERIFY_SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    if (!TWILIO_VERIFY_SERVICE_SID) throw new Error("TWILIO_VERIFY_SERVICE_SID is not configured");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!TWILIO_AUTH_TOKEN) throw new Error("TWILIO_AUTH_TOKEN is not configured");

    // Call Twilio Verify Check API
    const checkUrl = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;

    const response = await fetch(checkUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Code: code }),
    });

    const data = await response.json();

    if (!response.ok || data.status !== "approved") {
      // Log failed attempt
      const newFailCount = (failCount ?? 0) + 1;
      const lockedUntil = newFailCount >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;

      await supabaseAdmin.from("otp_attempts").insert({
        phone, ip_address: clientIp, user_id: user.id, attempt_type: "verify", success: false,
        locked_until: lockedUntil,
      });

      const remaining = 5 - newFailCount;
      const errorMsg = remaining <= 0
        ? "تم إدخال رمز خاطئ عدة مرات. حاول بعد 30 دقيقة."
        : `الكود غير صحيح. متبقي ${remaining} محاولات.`;

      return new Response(
        JSON.stringify({ error: errorMsg, verified: false, locked: remaining <= 0 }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success - log it
    await supabaseAdmin.from("otp_attempts").insert({
      phone, ip_address: clientIp, user_id: user.id, attempt_type: "verify", success: true,
    });

    // Update profile
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

    // Log success in audit
    await supabaseAdmin.from("audit_logs").insert({
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
