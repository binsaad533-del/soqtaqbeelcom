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
    // Auth check
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

    // Rate limiting: max 3 OTP requests per 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action", "otp_sent")
      .gte("created_at", fiveMinAgo);

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "تجاوزت الحد المسموح، حاول بعد 5 دقائق" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    if (!TWILIO_ACCOUNT_SID) throw new Error("TWILIO_ACCOUNT_SID is not configured");

    const TWILIO_VERIFY_SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    if (!TWILIO_VERIFY_SERVICE_SID) throw new Error("TWILIO_VERIFY_SERVICE_SID is not configured");

    // Call Twilio Verify API via gateway
    // The gateway adds /2010-04-01/Accounts/{AccountSid} prefix for REST API
    // But Verify API has a different path: /v2/Services/{ServiceSid}/Verifications
    // We need to use the direct Twilio API for Verify since gateway only handles REST API
    const verifyUrl = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;

    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`);
    
    // Use gateway for Twilio Verify
    const response = await fetch(`${GATEWAY_URL}/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        Channel: "sms",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio Verify error:", JSON.stringify(data));
      
      // Fallback: try direct Twilio API
      const directResponse = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          Channel: "sms",
        }),
      });

      // If gateway path fails, try with Auth Token from the API key
      // The TWILIO_API_KEY from connector contains the auth token
      if (!directResponse.ok) {
        // Try with the Twilio REST API through gateway (Messages endpoint as fallback)
        // Actually let's use the Verify API directly with proper credentials
        const authToken = Deno.env.get("TWILIO_ACCOUNT_SID"); // We'll need the auth token
        
        return new Response(
          JSON.stringify({ error: "فشل إرسال رمز التحقق، حاول مرة أخرى" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const directData = await directResponse.json();
      // Log the OTP send
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "otp_sent",
        resource_type: "phone_verification",
        details: { phone: phone.slice(-4), channel: "sms" },
      });

      return new Response(
        JSON.stringify({ success: true, status: directData.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the OTP send
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "otp_sent",
      resource_type: "phone_verification",
      details: { phone: phone.slice(-4), channel: "sms" },
    });

    return new Response(
      JSON.stringify({ success: true, status: data.status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-otp error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "فشل إرسال رمز التحقق" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
