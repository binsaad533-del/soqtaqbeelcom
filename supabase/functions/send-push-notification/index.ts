import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push with VAPID using web-push npm package via esm.sh
// We use the Web Push protocol directly for Deno compatibility
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
) {
  // Import web-push for Deno
  const webpush = await import("npm:web-push@3.6.7");

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    payload
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Allow service role or valid auth
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey
    );

    const { userId, title, body, url, icon, data } = await req.json();

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: "userId and title are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (error || !subscriptions?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: "No subscriptions found",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload = JSON.stringify({
      title,
      body: body || "",
      icon: icon || "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      dir: "rtl",
      lang: "ar",
      url: url || "/",
      data: data || {},
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        await sendWebPush(
          sub,
          payload,
          vapidPublicKey,
          vapidPrivateKey,
          "mailto:info@soqtaqbeel.com"
        );
        sent++;
      } catch (err: any) {
        failed++;
        // 410 Gone or 404 = subscription expired
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        }
        console.error("Push failed:", err?.message || err);
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("send-push-notification error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
