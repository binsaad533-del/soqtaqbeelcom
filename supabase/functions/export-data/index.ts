import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is platform_owner
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "غير مصرّح" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: hasRole } = await adminClient.rpc("has_role", { _user_id: user.id, _role: "platform_owner" });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "صلاحيات غير كافية" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tables } = await req.json();
    const allowedTables = ["profiles", "listings", "deals", "deal_agreements", "deal_history", "negotiation_messages", "notifications", "deal_checks", "backup_logs"];
    const requestedTables = (tables && tables.length > 0) ? tables.filter((t: string) => allowedTables.includes(t)) : allowedTables;

    // Log backup start
    await adminClient.from("backup_logs").insert({
      backup_type: "manual_export",
      status: "in_progress",
      tables_included: requestedTables,
      initiated_by: user.id,
    });

    const exportData: Record<string, any> = {
      exported_at: new Date().toISOString(),
      exported_by: user.id,
      platform: "سوق التقبيل",
      tables: {},
    };

    for (const table of requestedTables) {
      const { data, error } = await adminClient.from(table).select("*").order("created_at", { ascending: false });
      if (error) {
        exportData.tables[table] = { error: error.message, count: 0 };
      } else {
        exportData.tables[table] = { data, count: data?.length || 0 };
      }
    }

    // Calculate size
    const jsonStr = JSON.stringify(exportData);
    const sizeBytes = new TextEncoder().encode(jsonStr).length;

    // Log backup completion
    await adminClient.from("backup_logs").insert({
      backup_type: "manual_export",
      status: "completed",
      tables_included: requestedTables,
      initiated_by: user.id,
      size_bytes: sizeBytes,
      completed_at: new Date().toISOString(),
      metadata: { record_counts: Object.fromEntries(Object.entries(exportData.tables).map(([k, v]: [string, any]) => [k, v.count])) },
    });

    return new Response(jsonStr, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) {
    console.error("Export error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
