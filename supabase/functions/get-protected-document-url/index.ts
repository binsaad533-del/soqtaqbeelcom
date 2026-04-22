// supabase/functions/get-protected-document-url/index.ts
// Returns a usable URL for a listing document, enforcing the access ladder:
//   1) Owner          → allow
//   2) platform_owner / operation_supervisor → allow
//   3) is_protected = false → allow (any authenticated user)
//   4) Approved active access request → allow
//   5) Otherwise → 403 + audit denial
//
// Backward-compatible URL resolution:
//   - File still in legacy public bucket (`/listings/`)  → return public URL
//   - File in private `listing-documents` bucket         → return signed URL (24h)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h
const PRIVATE_BUCKET = "listing-documents";
const LEGACY_BUCKET = "listings";
const BYPASS_ROLES = ["platform_owner", "operation_supervisor"];

interface ReqBody {
  file_classification_id?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Extract bucket + object path from a stored file_url. */
function parseStoragePath(fileUrl: string): { bucket: string; path: string } | null {
  try {
    // Public URL pattern: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const publicMatch = fileUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (publicMatch) return { bucket: publicMatch[1], path: decodeURIComponent(publicMatch[2]) };

    // Signed URL pattern: /storage/v1/object/sign/<bucket>/<path>?token=...
    const signMatch = fileUrl.match(/\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/);
    if (signMatch) return { bucket: signMatch[1], path: decodeURIComponent(signMatch[2]) };

    // Bare path: "<bucket>/<path>"
    if (!fileUrl.startsWith("http")) {
      const idx = fileUrl.indexOf("/");
      if (idx > 0) {
        return { bucket: fileUrl.slice(0, idx), path: fileUrl.slice(idx + 1) };
      }
    }
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    let body: ReqBody;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const fcId = body.file_classification_id?.trim();
    if (!fcId) return json({ error: "file_classification_id is required" }, 400);

    // ── Fetch file + listing owner ──────────────────────────────
    const { data: fc, error: fcErr } = await admin
      .from("file_classifications")
      .select("id, listing_id, file_name, file_url, is_protected")
      .eq("id", fcId)
      .maybeSingle();

    if (fcErr) return json({ error: "Database error" }, 500);
    if (!fc) return json({ error: "الملف غير موجود" }, 404);

    const { data: listing } = await admin
      .from("listings")
      .select("owner_id")
      .eq("id", fc.listing_id)
      .maybeSingle();

    if (!listing) return json({ error: "الإعلان غير موجود" }, 404);

    // ── Authorization ladder ────────────────────────────────────
    let allowed = false;
    let reason = "";

    if (user.id === listing.owner_id) {
      allowed = true;
      reason = "owner";
    } else {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const userRoles = (roles ?? []).map((r) => r.role as string);
      const isStaff = userRoles.some((r) => BYPASS_ROLES.includes(r));

      if (isStaff) {
        allowed = true;
        reason = "staff_bypass";
      } else if (fc.is_protected === false) {
        allowed = true;
        reason = "public_file";
      } else {
        const nowIso = new Date().toISOString();
        const { data: req } = await admin
          .from("document_access_requests")
          .select("id, access_expires_at")
          .eq("listing_id", fc.listing_id)
          .eq("requester_id", user.id)
          .eq("status", "approved")
          .or(`access_expires_at.is.null,access_expires_at.gt.${nowIso}`)
          .order("decided_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (req) {
          allowed = true;
          reason = "approved_request";
        }
      }
    }

    if (!allowed) {
      // Audit denial (best-effort)
      await admin.from("audit_logs").insert({
        user_id: user.id,
        action: "document_access_denied",
        resource_type: "file_classification",
        resource_id: fcId,
        details: { listing_id: fc.listing_id, file_name: fc.file_name },
      }).then(() => {}, () => {});
      return json({ error: "تحتاج موافقة البائع للاطلاع على هذه الوثيقة" }, 403);
    }

    // ── Resolve URL (backward compatible) ───────────────────────
    const parsed = parseStoragePath(fc.file_url);
    if (!parsed) {
      // Unknown shape — return as-is (legacy)
      return json({
        url: fc.file_url,
        document_name: fc.file_name,
        source: "raw",
        security_notice: "unparseable_path",
        access_reason: reason,
      });
    }

    if (parsed.bucket === LEGACY_BUCKET) {
      const { data: pub } = admin.storage.from(LEGACY_BUCKET).getPublicUrl(parsed.path);
      return json({
        url: pub.publicUrl,
        document_name: fc.file_name,
        source: "public",
        security_notice: "legacy_public_bucket",
        access_reason: reason,
      });
    }

    if (parsed.bucket === PRIVATE_BUCKET) {
      const { data: signed, error: signErr } = await admin
        .storage
        .from(PRIVATE_BUCKET)
        .createSignedUrl(parsed.path, SIGNED_URL_TTL_SECONDS);

      if (signErr || !signed) {
        console.error("[get-protected-document-url] sign error", signErr);
        return json({ error: "تعذّر توليد رابط الوصول" }, 500);
      }

      const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();
      return json({
        url: signed.signedUrl,
        expires_at: expiresAt,
        document_name: fc.file_name,
        source: "signed",
        access_reason: reason,
      });
    }

    // Unknown bucket — fail safe
    return json({ error: "نوع التخزين غير مدعوم" }, 500);
  } catch (err) {
    console.error("[get-protected-document-url] unexpected", err);
    return json({ error: "خطأ غير متوقع" }, 500);
  }
});
