// supabase/functions/request-document-access/index.ts
// Buyer requests access to protected listing documents.
// Triggers in DB handle auto-approval for trusted/repeat buyers + access expiry computation.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_PER_HOUR = 5;

interface ReqBody {
  listing_id?: string;
  message?: string;
  deal_id?: string;
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // ── Validate body ─────────────────────────────────────────
    let body: ReqBody;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const listing_id = body.listing_id?.trim();
    const message = body.message?.trim();
    const deal_id = body.deal_id?.trim();

    if (!listing_id) return json({ error: "listing_id is required" }, 400);
    if (message && message.length > 500) {
      return json({ error: "الرسالة لا يجب أن تتجاوز 500 حرف" }, 400);
    }

    // ── Fetch listing ─────────────────────────────────────────
    const { data: listing, error: listingErr } = await admin
      .from("listings")
      .select("id, owner_id, title")
      .eq("id", listing_id)
      .maybeSingle();

    if (listingErr) return json({ error: "Database error" }, 500);
    if (!listing) return json({ error: "الإعلان غير موجود" }, 404);

    if (listing.owner_id === user.id) {
      return json({ error: "أنت المالك — لا تحتاج طلب وصول" }, 400);
    }

    // ── Rate limit (ad-hoc, no dedicated table) ───────────────
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recentCount } = await admin
      .from("document_access_requests")
      .select("id", { count: "exact", head: true })
      .eq("requester_id", user.id)
      .gte("created_at", oneHourAgo);

    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json(
        { error: "تجاوزت الحد المسموح من الطلبات (5/ساعة). حاول لاحقاً." },
        429,
      );
    }

    // ── Check existing request for same listing ───────────────
    const { data: existing } = await admin
      .from("document_access_requests")
      .select("id, status, access_expires_at, decided_at")
      .eq("listing_id", listing_id)
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const now = Date.now();
      const expiresAt = existing.access_expires_at
        ? new Date(existing.access_expires_at).getTime()
        : null;
      const isActiveApproved =
        existing.status === "approved" && (!expiresAt || expiresAt > now);

      if (isActiveApproved) {
        return json({
          status: "already_approved",
          request_id: existing.id,
          message: "لديك وصول مسموح بالفعل لهذه الوثائق",
        });
      }
      if (existing.status === "pending") {
        return json({
          status: "already_pending",
          request_id: existing.id,
          message: "طلبك قيد المراجعة من البائع",
        });
      }
      // rejected / revoked / expired → delete and allow new request
      await admin.from("document_access_requests").delete().eq("id", existing.id);
    }

    // ── Insert new request (DB triggers handle auto-approve + expiry) ──
    const { data: inserted, error: insertErr } = await admin
      .from("document_access_requests")
      .insert({
        listing_id,
        owner_id: listing.owner_id,
        requester_id: user.id,
        deal_id: deal_id || null,
        scope: "all_protected",
        categories: ["legal_document", "invoice_document"],
        document_refs: [],
        request_message: message || null,
        status: "pending",
      })
      .select("id, status, access_expires_at")
      .single();

    if (insertErr || !inserted) {
      console.error("[request-document-access] insert error", insertErr);
      return json({ error: "تعذّر إنشاء الطلب" }, 500);
    }

    const finalMessage =
      inserted.status === "approved"
        ? "تم اعتماد طلبك تلقائياً"
        : "تم إرسال طلبك للبائع للمراجعة";

    // ── Notify owner (best-effort, server-to-server) ──────────
    try {
      const { data: requesterProfile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      await fetch(`${supabaseUrl}/functions/v1/notify-access-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          owner_id: listing.owner_id,
          listing_id,
          listing_title: listing.title,
          requester_name: requesterProfile?.full_name || null,
          request_id: inserted.id,
          status: inserted.status,
        }),
      });
    } catch (notifyErr) {
      console.warn("[request-document-access] notify failed (non-fatal)", notifyErr);
    }

    return json({
      status: inserted.status === "approved" ? "auto_approved" : "pending",
      request_id: inserted.id,
      access_expires_at: inserted.access_expires_at,
      message: finalMessage,
    });
  } catch (err) {
    console.error("[request-document-access] unexpected", err);
    return json({ error: "خطأ غير متوقع" }, 500);
  }
});
