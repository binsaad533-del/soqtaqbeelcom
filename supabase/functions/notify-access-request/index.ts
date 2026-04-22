// supabase/functions/notify-access-request/index.ts
// Inserts a notification row for a listing owner when a new access request is created.
// Called server-to-server from request-document-access (no JWT verification).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReqBody {
  owner_id?: string;
  listing_id?: string;
  listing_title?: string;
  requester_name?: string;
  request_id?: string;
  status?: string; // "pending" or "approved"
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json()) as ReqBody;
    const { owner_id, listing_id, listing_title, requester_name, request_id, status } = body;

    if (!owner_id || !listing_id) {
      return json({ error: "owner_id and listing_id are required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const isApproved = status === "approved";
    const title = isApproved
      ? "تم اعتماد طلب وصول تلقائياً"
      : "طلب وصول جديد للوثائق";

    const titleLabel = listing_title || "أحد إعلاناتك";
    const namePart = requester_name ? ` من ${requester_name}` : "";
    const body_text = isApproved
      ? `تم منح الوصول تلقائياً${namePart} لوثائق "${titleLabel}".`
      : `طلب وصول جديد${namePart} للاطلاع على وثائق "${titleLabel}". اضغط للمراجعة.`;

    const { error: insertErr } = await admin.from("notifications").insert({
      user_id: owner_id,
      title,
      body: body_text,
      type: "access_request",
      reference_type: "access_request",
      reference_id: request_id || listing_id,
      is_read: false,
    } as any);

    if (insertErr) {
      console.error("[notify-access-request] insert error", insertErr);
      return json({ error: "Failed to insert notification" }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error("[notify-access-request] unexpected", err);
    return json({ error: "خطأ غير متوقع" }, 500);
  }
});
