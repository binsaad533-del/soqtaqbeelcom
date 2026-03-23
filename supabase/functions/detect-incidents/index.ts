import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fraud keywords for chat monitoring (Arabic + English)
const FRAUD_KEYWORDS = [
  "واتساب", "واتس", "whatsapp", "تلقرام", "telegram",
  "تحويل خارج", "حساب شخصي", "بدون المنصة", "خارج الموقع",
  "ادفع مباشر", "حول المبلغ", "ارسل فلوس",
  "مستعجل جداً", "آخر فرصة", "العرض ينتهي", "لازم الحين",
];

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
      await admin.from("failed_login_attempts").insert({
        email,
        ip_address: payload.ip_address || null,
        user_agent: payload.user_agent || null,
      });

      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("failed_login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("email", email)
        .gte("created_at", fifteenMinAgo);

      if ((count || 0) >= 5) {
        const { data: profile } = await admin
          .from("profiles")
          .select("user_id, full_name")
          .or(`phone.ilike.%${email.split("@")[0]}%`)
          .limit(1)
          .single();

        incidents.push({
          incident_type: "brute_force",
          severity: (count || 0) >= 10 ? "critical" : "high",
          affected_user_id: profile?.user_id || null,
          description: `${count} محاولات دخول فاشلة خلال 15 دقيقة للحساب: ${email}`,
          details: { email, attempt_count: count, window_minutes: 15 },
          recommended_actions: ["تعليق الحساب مؤقتاً", "التحقق من هوية المستخدم", "مراجعة عناوين IP"],
        });

        if ((count || 0) >= 10 && profile?.user_id) {
          await admin.from("profiles").update({ is_suspended: true, trust_score: 0 }).eq("user_id", profile.user_id);
          await admin.from("notifications").insert({
            user_id: profile.user_id,
            title: "تم تعليق حسابك مؤقتاً",
            body: "تم رصد محاولات دخول مشبوهة متعددة. يرجى التواصل مع الدعم.",
            type: "security",
          });
        }
      }
    }

    // ─── 2. Abnormal Deal Activity ───
    if (event_type === "deal_activity_check") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
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
              recommended_actions: ["مراجعة الصفقات الأخيرة", "تعليق قدرة إنشاء صفقات", "التحقق من شرعية النشاط"],
            });
            // Auto-reduce trust
            await admin.from("profiles").update({ trust_score: 10 }).eq("user_id", userId);
          }
        }
      }
    }

    // ─── 3. Suspicious Pricing Detection ───
    if (event_type === "listing_check") {
      const { listing_id } = payload;
      const { data: listing } = await admin.from("listings").select("*").eq("id", listing_id).single();

      if (listing && listing.price) {
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
            const fraudFlag = listing.price < avg * 0.2 ? "unrealistic_low_price" : "unrealistic_high_price";
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
              recommended_actions: ["مراجعة تفاصيل الإعلان", "التواصل مع المعلن", "تعليق الإعلان إذا لزم"],
            });
            // Flag listing
            await admin.from("listings").update({
              fraud_flags: [...(listing.fraud_flags || []), fraudFlag],
              fraud_score: Math.min((listing.fraud_score || 0) + 30, 100),
            }).eq("id", listing_id);
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
              s.title === listing.title || s.title.includes(listing.title) || listing.title.includes(s.title)
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
              recommended_actions: ["مراجعة الإعلانات المتشابهة", "حذف النسخ المكررة"],
            });
            await admin.from("listings").update({
              fraud_flags: ["duplicate_suspected"],
              fraud_score: 20,
            }).eq("id", listing_id);
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
          recommended_actions: ["مراجعة سجلات الوصول", "تقييد صلاحيات المستخدم مؤقتاً"],
        });
      }
    }

    // ─── 6. Chat & Negotiation Fraud Monitoring ───
    if (event_type === "chat_monitor") {
      const { deal_id, message, sender_id } = payload;
      const lowerMsg = (message || "").toLowerCase();

      const detectedKeywords = FRAUD_KEYWORDS.filter(k => lowerMsg.includes(k));
      if (detectedKeywords.length > 0) {
        const severity = detectedKeywords.length >= 3 ? "high" : "medium";
        incidents.push({
          incident_type: "suspicious_chat",
          severity,
          affected_user_id: sender_id,
          affected_resource_type: "deal",
          affected_resource_id: deal_id,
          description: `رسالة مريبة في التفاوض: كلمات محظورة (${detectedKeywords.join("، ")})`,
          details: { deal_id, detected_keywords: detectedKeywords, keyword_count: detectedKeywords.length },
          recommended_actions: [
            "تنبيه كلا الطرفين بالبقاء داخل المنصة",
            "مراجعة المحادثة كاملة",
            "تعليق الصفقة إذا لزم",
          ],
        });

        // Notify both parties
        const { data: deal } = await admin.from("deals").select("buyer_id, seller_id").eq("id", deal_id).single();
        if (deal) {
          const partyIds = [deal.buyer_id, deal.seller_id].filter(Boolean);
          const warnings = partyIds.map((uid: string) => ({
            user_id: uid,
            title: "⚠️ تنبيه أمان",
            body: "يرجى إجراء جميع المعاملات داخل المنصة لحماية حقوقك. أي اتفاقات خارج المنصة غير مشمولة بالحماية.",
            type: "warning",
            reference_type: "deal",
            reference_id: deal_id,
          }));
          await admin.from("notifications").insert(warnings);
        }
      }
    }

    // ─── 7. Deal Risk Score Calculation ───
    if (event_type === "calculate_deal_risk") {
      const { deal_id } = payload;
      const { data: deal } = await admin.from("deals").select("*").eq("id", deal_id).single();
      if (deal) {
        const riskFactors: string[] = [];
        let riskScore = 0;

        // Check buyer trust
        const { data: buyerProfile } = await admin.from("profiles").select("trust_score, verification_level, is_verified").eq("user_id", deal.buyer_id).single();
        const { data: sellerProfile } = await admin.from("profiles").select("trust_score, verification_level, is_verified").eq("user_id", deal.seller_id).single();

        if (buyerProfile && buyerProfile.trust_score < 30) {
          riskFactors.push("مشتري بثقة منخفضة");
          riskScore += 25;
        }
        if (sellerProfile && sellerProfile.trust_score < 30) {
          riskFactors.push("بائع بثقة منخفضة");
          riskScore += 25;
        }
        if (!buyerProfile?.is_verified) {
          riskFactors.push("مشتري غير موثق");
          riskScore += 15;
        }
        if (!sellerProfile?.is_verified) {
          riskFactors.push("بائع غير موثق");
          riskScore += 15;
        }

        // Check listing fraud
        const { data: listing } = await admin.from("listings").select("fraud_score, fraud_flags").eq("id", deal.listing_id).single();
        if (listing && (listing.fraud_score || 0) > 20) {
          riskFactors.push("إعلان عليه تنبيهات احتيال");
          riskScore += listing.fraud_score || 0;
        }

        // Check deal completeness
        if (!deal.deal_type) {
          riskFactors.push("نوع الصفقة غير محدد");
          riskScore += 10;
        }

        riskScore = Math.min(riskScore, 100);

        await admin.from("deals").update({
          risk_score: riskScore,
          risk_factors: riskFactors,
        }).eq("id", deal_id);

        // If high risk, flag it
        if (riskScore >= 70) {
          incidents.push({
            incident_type: "high_risk_deal",
            severity: riskScore >= 90 ? "critical" : "high",
            affected_resource_type: "deal",
            affected_resource_id: deal_id,
            description: `صفقة عالية المخاطر (${riskScore}/100): ${riskFactors.join("، ")}`,
            details: { deal_id, risk_score: riskScore, risk_factors: riskFactors },
            recommended_actions: [
              "مراجعة الصفقة قبل المتابعة",
              "طلب توثيق إضافي من الأطراف",
              "تجميد الصفقة إذا لزم",
            ],
          });
        }
      }
    }

    // ─── 8. Rapid Listing Creation ───
    if (event_type === "rapid_listing_check") {
      const { user_id } = payload;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user_id)
        .gte("created_at", oneHourAgo);

      if ((count || 0) >= 5) {
        incidents.push({
          incident_type: "rapid_listing_creation",
          severity: (count || 0) >= 10 ? "high" : "medium",
          affected_user_id: user_id,
          description: `إنشاء إعلانات سريع: ${count} إعلان خلال ساعة`,
          details: { listing_count: count, window_hours: 1 },
          recommended_actions: ["مراجعة الإعلانات", "تقييد الإنشاء مؤقتاً"],
        });
      }
    }

    // Insert all detected incidents
    if (incidents.length > 0) {
      await admin.from("security_incidents").insert(incidents);

      const { data: ownerRoles } = await admin.from("user_roles").select("user_id").eq("role", "platform_owner");
      if (ownerRoles) {
        const notifications = ownerRoles.flatMap((r: any) =>
          incidents.map((inc) => ({
            user_id: r.user_id,
            title: `🚨 تنبيه أمني: ${
              inc.incident_type === "brute_force" ? "محاولات اختراق" :
              inc.incident_type === "abnormal_deal_activity" ? "نشاط مريب" :
              inc.incident_type === "suspicious_pricing" ? "تسعير مريب" :
              inc.incident_type === "duplicate_listing" ? "إعلان مكرر" :
              inc.incident_type === "data_access_spike" ? "ارتفاع غير طبيعي" :
              inc.incident_type === "suspicious_chat" ? "محادثة مريبة" :
              inc.incident_type === "high_risk_deal" ? "صفقة عالية المخاطر" :
              inc.incident_type === "rapid_listing_creation" ? "إنشاء سريع" : "حادث أمني"}`,
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
