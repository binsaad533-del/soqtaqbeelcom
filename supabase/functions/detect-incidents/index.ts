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

    const { event_type, payload } = await req.json();
    const incidents: any[] = [];

    // ─── 1. Failed Login Brute-Force Detection ───
    if (event_type === "failed_login") {
      const { email } = payload;

      // Log the attempt
      await admin.from("failed_login_attempts").insert({
        email,
        ip_address: payload.ip_address || null,
        user_agent: payload.user_agent || null,
      });

      // Check recent attempts (last 15 min)
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("failed_login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("email", email)
        .gte("created_at", fifteenMinAgo);

      if ((count || 0) >= 5) {
        // Find user and suspend
        const { data: profile } = await admin
          .from("profiles")
          .select("user_id, full_name")
          .or(`phone.ilike.%${email.split("@")[0]}%`)
          .limit(1)
          .single();

        const incident = {
          incident_type: "brute_force",
          severity: (count || 0) >= 10 ? "critical" : "high",
          affected_user_id: profile?.user_id || null,
          description: `${count} محاولات دخول فاشلة خلال 15 دقيقة للحساب: ${email}`,
          details: { email, attempt_count: count, window_minutes: 15 },
          recommended_actions: [
            "تعليق الحساب مؤقتاً",
            "التحقق من هوية المستخدم",
            "مراجعة عناوين IP المستخدمة",
          ],
        };
        incidents.push(incident);

        // Auto-suspend if >= 10 attempts
        if ((count || 0) >= 10 && profile?.user_id) {
          await admin
            .from("profiles")
            .update({ is_suspended: true })
            .eq("user_id", profile.user_id);

          // Notify user
          await admin.from("notifications").insert({
            user_id: profile.user_id,
            title: "تم تعليق حسابك مؤقتاً",
            body: "تم رصد محاولات دخول مشبوهة متعددة. يرجى التواصل مع الدعم لإعادة تفعيل حسابك.",
            type: "security",
          });
        }
      }
    }

    // ─── 2. Abnormal Deal Activity ───
    if (event_type === "deal_activity_check") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Check for users creating too many deals rapidly
      const { data: recentDeals } = await admin
        .from("deals")
        .select("buyer_id, seller_id, created_at")
        .gte("created_at", oneHourAgo);

      if (recentDeals) {
        const userDealCounts: Record<string, number> = {};
        recentDeals.forEach((d: any) => {
          if (d.buyer_id) userDealCounts[d.buyer_id] = (userDealCounts[d.buyer_id] || 0) + 1;
          if (d.seller_id) userDealCounts[d.seller_id] = (userDealCounts[d.seller_id] || 0) + 1;
        });

        for (const [userId, count] of Object.entries(userDealCounts)) {
          if (count >= 10) {
            incidents.push({
              incident_type: "abnormal_deal_activity",
              severity: count >= 20 ? "critical" : "high",
              affected_user_id: userId,
              description: `نشاط صفقات غير طبيعي: ${count} صفقة خلال ساعة واحدة`,
              details: { deal_count: count, window_hours: 1 },
              recommended_actions: [
                "مراجعة الصفقات الأخيرة للمستخدم",
                "تعليق قدرة المستخدم على إنشاء صفقات جديدة",
                "التحقق من شرعية النشاط",
              ],
            });
          }
        }
      }
    }

    // ─── 3. Suspicious Pricing Detection ───
    if (event_type === "listing_check") {
      const { listing_id } = payload;
      const { data: listing } = await admin
        .from("listings")
        .select("*")
        .eq("id", listing_id)
        .single();

      if (listing && listing.price) {
        // Check for abnormally low or high prices compared to similar listings
        const { data: similar } = await admin
          .from("listings")
          .select("price")
          .eq("category", listing.category)
          .eq("city", listing.city)
          .neq("id", listing_id)
          .not("price", "is", null)
          .eq("status", "published");

        if (similar && similar.length >= 3) {
          const prices = similar.map((s: any) => s.price).filter(Boolean);
          const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

          if (listing.price < avg * 0.2 || listing.price > avg * 5) {
            incidents.push({
              incident_type: "suspicious_pricing",
              severity: "medium",
              affected_user_id: listing.owner_id,
              affected_resource_type: "listing",
              affected_resource_id: listing_id,
              description: listing.price < avg * 0.2
                ? `سعر منخفض بشكل مريب: ${listing.price} ريال (المتوسط: ${Math.round(avg)} ريال)`
                : `سعر مرتفع بشكل مريب: ${listing.price} ريال (المتوسط: ${Math.round(avg)} ريال)`,
              details: { listing_price: listing.price, average_price: Math.round(avg), similar_count: prices.length },
              recommended_actions: [
                "مراجعة تفاصيل الإعلان",
                "التواصل مع المعلن للتأكد",
                "تعليق الإعلان إذا لزم الأمر",
              ],
            });
          }
        }
      }
    }

    // ─── 4. Duplicate Listing Detection ───
    if (event_type === "duplicate_check") {
      const { listing_id } = payload;
      const { data: listing } = await admin
        .from("listings")
        .select("title, description, owner_id, business_activity, city, district")
        .eq("id", listing_id)
        .single();

      if (listing) {
        const { data: similar } = await admin
          .from("listings")
          .select("id, title, owner_id")
          .eq("owner_id", listing.owner_id)
          .eq("status", "published")
          .neq("id", listing_id);

        if (similar && similar.length > 0) {
          const possibleDupes = similar.filter((s: any) =>
            s.title && listing.title && (
              s.title === listing.title ||
              s.title.includes(listing.title) ||
              listing.title.includes(s.title)
            )
          );

          if (possibleDupes.length > 0) {
            incidents.push({
              incident_type: "duplicate_listing",
              severity: "low",
              affected_user_id: listing.owner_id,
              affected_resource_type: "listing",
              affected_resource_id: listing_id,
              description: `إعلان مكرر محتمل: ${possibleDupes.length} إعلان مشابه من نفس المستخدم`,
              details: { duplicate_ids: possibleDupes.map((d: any) => d.id) },
              recommended_actions: [
                "مراجعة الإعلانات المتشابهة",
                "حذف النسخ المكررة",
              ],
            });
          }
        }
      }
    }

    // ─── 5. Data Access Spike Detection ───
    if (event_type === "access_spike_check") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", payload.user_id)
        .gte("created_at", oneHourAgo);

      if ((count || 0) >= 100) {
        incidents.push({
          incident_type: "data_access_spike",
          severity: (count || 0) >= 500 ? "critical" : "high",
          affected_user_id: payload.user_id,
          description: `ارتفاع غير طبيعي في الوصول للبيانات: ${count} عملية خلال ساعة`,
          details: { access_count: count, window_hours: 1 },
          recommended_actions: [
            "مراجعة سجلات الوصول",, 
            "تقييد صلاحيات المستخدم مؤقتاً",
            :التحقق من شرعية النشاط",the    ],
        });
      }
    }

    // Insert all detected incidents
    if (incidents.length > 0) {
      await admin.from("security_incidents").insert(incidents);

      // Notify all platform owners
      const { data: ownerRoles } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "platform_owner");

      if (ownerRoles) {
        const notifications = ownerRoles.flatMap((r: any) =>
          incidents.map((inc) => ({
            user_id: r.user_id,
            title: `🚨 تنبيه أمني: ${inc.incident_type === "brute_force" ? "محاولات اختراق" :
              inc.incident_type === "abnormal_deal_activity" ? "نشاط مريب" :
              inc.incident_type === "suspicious_pricing" ? "تسعير مريب" :
              inc.incident_type === "duplicate_listing" ? "إعلان مكرر" :
              inc.incident_type === "data_access_spike" ? "ارتفاع غير طبيعي" : "حادث أمني"}`,
            body: inc.description,
            type: "security",
            reference_type: "security_incident",
          }))
        );
        if (notifications.length > 0) {
          await admin.from("notifications").insert(notifications);
        }
      }
    }

    return new Response(
      JSON.stringify({ incidents_detected: incidents.length, incidents }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Incident detection error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
