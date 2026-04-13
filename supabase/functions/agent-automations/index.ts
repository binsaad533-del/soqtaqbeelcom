import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  try {
    const { automation } = await req.json();
    const results: Record<string, any> = {};

    // =======================================
    // Automation 4: Remind sellers of missing data (every 24h)
    // =======================================
    if (automation === "missing_data_reminder" || automation === "all_daily") {
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, owner_id, price, description, photos, location_lat, location_lng, last_reminder_sent, status")
        .in("status", ["draft", "published"])
        .or("last_reminder_sent.is.null,last_reminder_sent.lt." + new Date(Date.now() - 48 * 3600 * 1000).toISOString());

      let reminders = 0;
      for (const listing of listings || []) {
        const missing: string[] = [];
        const photos = listing.photos as any;
        const photoCount = Array.isArray(photos) ? photos.length : 0;
        if (photoCount < 3) missing.push("صور (أقل من 3)");
        if (!listing.description || (listing.description as string).length < 30) missing.push("وصف كافٍ");
        if (!listing.location_lat || !listing.location_lng) missing.push("موقع على الخريطة");
        if (!listing.price || listing.price <= 0) missing.push("سعر");

        if (missing.length === 0) continue;

        // Check if agent settings allow this
        const { data: settings } = await supabase
          .from("listing_agent_settings")
          .select("notify_missing_data, is_active")
          .eq("listing_id", listing.id)
          .maybeSingle();

        if (settings && (!settings.is_active || settings.notify_missing_data === false)) continue;

        await supabase.from("notifications").insert({
          user_id: listing.owner_id,
          title: "إعلانك يحتاج استكمال",
          body: `إعلانك "${listing.title || "بدون عنوان"}" يحتاج استكمال: ${missing.join("، ")}. أكمل البيانات لزيادة فرص البيع.`,
          type: "reminder",
          reference_type: "listing",
          reference_id: listing.id,
        });

        await supabase.from("listings").update({ last_reminder_sent: new Date().toISOString() }).eq("id", listing.id);

        await supabase.from("agent_actions_log").insert({
          user_id: listing.owner_id,
          action_type: "missing_data_reminder",
          action_details: { listing_id: listing.id, missing },
          result: "success",
          reference_type: "listing",
          reference_id: listing.id,
        });
        reminders++;
      }
      results.missing_data_reminder = { sent: reminders };
    }

    // =======================================
    // Automation 5: Low views alert (daily)
    // =======================================
    if (automation === "low_views_alert" || automation === "all_daily") {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, owner_id, published_at, price")
        .eq("status", "published")
        .lt("published_at", threeDaysAgo);

      let alerts = 0;
      for (const listing of listings || []) {
        // Check if already alerted
        const { data: existing } = await supabase
          .from("agent_actions_log")
          .select("id")
          .eq("action_type", "low_views_alert")
          .eq("reference_id", listing.id)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const { count } = await supabase
          .from("listing_views")
          .select("id", { count: "exact", head: true })
          .eq("listing_id", listing.id);

        if ((count || 0) >= 5) continue;

        // Check settings
        const { data: settings } = await supabase
          .from("listing_agent_settings")
          .select("notify_low_views, is_active")
          .eq("listing_id", listing.id)
          .maybeSingle();

        if (settings && (!settings.is_active || settings.notify_low_views === false)) continue;

        const tips = ["تعديل السعر ليكون أكثر تنافسية", "تحسين الصور وإضافة المزيد", "تعديل العنوان ليكون أكثر جاذبية"];

        await supabase.from("notifications").insert({
          user_id: listing.owner_id,
          title: "مشاهدات منخفضة",
          body: `إعلانك "${listing.title}" حصل على ${count || 0} مشاهدات فقط. جرّب: ${tips[0]}، ${tips[1]}`,
          type: "reminder",
          reference_type: "listing",
          reference_id: listing.id,
        });

        await supabase.from("agent_actions_log").insert({
          user_id: listing.owner_id,
          action_type: "low_views_alert",
          action_details: { listing_id: listing.id, views: count || 0, tips },
          result: "success",
          reference_type: "listing",
          reference_id: listing.id,
        });
        alerts++;
      }
      results.low_views_alert = { sent: alerts };
    }

    // =======================================
    // Automation 6: Follow up on unanswered offers (every 12h)
    // =======================================
    if (automation === "pending_offer_followup" || automation === "all_12h" || automation === "all_daily") {
      const hours48Ago = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      const hours96Ago = new Date(Date.now() - 96 * 3600 * 1000).toISOString();
      const days7Ago = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

      const { data: offers } = await supabase
        .from("listing_offers")
        .select("id, listing_id, buyer_id, offered_price, created_at, reminder_count")
        .eq("status", "pending")
        .lt("created_at", hours48Ago);

      let followups = 0;
      for (const offer of offers || []) {
        const { data: listing } = await supabase
          .from("listings")
          .select("title, owner_id")
          .eq("id", offer.listing_id)
          .single();

        if (!listing) continue;

        const hoursSince = Math.floor((Date.now() - new Date(offer.created_at).getTime()) / 3600000);

        if (offer.created_at < days7Ago && offer.reminder_count >= 2) {
          // 7 days: expire the offer
          await supabase.from("listing_offers").update({ status: "expired" }).eq("id", offer.id);
          await supabase.from("notifications").insert({
            user_id: offer.buyer_id,
            title: "انتهت صلاحية عرضك",
            body: `عرضك بقيمة ${offer.offered_price} ر.س على "${listing.title}" انتهت صلاحيته لعدم الرد`,
            type: "offer",
            reference_type: "listing",
            reference_id: offer.listing_id,
          });
          await supabase.from("agent_actions_log").insert({
            user_id: listing.owner_id,
            action_type: "offer_expired_no_response",
            action_details: { offer_id: offer.id, offered_price: offer.offered_price },
            result: "expired",
            reference_type: "offer",
            reference_id: offer.id,
          });
        } else if (offer.reminder_count < 2) {
          // Send reminder to seller
          const isSecond = offer.reminder_count >= 1;
          await supabase.from("notifications").insert({
            user_id: listing.owner_id,
            title: isSecond ? "آخر تذكير — عرض بانتظار ردك" : "عرض بانتظار ردك",
            body: `لديك عرض بقيمة ${offer.offered_price} ر.س على "${listing.title}" بانتظار ردك منذ ${hoursSince} ساعة`,
            type: "offer",
            reference_type: "listing",
            reference_id: offer.listing_id,
          });

          // Email reminder to seller
          const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          fetch(`${supabaseUrl}/functions/v1/notify-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}`, apikey: anonKey },
            body: JSON.stringify({
              userId: listing.owner_id,
              category: "offers",
              templateName: "pending-offer-reminder",
              idempotencyKey: `pending-offer-${offer.id}-r${offer.reminder_count}`,
              templateData: { offeredPrice: offer.offered_price.toLocaleString(), listingTitle: listing.title || "", hoursSince },
            }),
          }).catch(() => {});

          // SMS reminder to seller
          fetch(`${supabaseUrl}/functions/v1/notify-sms`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}`, apikey: anonKey },
            body: JSON.stringify({
              user_id: listing.owner_id,
              event_type: "pending_offer_reminder",
              data: { price: offer.offered_price, title: listing.title || "" },
            }),
          }).catch(() => {});

          await supabase.from("listing_offers")
            .update({ reminder_count: (offer.reminder_count || 0) + 1 })
            .eq("id", offer.id);
        }
        followups++;
      }
      results.pending_offer_followup = { processed: followups };
    }

    // =======================================
    // Automation 7: Stale deal alert (daily)
    // =======================================
    if (automation === "stale_deal_alert" || automation === "all_daily") {
      const hours72Ago = new Date(Date.now() - 72 * 3600 * 1000).toISOString();

      const { data: deals } = await supabase
        .from("deals")
        .select("id, listing_id, buyer_id, seller_id, status, updated_at, last_activity_alert")
        .in("status", ["negotiating", "in_progress"])
        .lt("updated_at", hours72Ago);

      let staleAlerts = 0;
      for (const deal of deals || []) {
        // Skip if already alerted in last 48h
        if (deal.last_activity_alert && new Date(deal.last_activity_alert).getTime() > Date.now() - 48 * 3600 * 1000) continue;

        const { data: listing } = await supabase
          .from("listings")
          .select("title")
          .eq("id", deal.listing_id)
          .single();

        const daysSince = Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / (24 * 3600 * 1000));
        const title = listing?.title || "الإعلان";

        if (daysSince >= 14) {
          // Final warning
          const body = `صفقتكم على "${title}" ستُعلّق تلقائياً خلال 48 ساعة لعدم النشاط`;
          for (const uid of [deal.buyer_id, deal.seller_id].filter(Boolean)) {
            await supabase.from("notifications").insert({
              user_id: uid, title: "تنبيه أخير — صفقة متوقفة", body, type: "deal", reference_type: "deal", reference_id: deal.id,
            });
          }
        } else if (daysSince >= 7) {
          // Notify supervisor
          const { data: supervisors } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "supervisor");
          for (const sup of supervisors || []) {
            await supabase.from("notifications").insert({
              user_id: sup.user_id, title: "صفقة متوقفة تحتاج تدخل", body: `صفقة على "${title}" متوقفة منذ ${daysSince} يوم`, type: "deal", reference_type: "deal", reference_id: deal.id,
            });
          }
        } else {
          // First alert to both parties
          const body = `صفقتكم على "${title}" متوقفة منذ ${daysSince} يوم. هل تحتاجون مساعدة؟`;
          for (const uid of [deal.buyer_id, deal.seller_id].filter(Boolean)) {
            await supabase.from("notifications").insert({
              user_id: uid, title: "صفقة متوقفة", body, type: "deal", reference_type: "deal", reference_id: deal.id,
            });
          }
        }

        await supabase.from("deals").update({ last_activity_alert: new Date().toISOString() }).eq("id", deal.id);
        await supabase.from("agent_actions_log").insert({
          user_id: deal.seller_id || deal.buyer_id,
          action_type: "stale_deal_alert",
          action_details: { deal_id: deal.id, days_since: daysSince },
          result: "success",
          reference_type: "deal",
          reference_id: deal.id,
        });
        staleAlerts++;
      }
      results.stale_deal_alert = { sent: staleAlerts };
    }

    // =======================================
    // Automation 9: Weekly seller report (Sundays 8AM Riyadh)
    // =======================================
    if (automation === "weekly_report") {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().split("T")[0];

      // Get all sellers with published listings
      const { data: sellers } = await supabase
        .from("listings")
        .select("owner_id, id, title")
        .eq("status", "published");

      const sellerMap = new Map<string, Array<{ id: string; title: string }>>();
      for (const l of sellers || []) {
        if (!sellerMap.has(l.owner_id)) sellerMap.set(l.owner_id, []);
        sellerMap.get(l.owner_id)!.push({ id: l.id, title: l.title || "" });
      }

      let reports = 0;
      for (const [sellerId, listings] of sellerMap) {
        const listingIds = listings.map(l => l.id);

        // Check settings (use first listing's settings)
        const { data: settings } = await supabase
          .from("listing_agent_settings")
          .select("weekly_report_enabled, is_active")
          .in("listing_id", listingIds)
          .limit(1)
          .maybeSingle();

        if (settings && (!settings.is_active || settings.weekly_report_enabled === false)) continue;

        // Views this week vs last week
        const { count: viewsThisWeek } = await supabase
          .from("listing_views")
          .select("id", { count: "exact", head: true })
          .in("listing_id", listingIds)
          .gte("created_at", weekAgo);

        const { count: viewsLastWeek } = await supabase
          .from("listing_views")
          .select("id", { count: "exact", head: true })
          .in("listing_id", listingIds)
          .gte("created_at", twoWeeksAgo)
          .lt("created_at", weekAgo);

        const { count: newOffers } = await supabase
          .from("listing_offers")
          .select("id", { count: "exact", head: true })
          .in("listing_id", listingIds)
          .gte("created_at", weekAgo);

        const { count: newMessages } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", sellerId)
          .gte("created_at", weekAgo);

        const vThisWeek = viewsThisWeek || 0;
        const vLastWeek = viewsLastWeek || 0;
        const viewTrend = vThisWeek > vLastWeek ? "↑" : vThisWeek < vLastWeek ? "↓" : "—";

        // Generate AI recommendation if available
        let recommendation = "حافظ على تحديث إعلاناتك بانتظام لزيادة الظهور";
        if (LOVABLE_API_KEY) {
          try {
            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  { role: "system", content: "أنت مستشار أعمال. أعطِ توصية واحدة مختصرة (جملة واحدة) لتحسين أداء الإعلان بناءً على الإحصائيات." },
                  { role: "user", content: `مشاهدات: ${vThisWeek} (${viewTrend}), عروض: ${newOffers || 0}, رسائل: ${newMessages || 0}` },
                ],
              }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              recommendation = aiData.choices?.[0]?.message?.content || recommendation;
            }
          } catch { /* fallback to default */ }
        }

        const reportData = {
          views_this_week: vThisWeek,
          views_last_week: vLastWeek,
          view_trend: viewTrend,
          new_offers: newOffers || 0,
          new_messages: newMessages || 0,
          recommendation,
          listings_count: listings.length,
        };

        // Store report
        await supabase.from("weekly_reports").insert({
          user_id: sellerId,
          listing_id: listings[0].id,
          report_data: reportData,
          week_start: weekStart,
        });

        // Send notification
        await supabase.from("notifications").insert({
          user_id: sellerId,
          title: "تقريرك الأسبوعي",
          body: `مشاهدات: ${vThisWeek} ${viewTrend} | عروض: ${newOffers || 0} | رسائل: ${newMessages || 0}. ${recommendation}`,
          type: "report",
          reference_type: "report",
        });

        // Email weekly report
        const anonKeyW = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabaseUrlW = Deno.env.get("SUPABASE_URL")!;
        fetch(`${supabaseUrlW}/functions/v1/notify-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKeyW}`, apikey: anonKeyW },
          body: JSON.stringify({
            userId: sellerId,
            category: "marketing",
            templateName: "weekly-report",
            idempotencyKey: `weekly-report-${sellerId}-${weekStart}`,
            templateData: {
              viewsThisWeek: vThisWeek,
              viewsLastWeek: vLastWeek,
              viewTrend,
              newOffers: newOffers || 0,
              newMessages: newMessages || 0,
              recommendation,
              listingsCount: listings.length,
            },
          }),
        }).catch(() => {});

        await supabase.from("agent_actions_log").insert({
          user_id: sellerId,
          action_type: "weekly_report",
          action_details: reportData,
          result: "success",
        });
        reports++;
      }
      results.weekly_report = { sent: reports };
    }

    // =======================================
    // Automation 11: Market price alert (weekly Monday)
    // =======================================
    if (automation === "market_price_alert") {
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, owner_id, price, city, business_activity")
        .eq("status", "published")
        .not("price", "is", null);

      let alerts = 0;
      for (const listing of listings || []) {
        if (!listing.city || !listing.business_activity || !listing.price) continue;

        // Check settings
        const { data: settings } = await supabase
          .from("listing_agent_settings")
          .select("notify_market_price, is_active")
          .eq("listing_id", listing.id)
          .maybeSingle();

        if (settings && (!settings.is_active || settings.notify_market_price === false)) continue;

        // Check if already alerted this month
        const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split("T")[0];
        const { data: existingAlert } = await supabase
          .from("price_alerts")
          .select("id")
          .eq("listing_id", listing.id)
          .gte("alert_date", monthAgo)
          .limit(1);

        if (existingAlert && existingAlert.length > 0) continue;

        // Find similar listings
        const { data: similar } = await supabase
          .from("listings")
          .select("price")
          .eq("status", "published")
          .eq("city", listing.city)
          .eq("business_activity", listing.business_activity)
          .neq("id", listing.id)
          .not("price", "is", null);

        if (!similar || similar.length < 2) continue;

        const avgPrice = similar.reduce((sum: number, s: any) => sum + (s.price || 0), 0) / similar.length;
        const diffPct = ((listing.price - avgPrice) / avgPrice) * 100;

        if (diffPct < 15) continue; // Only alert if 15%+ above market

        await supabase.from("price_alerts").insert({
          listing_id: listing.id,
          market_avg: Math.round(avgPrice),
          current_price: listing.price,
          difference_pct: Math.round(diffPct),
        });

        await supabase.from("notifications").insert({
          user_id: listing.owner_id,
          title: "تنبيه سعر السوق",
          body: `متوسط سعر "${listing.business_activity}" في ${listing.city} هو ${Math.round(avgPrice).toLocaleString()} ر.س. سعرك الحالي ${listing.price.toLocaleString()} ر.س. قد تحتاج مراجعة السعر.`,
          type: "price_alert",
          reference_type: "listing",
          reference_id: listing.id,
        });

        await supabase.from("agent_actions_log").insert({
          user_id: listing.owner_id,
          action_type: "market_price_alert",
          action_details: { listing_id: listing.id, market_avg: Math.round(avgPrice), current_price: listing.price, diff_pct: Math.round(diffPct) },
          result: "success",
          reference_type: "listing",
          reference_id: listing.id,
        });
        alerts++;
      }
      results.market_price_alert = { sent: alerts };
    }

    // =======================================
    // Automation 12: Post-deal followup (daily check)
    // =======================================
    if (automation === "post_deal_followup" || automation === "all_daily") {
      const now = new Date().toISOString();

      const { data: followups } = await supabase
        .from("post_deal_followups")
        .select("id, deal_id, followup_date, buyer_notified, seller_notified")
        .lte("followup_date", now)
        .is("notified_at", null);

      let sent = 0;
      for (const f of followups || []) {
        const { data: deal } = await supabase
          .from("deals")
          .select("buyer_id, seller_id, listing_id")
          .eq("id", f.deal_id)
          .single();

        if (!deal) continue;

        const { data: listing } = await supabase
          .from("listings")
          .select("title")
          .eq("id", deal.listing_id)
          .single();

        const title = listing?.title || "الصفقة";

        if (deal.buyer_id) {
          await supabase.from("notifications").insert({
            user_id: deal.buyer_id,
            title: "كيف كانت تجربتك؟",
            body: `مرت 7 أيام على إتمام صفقتك على "${title}". كيف تقيّم تجربتك؟`,
            type: "review_request",
            reference_type: "deal",
            reference_id: f.deal_id,
          });
        }

        if (deal.seller_id) {
          await supabase.from("notifications").insert({
            user_id: deal.seller_id,
            title: "شكراً لإتمام الصفقة",
            body: `شكراً لإتمام صفقتك على "${title}". قيّم تجربتك مع المشتري`,
            type: "review_request",
            reference_type: "deal",
            reference_id: f.deal_id,
          });
        }

        await supabase.from("post_deal_followups").update({
          buyer_notified: !!deal.buyer_id,
          seller_notified: !!deal.seller_id,
          notified_at: now,
        }).eq("id", f.id);

        await supabase.from("agent_actions_log").insert({
          user_id: deal.seller_id || deal.buyer_id,
          action_type: "post_deal_followup",
          action_details: { deal_id: f.deal_id },
          result: "success",
          reference_type: "deal",
          reference_id: f.deal_id,
        });
        sent++;
      }
      results.post_deal_followup = { sent };
    }

    // =======================================
    // Automation: Buyer follow-up in negotiations (every 12h)
    // =======================================
    if (automation === "buyer_negotiation_followup" || automation === "all_12h" || automation === "all_daily") {
      const hours24Ago = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const hours48Ago = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      const hours72Ago = new Date(Date.now() - 72 * 3600 * 1000).toISOString();

      // Find active negotiations where AI (seller side) sent last message and buyer hasn't replied
      const { data: deals } = await supabase
        .from("deals")
        .select("id, listing_id, buyer_id, seller_id, status, updated_at")
        .eq("status", "negotiating");

      let followups = 0;
      for (const deal of deals || []) {
        if (!deal.buyer_id) continue;

        // Get last message
        const { data: lastMsgs } = await supabase
          .from("negotiation_messages")
          .select("sender_id, sender_type, created_at, message_type")
          .eq("deal_id", deal.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (!lastMsgs || lastMsgs.length === 0) continue;
        const lastMsg = lastMsgs[0];

        // Only follow up if last message was from seller/AI (not buyer)
        if (lastMsg.sender_id === deal.buyer_id) continue;

        const lastMsgTime = new Date(lastMsg.created_at).getTime();
        const hoursSinceLast = (Date.now() - lastMsgTime) / 3600000;

        // Check if we already sent a followup recently
        const { data: recentFollowup } = await supabase
          .from("agent_actions_log")
          .select("id, action_details")
          .eq("action_type", "buyer_negotiation_followup")
          .eq("reference_id", deal.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastFollowupStage = recentFollowup?.[0]?.action_details?.stage || 0;

        const { data: listing } = await supabase
          .from("listings")
          .select("title")
          .eq("id", deal.listing_id)
          .single();

        const { data: buyerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", deal.buyer_id)
          .single();

        const buyerName = buyerProfile?.full_name?.split(" ")[0] || "المشتري";
        const listingTitle = listing?.title || "الإعلان";

        if (hoursSinceLast >= 72 && lastFollowupStage < 3) {
          // Stage 3: Update negotiation status + notify seller
          await supabase.from("notifications").insert([
            {
              user_id: deal.buyer_id,
              title: "تم إيقاف التفاوض مؤقتاً",
              body: `يا ${buyerName}، تم إيقاف التفاوض على "${listingTitle}" لعدم الرد. يمكنك العودة في أي وقت.`,
              type: "deal", reference_type: "deal", reference_id: deal.id,
            },
            {
              user_id: deal.seller_id,
              title: "المشتري لم يرد",
              body: `المشتري ${buyerName} لم يرد على التفاوض حول "${listingTitle}" منذ 72 ساعة.`,
              type: "deal", reference_type: "deal", reference_id: deal.id,
            },
          ]);
          await supabase.from("agent_actions_log").insert({
            user_id: deal.buyer_id, action_type: "buyer_negotiation_followup",
            action_details: { stage: 3, hours_since: Math.round(hoursSinceLast) },
            result: "timeout", reference_type: "deal", reference_id: deal.id,
          });
          followups++;
        } else if (hoursSinceLast >= 48 && lastFollowupStage < 2) {
          // Stage 2: Final followup
          await supabase.from("notifications").insert({
            user_id: deal.buyer_id,
            title: "آخر تذكير — العرض راح ينتهي",
            body: `يا ${buyerName}، العرض على "${listingTitle}" راح ينتهي خلال 24 ساعة. لو تبي نكمل، رد علينا.`,
            type: "deal", reference_type: "deal", reference_id: deal.id,
          });
          await supabase.from("agent_actions_log").insert({
            user_id: deal.buyer_id, action_type: "buyer_negotiation_followup",
            action_details: { stage: 2, hours_since: Math.round(hoursSinceLast) },
            result: "success", reference_type: "deal", reference_id: deal.id,
          });
          followups++;
        } else if (hoursSinceLast >= 24 && lastFollowupStage < 1) {
          // Stage 1: Friendly reminder
          await supabase.from("notifications").insert({
            user_id: deal.buyer_id,
            title: "لسه مهتم بالصفقة؟",
            body: `يا ${buyerName}، لسه مهتم بالصفقة على "${listingTitle}"؟ العرض متاح لك ونقدر نتفاهم.`,
            type: "deal", reference_type: "deal", reference_id: deal.id,
          });
          await supabase.from("agent_actions_log").insert({
            user_id: deal.buyer_id, action_type: "buyer_negotiation_followup",
            action_details: { stage: 1, hours_since: Math.round(hoursSinceLast) },
            result: "success", reference_type: "deal", reference_id: deal.id,
          });
          followups++;
        }
      }
      results.buyer_negotiation_followup = { sent: followups };
    }

    // =======================================
    // Automation: Seller offer analysis + delayed auto-reply
    // =======================================
    if (automation === "seller_offer_analysis" || automation === "all_12h") {
      // Find pending offers that need seller analysis notification
      const { data: offers } = await supabase
        .from("listing_offers")
        .select("id, listing_id, buyer_id, offered_price, created_at, status")
        .eq("status", "pending")
        .gt("created_at", new Date(Date.now() - 2 * 3600 * 1000).toISOString()); // only recent

      let analyzed = 0;
      for (const offer of offers || []) {
        // Check if already analyzed
        const { data: existingAnalysis } = await supabase
          .from("agent_actions_log")
          .select("id")
          .eq("action_type", "seller_offer_analysis")
          .eq("reference_id", offer.id)
          .limit(1);

        if (existingAnalysis && existingAnalysis.length > 0) continue;

        const { data: listing } = await supabase
          .from("listings")
          .select("title, owner_id, price, business_activity, city, ai_summary")
          .eq("id", offer.listing_id)
          .single();

        if (!listing) continue;

        // Get settings (for delay and auto-reply config)
        const { data: settings } = await supabase
          .from("listing_agent_settings")
          .select("auto_evaluate_offers, is_active, auto_reply_delay_minutes, min_acceptable_price")
          .eq("listing_id", offer.listing_id)
          .maybeSingle();

        if (settings && !settings.is_active) continue;

        const { data: buyerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", offer.buyer_id)
          .single();

        const { data: sellerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", listing.owner_id)
          .single();

        const buyerName = buyerProfile?.full_name?.split(" ")[0] || "المشتري";
        const sellerName = sellerProfile?.full_name?.split(" ")[0] || "البائع";
        const askingPrice = listing.price || 0;
        const pct = askingPrice > 0 ? Math.round((offer.offered_price / askingPrice) * 100) : 0;
        const delayMinutes = settings?.auto_reply_delay_minutes || 30;

        // Determine recommendation
        let recommendation: string;
        let suggestedPrice: number | null = null;
        if (pct >= 95) {
          recommendation = "قبول ✅";
        } else if (pct >= 85) {
          suggestedPrice = Math.round(askingPrice * 0.95);
          recommendation = `عرض مضاد بـ ${suggestedPrice.toLocaleString()} ر.س 🔄`;
        } else if (pct >= 70) {
          suggestedPrice = Math.round(askingPrice * 0.90);
          recommendation = `عرض مضاد بـ ${suggestedPrice.toLocaleString()} ر.س 🔄`;
        } else {
          recommendation = "رفض ❌";
        }

        // Send analysis notification to seller
        await supabase.from("notifications").insert({
          user_id: listing.owner_id,
          title: "تحليل عرض وارد",
          body: `يا ${sellerName}، وصلك عرض من ${buyerName} بقيمة ${offer.offered_price.toLocaleString()} ر.س (${pct}% من السعر المطلوب).\nالتوصية: ${recommendation}\nمقبل سيرد تلقائياً خلال ${delayMinutes} دقيقة إذا ما تدخلت.`,
          type: "offer",
          reference_type: "listing",
          reference_id: offer.listing_id,
        });

        await supabase.from("agent_actions_log").insert({
          user_id: listing.owner_id,
          action_type: "seller_offer_analysis",
          action_details: {
            offer_id: offer.id,
            offered_price: offer.offered_price,
            asking_price: askingPrice,
            percentage: pct,
            recommendation,
            suggested_price: suggestedPrice,
            auto_reply_delay_minutes: delayMinutes,
          },
          result: "success",
          reference_type: "offer",
          reference_id: offer.id,
        });
        analyzed++;
      }
      results.seller_offer_analysis = { analyzed };
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-automations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
