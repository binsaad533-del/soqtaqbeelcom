import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const results: string[] = [];

    // ─── 1. Brute-force scan (last hour) ───
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: failedLogins } = await admin
      .from("failed_login_attempts")
      .select("email, ip_address")
      .gte("created_at", oneHourAgo);

    if (failedLogins && failedLogins.length > 0) {
      const emailCounts: Record<string, number> = {};
      failedLogins.forEach((f: any) => {
        emailCounts[f.email] = (emailCounts[f.email] || 0) + 1;
      });

      for (const [email, count] of Object.entries(emailCounts)) {
        if (count >= 5) {
          await admin.from("security_incidents").insert({
            incident_type: "brute_force",
            severity: count >= 10 ? "critical" : "high",
            description: `${count} محاولات دخول فاشلة خلال الساعة الأخيرة: ${email}`,
            details: { email, attempt_count: count },
            recommended_actions: ["تعليق الحساب مؤقتاً", "مراجعة IP"],
          });
          results.push(`brute_force: ${email} (${count})`);
        }
      }
    }

    // ─── 2. Suspended accounts with active listings ───
    const { data: suspendedWithListings } = await admin
      .from("profiles")
      .select("user_id, full_name")
      .eq("is_suspended", true);

    if (suspendedWithListings) {
      for (const p of suspendedWithListings) {
        const { count } = await admin
          .from("listings")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", p.user_id)
          .eq("status", "published");

        if ((count || 0) > 0) {
          await admin.from("security_incidents").insert({
            incident_type: "suspended_active_listing",
            severity: "high",
            affected_user_id: p.user_id,
            description: `حساب موقوف (${p.full_name || "مجهول"}) لديه ${count} إعلان نشط`,
            details: { active_listings: count },
            recommended_actions: ["إخفاء إعلانات المستخدم الموقوف"],
          });
          results.push(`suspended_active: ${p.user_id}`);
        }
      }
    }

    // ─── 3. Deals stuck in negotiating > 30 days ───
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleDeals } = await admin
      .from("deals")
      .select("id, buyer_id, seller_id")
      .eq("status", "negotiating")
      .lt("updated_at", thirtyDaysAgo);

    if (staleDeals && staleDeals.length > 0) {
      results.push(`stale_deals: ${staleDeals.length}`);
    }

    // ─── 4. Unpaid commissions > 14 days ───
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: overdueComms } = await admin
      .from("deal_commissions")
      .select("id, seller_id, commission_amount, deal_id")
      .in("payment_status", ["unpaid", "reminder_sent"])
      .lt("created_at", fourteenDaysAgo);

    if (overdueComms && overdueComms.length > 0) {
      const totalOverdue = overdueComms.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
      results.push(`overdue_commissions: ${overdueComms.length} (${totalOverdue} SAR)`);
    }

    // ─── 5. Notify platform owner with summary ───
    const { data: ownerRoles } = await admin.from("user_roles").select("user_id").eq("role", "platform_owner");
    if (ownerRoles && results.length > 0) {
      const notifications = ownerRoles.map((r: any) => ({
        user_id: r.user_id,
        title: "🔒 تقرير الفحص الأمني الدوري",
        body: `تم اكتشاف ${results.length} ملاحظة: ${results.join(" | ")}`,
        type: "security",
      }));
      await admin.from("notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({ scan_complete: true, findings: results.length, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Security scan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "خطأ في الفحص الأمني" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
