import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CRITICAL_TABLES = [
  "profiles", "listings", "deals", "deal_agreements", "deal_commissions",
  "deal_history", "negotiation_messages", "listing_offers", "seller_reviews",
  "legal_confirmations", "user_roles",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const tables = body.tables || CRITICAL_TABLES;
    const backupType = body.type || "scheduled";

    // Create backup log entry
    const { data: logEntry, error: logError } = await admin
      .from("backup_logs")
      .insert({
        backup_type: backupType,
        status: "running",
        tables_included: tables,
        initiated_by: body.initiated_by || "system_cron",
      })
      .select()
      .single();

    if (logError) throw logError;

    const backupData: Record<string, any> = {};
    let totalRows = 0;

    for (const table of tables) {
      const { data, error, count } = await admin
        .from(table)
        .select("*", { count: "exact" })
        .limit(10000);

      if (error) {
        console.error(`Error backing up ${table}:`, error.message);
        backupData[table] = { error: error.message, rows: 0 };
      } else {
        backupData[table] = { rows: data?.length || 0, data };
        totalRows += data?.length || 0;
      }
    }

    const jsonStr = JSON.stringify(backupData);
    const sizeBytes = new TextEncoder().encode(jsonStr).length;

    // Store backup in Supabase Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-${timestamp}.json`;

    // Try to upload to storage (if bucket exists)
    const { error: uploadError } = await admin.storage
      .from("backups")
      .upload(fileName, jsonStr, { contentType: "application/json", upsert: true });

    // Update backup log
    await admin
      .from("backup_logs")
      .update({
        status: uploadError ? "completed_no_storage" : "completed",
        completed_at: new Date().toISOString(),
        size_bytes: sizeBytes,
        metadata: {
          total_rows: totalRows,
          tables_count: tables.length,
          file_name: uploadError ? null : fileName,
          storage_error: uploadError?.message || null,
        },
      })
      .eq("id", logEntry.id);

    // Notify platform owner
    const { data: ownerRoles } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "platform_owner");

    if (ownerRoles && ownerRoles.length > 0) {
      const notifications = ownerRoles.map((r: any) => ({
        user_id: r.user_id,
        title: "✅ نسخة احتياطية مكتملة",
        body: `تم حفظ نسخة احتياطية تلقائية — ${totalRows} سجل من ${tables.length} جدول (${(sizeBytes / 1024).toFixed(1)} KB)`,
        type: "system",
      }));
      await admin.from("notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({
        success: true,
        backup_id: logEntry.id,
        total_rows: totalRows,
        size_bytes: sizeBytes,
        storage: uploadError ? "failed" : "uploaded",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Auto-backup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "خطأ في النسخ الاحتياطي" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
