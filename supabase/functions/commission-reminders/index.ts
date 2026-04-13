import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = Date.now();
    const DAY = 86400000;

    // Get all unpaid/reminder_sent commissions
    const { data: commissions } = await supabase
      .from("deal_commissions")
      .select("id, deal_id, seller_id, commission_amount, total_with_vat, created_at, reminder_count, last_reminder_at, payment_status")
      .in("payment_status", ["unpaid", "reminder_sent"]);

    if (!commissions || commissions.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const comm of commissions) {
      const ageDays = Math.floor((now - new Date(comm.created_at).getTime()) / DAY);
      const lastReminder = comm.last_reminder_at ? new Date(comm.last_reminder_at).getTime() : 0;
      const daysSinceLastReminder = lastReminder ? Math.floor((now - lastReminder) / DAY) : 999;

      // Don't send more than 1 reminder per 7 days
      if (daysSinceLastReminder < 7) continue;

      let shouldRemind = false;
      let reminderLevel = "";
      let shouldEscalate = false;
      let shouldSuspend = false;

      if (ageDays >= 45 && comm.reminder_count < 5) {
        shouldSuspend = true;
        shouldRemind = true;
        reminderLevel = "suspension";
      } else if (ageDays >= 30 && comm.reminder_count < 4) {
        shouldEscalate = true;
        shouldRemind = true;
        reminderLevel = "escalation";
      } else if (ageDays >= 21 && comm.reminder_count < 3) {
        shouldRemind = true;
        reminderLevel = "final_warning";
      } else if (ageDays >= 14 && comm.reminder_count < 2) {
        shouldRemind = true;
        reminderLevel = "second";
      } else if (ageDays >= 7 && comm.reminder_count < 1) {
        shouldRemind = true;
        reminderLevel = "first";
      }

      if (!shouldRemind) continue;

      // Get listing title
      const { data: deal } = await supabase
        .from("deals")
        .select("listing_id")
        .eq("id", comm.deal_id)
        .maybeSingle();
      const { data: listing } = deal?.listing_id
        ? await supabase.from("listings").select("title").eq("id", deal.listing_id).maybeSingle()
        : { data: null };
      const title = listing?.title || "صفقتك";
      const amount = comm.total_with_vat || comm.commission_amount;

      // Send notification to seller
      const messages: Record<string, string> = {
        first: `تذكير ودي: عمولة بقيمة ${amount} ر.س مستحقة على "${title}". نأمل التكرم بالسداد عبر التحويل البنكي.`,
        second: `تذكير ثاني: عمولة بقيمة ${amount} ر.س لا تزال معلقة على "${title}". يرجى المبادرة بالسداد.`,
        final_warning: `آخر تذكير قبل التصعيد: عمولة بقيمة ${amount} ر.س متأخرة على "${title}". يرجى السداد الفوري.`,
        escalation: `عمولة متأخرة أكثر من 30 يوم على "${title}". سيتم اتخاذ إجراء إداري.`,
        suspension: `تم تعليق حسابك بسبب عمولة متأخرة (${amount} ر.س) على "${title}". سدد لإعادة التفعيل.`,
      };

      // Deduplicate: check if same notification was sent in last 24h
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", comm.seller_id)
        .eq("type", "commission_reminder")
        .eq("reference_id", comm.deal_id)
        .gte("created_at", twentyFourHoursAgo);

      if ((recentCount || 0) > 0) {
        console.log(`Skipping commission reminder for deal ${comm.deal_id} — already sent today`);
        continue;
      }

      await supabase.from("notifications").insert({
        user_id: comm.seller_id,
        title: reminderLevel === "suspension" ? "تعليق الحساب — عمولة متأخرة" : "تذكير بسداد العمولة",
        body: messages[reminderLevel],
        type: "commission_reminder",
        reference_type: "deal",
        reference_id: comm.deal_id,
      });

      // Update commission
      await supabase
        .from("deal_commissions")
        .update({
          reminder_count: comm.reminder_count + 1,
          last_reminder_at: new Date().toISOString(),
          payment_status: "reminder_sent",
        })
        .eq("id", comm.id);

      // Send SMS
      await supabase.functions.invoke("notify-sms", {
        body: {
          user_id: comm.seller_id,
          event_type: "commission_reminder",
          data: { title, price: amount },
        },
      });

      // Send Email
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", comm.seller_id)
        .maybeSingle();

      if (sellerProfile?.email) {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "commission-reminder",
            recipientEmail: sellerProfile.email,
            idempotencyKey: `commission-reminder-auto-${comm.id}-${comm.reminder_count + 1}`,
            templateData: {
              recipientName: sellerProfile.full_name || undefined,
              listingTitle: title,
              amount: String(amount),
              reminderLevel,
            },
          },
        });
      }

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "commission_reminder_sent",
        resource_type: "commission",
        resource_id: comm.id,
        details: { reminder_level: reminderLevel, age_days: ageDays, deal_id: comm.deal_id },
      });

      // Escalate to owner/financial manager
      if (shouldEscalate || shouldSuspend) {
        // Get owners and financial managers
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("role", ["platform_owner", "financial_manager"]);

        for (const admin of admins || []) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: shouldSuspend ? "تعليق بائع — عمولة متأخرة 45+ يوم" : "عمولة متأخرة 30+ يوم — تحتاج تصعيد",
            body: `عمولة بقيمة ${amount} ر.س متأخرة ${ageDays} يوم على "${title}".`,
            type: "commission_escalation",
            reference_type: "deal",
            reference_id: comm.deal_id,
          });
        }
      }

      // Suspend seller at 45+ days
      if (shouldSuspend) {
        await supabase
          .from("profiles")
          .update({ is_commission_suspended: true })
          .eq("user_id", comm.seller_id);
      }

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("commission-reminders error:", error);
    return new Response(JSON.stringify({ error: "فشل تشغيل التذكيرات" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
