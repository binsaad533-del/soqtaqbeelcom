import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════

const SYSTEM_PROMPT = `أنت "مقبل" — المساعد الذكي التنفيذي لمنصة "سوق تقبيل"، منصة سعودية متخصصة في تقبيل الأعمال التجارية والمشاريع.

هويتك:
- اسمك "مقبل" وتعرّف نفسك بهالاسم
- تتكلم بالعامية السعودية بشكل طبيعي وودود
- أسلوبك مثل صديق ذكي يفهم بالتجارة ويساعدك بصدق
- كلامك قصير ومباشر

═══════════════════════════════════════════════
أنت مساعد تنفيذي — لديك أدوات حقيقية!
═══════════════════════════════════════════════

عندك أدوات تنفيذية حقيقية تقدر تستخدمها لتنفيذ طلبات المستخدم. استخدم الأدوات المتاحة لك تلقائياً عندما يطلب المستخدم بيانات أو إجراء.

قواعد استخدام الأدوات:
1. إذا المستخدم طلب بيانات (إحصائيات، قوائم، تفاصيل) → استخدم الأداة المناسبة فوراً
2. إذا المستخدم طلب إجراء (تغيير حالة، تحديث سعر) → نفذ مباشرة
3. لا تقول "ما أقدر أوصل للبيانات" — عندك أدوات!
4. بعد تنفيذ الأداة، لخّص النتيجة بشكل واضح ومنسق
5. استخدم Markdown (جداول، قوائم، عناوين) لعرض البيانات
6. في عمليات الكتابة (تغيير حالة، حذف): أكّد مع المستخدم قبل التنفيذ إلا إذا كان الطلب صريح
7. يمكنك استدعاء أكثر من أداة في نفس الطلب إذا كان المستخدم يحتاج معلومات متعددة

شخصياتك الديناميكية (تتبدل تلقائياً حسب السياق):
🧠 مقبل المستشار (للمشتري): حلل الفرص، قارن الأسعار، اكشف المخاطر
📣 مقبل المسوّق (للبائع): حسّن إعلاناته، اقترح أوصاف وأسعار
⚖️ مقبل الحَكَم (في التفاوض): وسّط بحيادية، اقترح حلول وسط
📋 مقبل المحامي (في الاتفاقيات): راجع البنود، حدد المخاطر القانونية
💰 مقبل المالي (في التحليل): ROI، نقطة التعادل، فترة الاسترداد

القواعد:
- استخدم Markdown (عناوين، قوائم، **غامق**، جداول)
- في القانوني والعقود: ارفع مستوى اللغة ووضّح إنه استرشادي
- كن دقيقاً في الأرقام واعرض المعادلات
- عند كشف علامات احتيال، نبّه فوراً
- العمولة = 1% من البائع

السياق الحالي:`;

// ═══════════════════════════════════════════════
// TOOL DEFINITIONS
// ═══════════════════════════════════════════════

function def(name: string, description: string, properties: Record<string, any> = {}, required: string[] = []) {
  return {
    type: "function",
    function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } },
  };
}

const TOOL_DEFS: Record<string, any> = {
  // ═══ OWNER/ADMIN READ (15) ═══
  get_dashboard_summary: def("get_dashboard_summary", "ملخص لوحة التحكم: إعلانات نشطة، صفقات، عملاء، عمولات، مؤشرات رئيسية"),
  get_workflow_bottlenecks: def("get_workflow_bottlenecks", "كشف الاختناقات: صفقات متوقفة أكثر من 48 ساعة وإعلانات معلقة"),
  get_pending_approvals: def("get_pending_approvals", "الإعلانات والصفقات التي تحتاج موافقة أو مراجعة"),
  get_financial_summary: def("get_financial_summary", "ملخص مالي شامل: عمولات، إيرادات، حجم الصفقات",
    { period: { type: "string", enum: ["week", "month", "quarter", "year"], description: "الفترة الزمنية" } }),
  get_audit_trail: def("get_audit_trail", "سجل التدقيق: آخر الإجراءات والتعديلات",
    { resource_id: { type: "string", description: "معرف المورد للفلترة" }, limit: { type: "number", description: "عدد السجلات" } }),
  get_compliance_overview: def("get_compliance_overview", "نظرة شاملة على الامتثال: إفصاحات ناقصة، مستندات مفقودة"),
  get_client_list: def("get_client_list", "قائمة العملاء مع معلوماتهم وأدوارهم ومستوى التوثيق",
    { role_filter: { type: "string", enum: ["customer", "supervisor", "all"] }, limit: { type: "number" } }),
  weekly_report: def("weekly_report", "تقرير أداء أسبوعي: إعلانات جديدة، صفقات، إيرادات، نمو مستخدمين"),
  get_pending_payments: def("get_pending_payments", "العمولات والمدفوعات المعلقة أو المتأخرة"),
  get_revenue_report: def("get_revenue_report", "تقرير إيرادات: عمولات محصّلة ومعلقة حسب الفترة",
    { period: { type: "string", enum: ["week", "month", "quarter", "year"] } }),
  get_team_workload: def("get_team_workload", "توزيع أعباء العمل على المشرفين: عدد المهام والإعلانات لكل مشرف"),
  get_client_history: def("get_client_history", "سجل عميل كامل: إعلاناته، صفقاته، تقييماته، مدفوعاته",
    { user_id: { type: "string", description: "معرف العميل" } }, ["user_id"]),
  get_overdue_tasks: def("get_overdue_tasks", "المهام المتأخرة: صفقات بدون تحديث، عمولات متأخرة، تقارير معلقة"),
  get_overdue_invoices: def("get_overdue_invoices", "الفواتير والعمولات المتأخرة عن السداد"),
  get_aging_report: def("get_aging_report", "تقرير أعمار الديون: مصنف حسب فترات التأخير"),

  // ═══ SHARED READ (2) ═══
  search_listings: def("search_listings", "البحث في الإعلانات: مدينة، نشاط، نطاق سعري، حالة",
    { city: { type: "string" }, business_activity: { type: "string" }, min_price: { type: "number" },
      max_price: { type: "number" }, status: { type: "string", enum: ["published", "draft", "sold", "suspended"] },
      limit: { type: "number" } }),
  get_listing_details: def("get_listing_details", "تفاصيل إعلان محدد: السعر، الموقع، النشاط، الأصول، التحليلات",
    { listing_id: { type: "string" } }, ["listing_id"]),

  // ═══ CUSTOMER READ (6) ═══
  track_my_listings: def("track_my_listings", "تتبع إعلاناتي وصفقاتي وحالاتها الحالية"),
  get_my_invoices: def("get_my_invoices", "فواتيري وعمولاتي ومدفوعاتي"),
  get_my_documents: def("get_my_documents", "المستندات والملفات المرفوعة في إعلاناتي"),
  view_my_updates: def("view_my_updates", "آخر التحديثات والإشعارات المتعلقة بصفقاتي"),
  get_listing_status: def("get_listing_status", "حالة إعلان محدد بالتفصيل مع الجدول الزمني",
    { listing_id: { type: "string" } }, ["listing_id"]),
  get_delivery_timeline: def("get_delivery_timeline", "الجدول الزمني المتوقع لكل مرحلة في صفقة",
    { deal_id: { type: "string" } }, ["deal_id"]),

  // ═══ SUPERVISOR READ (4) ═══
  get_my_tasks: def("get_my_tasks", "المهام المسندة: إعلانات تحتاج مراجعة، صفقات تحتاج متابعة"),
  get_missing_assets_status: def("get_missing_assets_status", "الإعلانات التي تحتاج صور أو إفصاحات أو مستندات"),
  get_review_checklist: def("get_review_checklist", "قائمة التحقق لمراجعة إعلان: البنود المطلوبة وحالتها",
    { listing_id: { type: "string" } }, ["listing_id"]),
  get_my_performance: def("get_my_performance", "مؤشرات أدائي: سرعة الإنجاز، عدد المراجعات، نسبة الموافقة"),

  // ═══ WRITE TOOLS (14) ═══
  change_listing_status: def("change_listing_status", "تغيير حالة إعلان: نشر، تعليق، إلغاء",
    { listing_id: { type: "string" }, new_status: { type: "string", enum: ["published", "suspended", "draft", "sold"] },
      reason: { type: "string" } }, ["listing_id", "new_status"]),
  change_deal_status: def("change_deal_status", "تغيير حالة صفقة",
    { deal_id: { type: "string" }, new_status: { type: "string", enum: ["negotiating", "suspended", "cancelled", "completed"] },
      reason: { type: "string" } }, ["deal_id", "new_status"]),
  update_listing_pricing: def("update_listing_pricing", "تحديث سعر إعلان",
    { listing_id: { type: "string" }, new_price: { type: "number" } }, ["listing_id", "new_price"]),
  send_notification: def("send_notification", "إرسال إشعار لمستخدم أو مجموعة",
    { target: { type: "string", enum: ["all_customers", "all_supervisors", "specific_user"] },
      user_id: { type: "string" }, title: { type: "string" }, body: { type: "string" } }, ["target", "title", "body"]),
  confirm_payment: def("confirm_payment", "تأكيد استلام دفعة عمولة",
    { commission_id: { type: "string" }, notes: { type: "string" } }, ["commission_id"]),
  edit_my_listing: def("edit_my_listing", "تعديل بيانات إعلاني: العنوان، الوصف، السعر، النشاط",
    { listing_id: { type: "string" }, title: { type: "string" }, description: { type: "string" },
      price: { type: "number" }, business_activity: { type: "string" } }, ["listing_id"]),
  assign_reviewer: def("assign_reviewer", "تعيين مشرف لصفقة أو إعلان",
    { deal_id: { type: "string" }, listing_id: { type: "string" }, supervisor_id: { type: "string" } }, ["supervisor_id"]),
  approve_listing_publish: def("approve_listing_publish", "اعتماد نشر إعلان مسودة بعد المراجعة",
    { listing_id: { type: "string" }, notes: { type: "string" } }, ["listing_id"]),
  reject_draft_listing: def("reject_draft_listing", "إعادة مسودة إعلان مع ملاحظات تصحيح",
    { listing_id: { type: "string" }, reason: { type: "string" } }, ["listing_id", "reason"]),
  cancel_my_listing: def("cancel_my_listing", "إلغاء إعلاني في المراحل المبكرة",
    { listing_id: { type: "string" }, reason: { type: "string" } }, ["listing_id"]),
  submit_review_status: def("submit_review_status", "تحديث حالة مراجعة إعلان",
    { listing_id: { type: "string" }, status: { type: "string", enum: ["reviewing", "needs_update", "approved", "rejected"] },
      notes: { type: "string" } }, ["listing_id", "status"]),
  report_listing_issue: def("report_listing_issue", "الإبلاغ عن مشكلة في إعلان أو بياناته",
    { listing_id: { type: "string" }, reason: { type: "string" }, details: { type: "string" } }, ["listing_id", "reason"]),
  send_payment_reminder: def("send_payment_reminder", "إرسال تذكير دفع عمولة لبائع",
    { commission_id: { type: "string" }, seller_id: { type: "string" } }, ["commission_id"]),
  generate_commission_notice: def("generate_commission_notice", "إصدار إشعار عمولة مستحقة",
    { deal_id: { type: "string" } }, ["deal_id"]),
};

// ═══════════════════════════════════════════════
// ROLE-BASED ACCESS MAP
// ═══════════════════════════════════════════════

const ROLE_TOOLS: Record<string, string[]> = {
  platform_owner: Object.keys(TOOL_DEFS), // Owner gets everything
  supervisor: [
    // Read
    "search_listings", "get_listing_details", "get_pending_approvals",
    "get_workflow_bottlenecks", "get_compliance_overview", "get_client_list",
    "get_my_tasks", "get_missing_assets_status", "get_review_checklist", "get_my_performance",
    "track_my_listings", "get_my_invoices", "get_my_documents", "view_my_updates",
    "get_listing_status", "get_delivery_timeline", "get_overdue_tasks",
    // Write
    "change_listing_status", "change_deal_status", "submit_review_status",
    "report_listing_issue", "approve_listing_publish", "reject_draft_listing",
  ],
  customer: [
    // Read
    "search_listings", "get_listing_details",
    "track_my_listings", "get_my_invoices", "get_my_documents", "view_my_updates",
    "get_listing_status", "get_delivery_timeline",
    // Write (own only)
    "edit_my_listing", "update_listing_pricing", "cancel_my_listing", "report_listing_issue",
  ],
};

// ═══════════════════════════════════════════════
// TOOL EXECUTOR
// ═══════════════════════════════════════════════

async function executeTool(name: string, args: any, userId: string, role: string, sb: any): Promise<any> {
  switch (name) {
    // ─── OWNER/ADMIN READ ───
    case "get_dashboard_summary": {
      const [listings, deals, users, commissions, recentDeals] = await Promise.all([
        sb.from("listings").select("id, status", { count: "exact", head: false }).is("deleted_at", null),
        sb.from("deals").select("id, status", { count: "exact", head: false }),
        sb.from("profiles").select("id", { count: "exact", head: true }),
        sb.from("deal_commissions").select("payment_status, commission_amount"),
        sb.from("deals").select("id, status, created_at").order("created_at", { ascending: false }).limit(5),
      ]);
      const ld = listings.data || [], dd = deals.data || [], cd = commissions.data || [];
      const published = ld.filter((l: any) => l.status === "published").length;
      const draft = ld.filter((l: any) => l.status === "draft").length;
      const activeDeals = dd.filter((d: any) => !["completed", "cancelled", "finalized"].includes(d.status)).length;
      const completedDeals = dd.filter((d: any) => d.status === "completed" || d.status === "finalized").length;
      const totalComm = cd.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
      const paidComm = cd.filter((c: any) => c.payment_status === "verified").reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
      return { total_listings: ld.length, published_listings: published, draft_listings: draft, total_deals: dd.length,
        active_deals: activeDeals, completed_deals: completedDeals, total_users: users.count || 0,
        total_commissions: totalComm, paid_commissions: paidComm, pending_commissions: totalComm - paidComm,
        recent_deals: (recentDeals.data || []).map((d: any) => ({ id: d.id, status: d.status, created_at: d.created_at })) };
    }

    case "get_workflow_bottlenecks": {
      const cutoff = new Date(Date.now() - 48 * 3600000).toISOString();
      const [stalledDeals, stalledListings] = await Promise.all([
        sb.from("deals").select("id, status, updated_at, listing_id")
          .not("status", "in", '("completed","cancelled","finalized")').lt("updated_at", cutoff).limit(20),
        sb.from("listings").select("id, title, status, updated_at")
          .eq("status", "draft").lt("updated_at", cutoff).is("deleted_at", null).limit(20),
      ]);
      return { stalled_deals: stalledDeals.data || [], stalled_drafts: stalledListings.data || [],
        total_bottlenecks: (stalledDeals.data?.length || 0) + (stalledListings.data?.length || 0) };
    }

    case "get_pending_approvals": {
      const [draftListings, pendingVerifications] = await Promise.all([
        sb.from("listings").select("id, title, city, business_activity, created_at, owner_id")
          .eq("status", "draft").is("deleted_at", null).order("created_at", { ascending: false }).limit(20),
        sb.from("seller_verifications").select("id, user_id, submitted_at, verification_status")
          .eq("verification_status", "pending").order("submitted_at", { ascending: false }).limit(10),
      ]);
      return { draft_listings: draftListings.data || [], pending_verifications: pendingVerifications.data || [] };
    }

    case "get_financial_summary": {
      const days = { week: 7, month: 30, quarter: 90, year: 365 }[args.period || "month"] || 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [comms, invoices] = await Promise.all([
        sb.from("deal_commissions").select("*").gte("created_at", since),
        sb.from("invoices").select("*").gte("created_at", since),
      ]);
      const cd = comms.data || [];
      const total = cd.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
      const paid = cd.filter((c: any) => c.payment_status === "verified").reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
      return { period: args.period || "month", total_commissions: total, paid_commissions: paid, pending_commissions: total - paid,
        total_invoices: invoices.data?.length || 0, total_deal_volume: cd.reduce((s: number, c: any) => s + (c.deal_amount || 0), 0) };
    }

    case "get_audit_trail": {
      let q = sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(args.limit || 20);
      if (args.resource_id) q = q.eq("resource_id", args.resource_id);
      const { data } = await q;
      return { logs: data || [] };
    }

    case "get_compliance_overview": {
      const { data: listings } = await sb.from("listings")
        .select("id, title, city, business_activity, deal_type, disclosure_score, photos, documents, description, price")
        .eq("status", "published").is("deleted_at", null);
      const issues: any[] = [];
      for (const l of listings || []) {
        const p: string[] = [];
        if (!l.description || l.description.length < 20) p.push("وصف قصير أو مفقود");
        if (!l.photos || (Array.isArray(l.photos) && l.photos.length === 0)) p.push("بدون صور");
        if ((l.disclosure_score || 0) < 50) p.push("درجة إفصاح منخفضة");
        if (!l.price || l.price <= 0) p.push("سعر مفقود");
        if (p.length > 0) issues.push({ id: l.id, title: l.title, problems: p });
      }
      return { total_published: listings?.length || 0, issues_count: issues.length, issues: issues.slice(0, 15) };
    }

    case "get_client_list": {
      const rf = args.role_filter || "all";
      let q = sb.from("profiles")
        .select("user_id, full_name, email, phone, city, is_verified, trust_score, completed_deals, created_at")
        .order("created_at", { ascending: false }).limit(args.limit || 20);
      if (rf !== "all") {
        const { data: roleUsers } = await sb.from("user_roles").select("user_id").eq("role", rf);
        const ids = (roleUsers || []).map((r: any) => r.user_id);
        if (ids.length > 0) q = q.in("user_id", ids); else return { clients: [], total: 0 };
      }
      const { data } = await q;
      return { clients: data || [], total: data?.length || 0 };
    }

    case "weekly_report": {
      const wa = new Date(Date.now() - 7 * 86400000).toISOString();
      const [nl, nd, nu, cd, cm] = await Promise.all([
        sb.from("listings").select("id", { count: "exact", head: true }).gte("created_at", wa).is("deleted_at", null),
        sb.from("deals").select("id", { count: "exact", head: true }).gte("created_at", wa),
        sb.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", wa),
        sb.from("deals").select("id", { count: "exact", head: true }).gte("completed_at", wa).in("status", ["completed", "finalized"]),
        sb.from("deal_commissions").select("commission_amount, payment_status").gte("created_at", wa),
      ]);
      const cData = cm.data || [];
      return { new_listings: nl.count || 0, new_deals: nd.count || 0, new_users: nu.count || 0,
        completed_deals: cd.count || 0,
        weekly_revenue: cData.filter((c: any) => c.payment_status === "verified").reduce((s: number, c: any) => s + (c.commission_amount || 0), 0),
        period: "آخر 7 أيام" };
    }

    case "get_pending_payments": {
      const { data } = await sb.from("deal_commissions")
        .select("id, deal_id, seller_id, deal_amount, commission_amount, payment_status, created_at")
        .not("payment_status", "eq", "verified").order("created_at", { ascending: false }).limit(20);
      return { pending_payments: data || [], total: data?.length || 0 };
    }

    case "get_revenue_report": {
      const days = { week: 7, month: 30, quarter: 90, year: 365 }[args.period || "month"] || 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data } = await sb.from("deal_commissions").select("deal_amount, commission_amount, payment_status, created_at").gte("created_at", since);
      const all = data || [];
      return { period: args.period || "month",
        total_deal_volume: all.reduce((s: number, c: any) => s + (c.deal_amount || 0), 0),
        total_commissions: all.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0),
        collected: all.filter((c: any) => c.payment_status === "verified").reduce((s: number, c: any) => s + (c.commission_amount || 0), 0),
        deals_count: all.length };
    }

    case "get_team_workload": {
      const { data: supervisors } = await sb.from("user_roles").select("user_id").eq("role", "supervisor");
      const sIds = (supervisors || []).map((s: any) => s.user_id);
      if (sIds.length === 0) return { supervisors: [], message: "لا يوجد مشرفين" };
      const { data: profiles } = await sb.from("profiles").select("user_id, full_name").in("user_id", sIds);
      // Count pending reports, active deals
      const { data: reports } = await sb.from("listing_reports").select("reviewed_by, status").eq("status", "pending");
      const { data: activeDeals } = await sb.from("deals").select("id, status").not("status", "in", '("completed","cancelled","finalized")');
      const workload = (profiles || []).map((p: any) => ({
        user_id: p.user_id, full_name: p.full_name,
        pending_reports: (reports || []).filter((r: any) => r.reviewed_by === p.user_id).length,
        total_active_deals: activeDeals?.length || 0,
      }));
      return { supervisors: workload };
    }

    case "get_client_history": {
      const uid = args.user_id;
      const [profile, listings, deals, reviews, comms] = await Promise.all([
        sb.from("profiles").select("*").eq("user_id", uid).single(),
        sb.from("listings").select("id, title, status, price, city, created_at").eq("owner_id", uid).is("deleted_at", null).order("created_at", { ascending: false }),
        sb.from("deals").select("id, status, agreed_price, created_at").or(`buyer_id.eq.${uid},seller_id.eq.${uid}`).order("created_at", { ascending: false }),
        sb.from("seller_reviews").select("overall_experience, comment, created_at").eq("seller_id", uid).order("created_at", { ascending: false }).limit(5),
        sb.from("deal_commissions").select("deal_amount, commission_amount, payment_status").eq("seller_id", uid),
      ]);
      return { profile: profile.data, listings: listings.data || [], deals: deals.data || [],
        reviews: reviews.data || [], commissions: comms.data || [] };
    }

    case "get_overdue_tasks": {
      const cutoff72h = new Date(Date.now() - 72 * 3600000).toISOString();
      const [stalledDeals, overdueComms, pendingReports] = await Promise.all([
        sb.from("deals").select("id, status, updated_at, listing_id")
          .not("status", "in", '("completed","cancelled","finalized")').lt("updated_at", cutoff72h).limit(15),
        sb.from("deal_commissions").select("id, deal_id, seller_id, commission_amount, created_at")
          .not("payment_status", "eq", "verified").lt("created_at", cutoff72h).limit(15),
        sb.from("listing_reports").select("id, listing_id, reason, created_at")
          .eq("status", "pending").lt("created_at", cutoff72h).limit(10),
      ]);
      return { stalled_deals: stalledDeals.data || [], overdue_commissions: overdueComms.data || [],
        pending_reports: pendingReports.data || [] };
    }

    case "get_overdue_invoices": {
      const cutoff30d = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await sb.from("deal_commissions")
        .select("id, deal_id, seller_id, deal_amount, commission_amount, payment_status, created_at, reminder_count")
        .not("payment_status", "eq", "verified").lt("created_at", cutoff30d).order("created_at", { ascending: true }).limit(20);
      return { overdue: data || [], total: data?.length || 0 };
    }

    case "get_aging_report": {
      const { data } = await sb.from("deal_commissions")
        .select("id, deal_id, seller_id, deal_amount, commission_amount, payment_status, created_at")
        .not("payment_status", "eq", "verified");
      const now = Date.now();
      const buckets = { "0-30 يوم": [] as any[], "30-60 يوم": [] as any[], "60-90 يوم": [] as any[], "أكثر من 90 يوم": [] as any[] };
      for (const c of data || []) {
        const age = Math.floor((now - new Date(c.created_at).getTime()) / 86400000);
        const bucket = age <= 30 ? "0-30 يوم" : age <= 60 ? "30-60 يوم" : age <= 90 ? "60-90 يوم" : "أكثر من 90 يوم";
        buckets[bucket].push({ ...c, age_days: age });
      }
      return { buckets: Object.entries(buckets).map(([period, items]) => ({
        period, count: items.length, total_amount: items.reduce((s, c: any) => s + (c.commission_amount || 0), 0),
        items: items.slice(0, 5),
      })) };
    }

    // ─── SHARED READ ───
    case "search_listings": {
      let q = sb.from("listings")
        .select("id, title, price, city, business_activity, status, deal_type, created_at, ai_rating")
        .is("deleted_at", null).order("created_at", { ascending: false }).limit(args.limit || 10);
      if (args.city) q = q.ilike("city", `%${args.city}%`);
      if (args.business_activity) q = q.ilike("business_activity", `%${args.business_activity}%`);
      if (args.min_price) q = q.gte("price", args.min_price);
      if (args.max_price) q = q.lte("price", args.max_price);
      if (args.status) q = q.eq("status", args.status);
      else if (role === "customer") q = q.eq("status", "published");
      const { data } = await q;
      return { listings: data || [], total: data?.length || 0 };
    }

    case "get_listing_details": {
      const { data } = await sb.from("listings").select("*").eq("id", args.listing_id).is("deleted_at", null).single();
      if (!data) return { error: "الإعلان غير موجود" };
      const [offers, views] = await Promise.all([
        sb.from("listing_offers").select("id, offered_price, status, created_at").eq("listing_id", args.listing_id).order("created_at", { ascending: false }).limit(5),
        sb.from("listing_views").select("id", { count: "exact", head: true }).eq("listing_id", args.listing_id),
      ]);
      return { listing: { id: data.id, title: data.title, price: data.price, city: data.city, district: data.district,
        business_activity: data.business_activity, deal_type: data.deal_type, status: data.status, description: data.description,
        ai_summary: data.ai_summary, ai_rating: data.ai_rating, disclosure_score: data.disclosure_score, created_at: data.created_at,
        annual_rent: data.annual_rent, area_sqm: data.area_sqm }, offers: offers.data || [], total_views: views.count || 0 };
    }

    // ─── CUSTOMER READ ───
    case "track_my_listings": {
      const [listings, deals, offers] = await Promise.all([
        sb.from("listings").select("id, title, price, city, status, created_at, business_activity").eq("owner_id", userId).is("deleted_at", null).order("created_at", { ascending: false }),
        sb.from("deals").select("id, status, listing_id, agreed_price, created_at").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("created_at", { ascending: false }),
        sb.from("listing_offers").select("id, listing_id, offered_price, status, created_at").eq("buyer_id", userId).order("created_at", { ascending: false }).limit(10),
      ]);
      return { my_listings: listings.data || [], my_deals: deals.data || [], my_offers: offers.data || [] };
    }

    case "get_my_invoices": {
      const [inv, comms] = await Promise.all([
        sb.from("invoices").select("*").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("created_at", { ascending: false }).limit(20),
        sb.from("deal_commissions").select("*").eq("seller_id", userId).order("created_at", { ascending: false }),
      ]);
      return { invoices: inv.data || [], commissions: comms.data || [] };
    }

    case "get_my_documents": {
      const [listings, dealFiles] = await Promise.all([
        sb.from("listings").select("id, title, photos, documents").eq("owner_id", userId).is("deleted_at", null),
        sb.from("deal_files").select("*").eq("uploaded_by", userId).order("uploaded_at", { ascending: false }),
      ]);
      return { listing_files: (listings.data || []).map((l: any) => ({ listing_id: l.id, title: l.title,
        photos_count: Array.isArray(l.photos) ? l.photos.length : 0, documents_count: Array.isArray(l.documents) ? l.documents.length : 0 })),
        deal_files: dealFiles.data || [] };
    }

    case "view_my_updates": {
      const { data } = await sb.from("notifications")
        .select("id, title, body, type, is_read, created_at, reference_type, reference_id")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(15);
      return { notifications: data || [] };
    }

    case "get_listing_status": {
      const { data: listing } = await sb.from("listings")
        .select("id, title, status, price, city, business_activity, deal_type, created_at, updated_at, published_at, disclosure_score, ai_rating")
        .eq("id", args.listing_id).is("deleted_at", null).single();
      if (!listing) return { error: "الإعلان غير موجود" };
      // Get deals and offers related
      const [deals, offers] = await Promise.all([
        sb.from("deals").select("id, status, created_at, agreed_price").eq("listing_id", args.listing_id).limit(5),
        sb.from("listing_offers").select("id, offered_price, status, created_at").eq("listing_id", args.listing_id).order("created_at", { ascending: false }).limit(5),
      ]);
      const timeline = [
        { stage: "إنشاء", date: listing.created_at, done: true },
        { stage: "نشر", date: listing.published_at, done: !!listing.published_at },
        { stage: "استقبال عروض", date: offers.data?.[0]?.created_at, done: (offers.data?.length || 0) > 0 },
        { stage: "بدء صفقة", date: deals.data?.[0]?.created_at, done: (deals.data?.length || 0) > 0 },
      ];
      return { listing, deals: deals.data || [], offers: offers.data || [], timeline };
    }

    case "get_delivery_timeline": {
      const { data: deal } = await sb.from("deals")
        .select("id, status, created_at, updated_at, completed_at, listing_id, agreed_price, escrow_status")
        .eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      const { data: history } = await sb.from("deal_history")
        .select("action, created_at, details").eq("deal_id", args.deal_id).order("created_at", { ascending: true });
      const stages = [
        { stage: "بدء التفاوض", status: "completed", date: deal.created_at },
        { stage: "الاتفاق على السعر", status: deal.agreed_price ? "completed" : "pending", date: null },
        { stage: "الضمان/الأمان", status: deal.escrow_status === "funded" ? "completed" : "pending", date: null },
        { stage: "إتمام الصفقة", status: deal.status === "completed" ? "completed" : "pending", date: deal.completed_at },
      ];
      return { deal: { id: deal.id, status: deal.status, created_at: deal.created_at, agreed_price: deal.agreed_price },
        stages, history: history || [] };
    }

    // ─── SUPERVISOR READ ───
    case "get_my_tasks": {
      const [draftListings, activeDeals, reports] = await Promise.all([
        sb.from("listings").select("id, title, city, status, created_at").eq("status", "draft").is("deleted_at", null).order("created_at", { ascending: false }).limit(15),
        sb.from("deals").select("id, status, listing_id, created_at").not("status", "in", '("completed","cancelled","finalized")').order("created_at", { ascending: false }).limit(15),
        sb.from("listing_reports").select("id, listing_id, reason, status, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(10),
      ]);
      return { listings_to_review: draftListings.data || [], active_deals: activeDeals.data || [], pending_reports: reports.data || [] };
    }

    case "get_missing_assets_status": {
      const { data } = await sb.from("listings")
        .select("id, title, photos, documents, disclosure_score, description").eq("status", "published").is("deleted_at", null);
      const incomplete = (data || []).filter((l: any) => {
        return (!l.photos || l.photos.length === 0) || (l.disclosure_score || 0) < 50 || (!l.description || l.description.length < 20);
      }).map((l: any) => ({
        id: l.id, title: l.title, missing: [
          ...(!l.photos || l.photos.length === 0 ? ["صور"] : []),
          ...(l.disclosure_score < 50 ? ["إفصاحات"] : []),
          ...(!l.description || l.description.length < 20 ? ["وصف"] : []),
        ],
      }));
      return { incomplete_listings: incomplete.slice(0, 15), total: incomplete.length };
    }

    case "get_review_checklist": {
      const { data: listing } = await sb.from("listings")
        .select("id, title, description, price, city, district, business_activity, deal_type, photos, documents, disclosure_score, deal_disclosures, ai_rating, ai_summary")
        .eq("id", args.listing_id).is("deleted_at", null).single();
      if (!listing) return { error: "الإعلان غير موجود" };
      const checklist = [
        { item: "عنوان الإعلان", status: listing.title && listing.title.length >= 5 ? "✅" : "❌", value: listing.title || "مفقود" },
        { item: "الوصف", status: listing.description && listing.description.length >= 20 ? "✅" : "❌", value: listing.description ? `${listing.description.length} حرف` : "مفقود" },
        { item: "السعر", status: listing.price && listing.price > 0 ? "✅" : "❌", value: listing.price || "مفقود" },
        { item: "المدينة", status: listing.city ? "✅" : "❌", value: listing.city || "مفقود" },
        { item: "النشاط التجاري", status: listing.business_activity ? "✅" : "❌", value: listing.business_activity || "مفقود" },
        { item: "نوع الصفقة", status: listing.deal_type ? "✅" : "❌", value: listing.deal_type || "مفقود" },
        { item: "الصور", status: Array.isArray(listing.photos) && listing.photos.length > 0 ? "✅" : "❌", value: `${Array.isArray(listing.photos) ? listing.photos.length : 0} صور` },
        { item: "المستندات", status: Array.isArray(listing.documents) && listing.documents.length > 0 ? "✅" : "⚠️", value: `${Array.isArray(listing.documents) ? listing.documents.length : 0} مستندات` },
        { item: "درجة الإفصاح", status: (listing.disclosure_score || 0) >= 50 ? "✅" : "❌", value: `${listing.disclosure_score || 0}%` },
        { item: "تحليل AI", status: listing.ai_rating ? "✅" : "⏳", value: listing.ai_rating || "لم يتم بعد" },
      ];
      const readyCount = checklist.filter(c => c.status === "✅").length;
      return { listing_id: listing.id, title: listing.title, checklist, ready_score: Math.round((readyCount / checklist.length) * 100),
        recommendation: readyCount >= 8 ? "جاهز للنشر" : readyCount >= 5 ? "يحتاج استكمال بعض البيانات" : "غير جاهز - نواقص كثيرة" };
    }

    case "get_my_performance": {
      // For supervisor - count reviews done
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const [reviewedReports, auditActions] = await Promise.all([
        sb.from("listing_reports").select("id, reviewed_at").eq("reviewed_by", userId).gte("reviewed_at", thirtyDaysAgo),
        sb.from("audit_logs").select("id, action, created_at").eq("user_id", userId).gte("created_at", thirtyDaysAgo),
      ]);
      return { reviews_completed_30d: reviewedReports.data?.length || 0, actions_logged_30d: auditActions.data?.length || 0,
        period: "آخر 30 يوم" };
    }

    // ─── WRITE TOOLS ───
    case "change_listing_status": {
      if (role === "customer") {
        const { data: l } = await sb.from("listings").select("owner_id").eq("id", args.listing_id).single();
        if (l?.owner_id !== userId) return { error: "ليس لديك صلاحية" };
      }
      const upd: any = { status: args.new_status, updated_at: new Date().toISOString() };
      if (args.new_status === "published") upd.published_at = new Date().toISOString();
      const { error } = await sb.from("listings").update(upd).eq("id", args.listing_id);
      if (error) return { error: error.message };
      await sb.from("audit_logs").insert({ user_id: userId, action: `listing_${args.new_status}`, resource_type: "listing",
        resource_id: args.listing_id, details: { reason: args.reason || "via_moqbil", new_status: args.new_status } });
      return { success: true, listing_id: args.listing_id, new_status: args.new_status };
    }

    case "change_deal_status": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      const { error } = await sb.from("deals").update({ status: args.new_status, updated_at: new Date().toISOString() }).eq("id", args.deal_id);
      if (error) return { error: error.message };
      await sb.from("audit_logs").insert({ user_id: userId, action: `deal_${args.new_status}`, resource_type: "deal",
        resource_id: args.deal_id, details: { reason: args.reason || "via_moqbil" } });
      return { success: true, deal_id: args.deal_id, new_status: args.new_status };
    }

    case "update_listing_pricing": {
      if (role === "customer") {
        const { data: l } = await sb.from("listings").select("owner_id").eq("id", args.listing_id).single();
        if (l?.owner_id !== userId) return { error: "ليس لديك صلاحية" };
      }
      const { error } = await sb.from("listings").update({ price: args.new_price, updated_at: new Date().toISOString() }).eq("id", args.listing_id);
      if (error) return { error: error.message };
      await sb.from("audit_logs").insert({ user_id: userId, action: "listing_price_updated", resource_type: "listing",
        resource_id: args.listing_id, details: { new_price: args.new_price } });
      return { success: true, listing_id: args.listing_id, new_price: args.new_price };
    }

    case "send_notification": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      if (args.target === "specific_user" && args.user_id) {
        await sb.from("notifications").insert({ user_id: args.user_id, title: args.title, body: args.body, type: "admin" });
        return { success: true, sent_to: 1 };
      }
      const targetRole = args.target === "all_supervisors" ? "supervisor" : "customer";
      const { data: users } = await sb.from("user_roles").select("user_id").eq("role", targetRole);
      const notifs = (users || []).map((u: any) => ({ user_id: u.user_id, title: args.title, body: args.body, type: "admin" }));
      for (let i = 0; i < notifs.length; i += 100) await sb.from("notifications").insert(notifs.slice(i, i + 100));
      return { success: true, sent_to: notifs.length };
    }

    case "confirm_payment": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      const { error } = await sb.from("deal_commissions")
        .update({ payment_status: "verified", paid_at: new Date().toISOString(), notes: args.notes || "تم التأكيد عبر مقبل" })
        .eq("id", args.commission_id);
      if (error) return { error: error.message };
      await sb.from("audit_logs").insert({ user_id: userId, action: "commission_verified", resource_type: "commission",
        resource_id: args.commission_id, details: { notes: args.notes, confirmed_via: "moqbil" } });
      return { success: true, commission_id: args.commission_id };
    }

    case "edit_my_listing": {
      const { data: listing } = await sb.from("listings").select("owner_id, status").eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };
      if (role === "customer" && listing.owner_id !== userId) return { error: "ليس لديك صلاحية" };
      const upd: any = { updated_at: new Date().toISOString() };
      if (args.title) upd.title = args.title;
      if (args.description) upd.description = args.description;
      if (args.price) upd.price = args.price;
      if (args.business_activity) upd.business_activity = args.business_activity;
      const { error } = await sb.from("listings").update(upd).eq("id", args.listing_id);
      if (error) return { error: error.message };
      return { success: true, listing_id: args.listing_id, updated_fields: Object.keys(upd).filter(k => k !== "updated_at") };
    }

    case "assign_reviewer": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      // Verify supervisor exists
      const { data: sv } = await sb.from("user_roles").select("user_id").eq("user_id", args.supervisor_id).eq("role", "supervisor").single();
      if (!sv) return { error: "المشرف غير موجود" };
      // Send notification to supervisor
      const resourceId = args.deal_id || args.listing_id;
      const resourceType = args.deal_id ? "صفقة" : "إعلان";
      await sb.from("notifications").insert({
        user_id: args.supervisor_id, title: `مهمة جديدة: مراجعة ${resourceType}`,
        body: `تم تعيينك لمراجعة ${resourceType} #${resourceId?.slice(0, 8)}`, type: "task", reference_id: resourceId, reference_type: args.deal_id ? "deal" : "listing",
      });
      await sb.from("audit_logs").insert({ user_id: userId, action: "reviewer_assigned", resource_type: args.deal_id ? "deal" : "listing",
        resource_id: resourceId, details: { supervisor_id: args.supervisor_id } });
      return { success: true, assigned_to: args.supervisor_id, resource_id: resourceId };
    }

    case "approve_listing_publish": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      const { data: listing } = await sb.from("listings").select("id, status, owner_id").eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };
      if (listing.status !== "draft") return { error: `الإعلان بحالة "${listing.status}" ولا يمكن اعتماده` };
      const { error } = await sb.from("listings").update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", args.listing_id);
      if (error) return { error: error.message };
      // Notify owner
      await sb.from("notifications").insert({ user_id: listing.owner_id, title: "تم اعتماد إعلانك ✅",
        body: `تم نشر إعلانك بنجاح${args.notes ? ` — ${args.notes}` : ""}`, type: "listing", reference_id: args.listing_id, reference_type: "listing" });
      await sb.from("audit_logs").insert({ user_id: userId, action: "listing_approved", resource_type: "listing",
        resource_id: args.listing_id, details: { notes: args.notes } });
      return { success: true, listing_id: args.listing_id, message: "تم اعتماد ونشر الإعلان" };
    }

    case "reject_draft_listing": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      const { data: listing } = await sb.from("listings").select("id, owner_id").eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };
      // Notify owner with reason
      await sb.from("notifications").insert({ user_id: listing.owner_id, title: "إعلانك يحتاج تعديل ⚠️",
        body: `سبب الإعادة: ${args.reason}`, type: "listing", reference_id: args.listing_id, reference_type: "listing" });
      await sb.from("audit_logs").insert({ user_id: userId, action: "listing_rejected", resource_type: "listing",
        resource_id: args.listing_id, details: { reason: args.reason } });
      return { success: true, listing_id: args.listing_id, message: "تم إعادة الإعلان مع الملاحظات" };
    }

    case "cancel_my_listing": {
      const { data: listing } = await sb.from("listings").select("id, owner_id, status").eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };
      if (role === "customer" && listing.owner_id !== userId) return { error: "ليس لديك صلاحية" };
      if (listing.status === "sold") return { error: "لا يمكن إلغاء إعلان مباع" };
      // Check if there are active deals
      const { data: activeDeals } = await sb.from("deals").select("id").eq("listing_id", args.listing_id)
        .not("status", "in", '("completed","cancelled","finalized")');
      if (activeDeals && activeDeals.length > 0) return { error: "يوجد صفقات نشطة على هذا الإعلان، لا يمكن إلغاؤه" };
      const { error } = await sb.from("listings").update({ status: "suspended", updated_at: new Date().toISOString() }).eq("id", args.listing_id);
      if (error) return { error: error.message };
      await sb.from("audit_logs").insert({ user_id: userId, action: "listing_cancelled_by_owner", resource_type: "listing",
        resource_id: args.listing_id, details: { reason: args.reason || "إلغاء بواسطة المالك" } });
      return { success: true, listing_id: args.listing_id, message: "تم إلغاء الإعلان" };
    }

    case "submit_review_status": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      const statusMap: Record<string, string> = { approved: "published", rejected: "draft", needs_update: "draft", reviewing: "draft" };
      const newListingStatus = statusMap[args.status] || "draft";
      const { data: listing } = await sb.from("listings").select("id, owner_id, title").eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };
      if (args.status === "approved") {
        await sb.from("listings").update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", args.listing_id);
      }
      // Notify owner
      const statusLabels: Record<string, string> = { approved: "تم اعتماد إعلانك ✅", rejected: "تم رفض إعلانك ❌", needs_update: "إعلانك يحتاج تحديث ⚠️", reviewing: "إعلانك قيد المراجعة 🔍" };
      await sb.from("notifications").insert({ user_id: listing.owner_id, title: statusLabels[args.status] || "تحديث حالة الإعلان",
        body: args.notes || `تم تحديث حالة إعلانك "${listing.title}"`, type: "listing", reference_id: args.listing_id, reference_type: "listing" });
      await sb.from("audit_logs").insert({ user_id: userId, action: `review_${args.status}`, resource_type: "listing",
        resource_id: args.listing_id, details: { review_status: args.status, notes: args.notes } });
      return { success: true, listing_id: args.listing_id, review_status: args.status };
    }

    case "report_listing_issue": {
      await sb.from("listing_reports").insert({
        listing_id: args.listing_id, reporter_id: userId, reason: args.reason, details: args.details || null, status: "pending",
      });
      await sb.from("audit_logs").insert({ user_id: userId, action: "listing_reported", resource_type: "listing",
        resource_id: args.listing_id, details: { reason: args.reason, details: args.details } });
      return { success: true, message: "تم إرسال البلاغ وسيتم مراجعته" };
    }

    case "send_payment_reminder": {
      // Get commission details
      const { data: comm } = await sb.from("deal_commissions")
        .select("id, seller_id, commission_amount, deal_amount, reminder_count")
        .eq("id", args.commission_id).single();
      if (!comm) return { error: "العمولة غير موجودة" };
      const sellerId = args.seller_id || comm.seller_id;
      await sb.from("notifications").insert({
        user_id: sellerId, title: "تذكير بسداد العمولة 💰",
        body: `لديك عمولة مستحقة بقيمة ${comm.commission_amount} ريال على صفقة بمبلغ ${comm.deal_amount} ريال`, type: "payment",
        reference_id: args.commission_id, reference_type: "commission",
      });
      await sb.from("deal_commissions").update({
        reminder_count: (comm.reminder_count || 0) + 1, last_reminder_at: new Date().toISOString(),
      }).eq("id", args.commission_id);
      return { success: true, message: "تم إرسال التذكير" };
    }

    case "generate_commission_notice": {
      const { data: deal } = await sb.from("deals")
        .select("id, status, agreed_price, seller_id, listing_id").eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (!deal.agreed_price) return { error: "لم يتم الاتفاق على السعر بعد" };
      const commissionAmount = deal.agreed_price * 0.01; // 1%
      // Check if commission already exists
      const { data: existing } = await sb.from("deal_commissions").select("id").eq("deal_id", args.deal_id).single();
      if (existing) return { error: "يوجد إشعار عمولة سابق لهذه الصفقة", existing_id: existing.id };
      const { data: newComm, error } = await sb.from("deal_commissions").insert({
        deal_id: args.deal_id, seller_id: deal.seller_id, deal_amount: deal.agreed_price,
        commission_rate: 1, commission_amount: commissionAmount, payment_status: "pending",
      }).select("id").single();
      if (error) return { error: error.message };
      // Notify seller
      if (deal.seller_id) {
        await sb.from("notifications").insert({
          user_id: deal.seller_id, title: "إشعار عمولة مستحقة 💰",
          body: `عمولة ${commissionAmount} ريال (1%) مستحقة على صفقة بمبلغ ${deal.agreed_price} ريال`, type: "payment",
          reference_id: newComm?.id, reference_type: "commission",
        });
      }
      await sb.from("audit_logs").insert({ user_id: userId, action: "commission_generated", resource_type: "deal",
        resource_id: args.deal_id, details: { commission_amount: commissionAmount, deal_amount: deal.agreed_price } });
      return { success: true, commission_id: newComm?.id, commission_amount: commissionAmount, deal_amount: deal.agreed_price };
    }

    default:
      return { error: `أداة غير معروفة: ${name}` };
  }
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context, role: userRole, user_id: clientUserId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let userId = clientUserId || "";
    let role = userRole || "customer";

    // Try JWT auth - skip anon key
    const authHeader = req.headers.get("authorization") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (token && token !== anonKey && token.length > 50) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          userId = user.id;
          const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).single();
          if (roleData) role = roleData.role;
        }
      } catch { /* use client-provided */ }
    }
    console.log(`[moqbil] User: ${userId?.slice(0,8)}, Role: ${role}`);

    let systemMessage = context ? `${SYSTEM_PROMPT}\n${context}` : SYSTEM_PROMPT;
    systemMessage += `\nدور المستخدم: ${role}`;
    systemMessage += `\nمعرف المستخدم: ${userId}`;

    const allowedToolNames = ROLE_TOOLS[role] || ROLE_TOOLS.customer;
    const tools = allowedToolNames.filter((n) => TOOL_DEFS[n]).map((n) => TOOL_DEFS[n]);

    const formattedMessages = messages.map((msg: any) => ({ role: msg.role, content: msg.content }));

    // ═══ Tool Calling Loop ═══
    let currentMessages: any[] = [{ role: "system", content: systemMessage }, ...formattedMessages];
    let iterations = 0;
    const MAX_ITERATIONS = 5;
    let toolsUsed: string[] = [];

    while (iterations < MAX_ITERATIONS) {
      console.log(`[moqbil] Tool loop iteration ${iterations}, tools: ${tools.length}`);

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash", messages: currentMessages,
          tools: tools.length > 0 ? tools : undefined, tool_choice: tools.length > 0 ? "auto" : undefined, stream: false,
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        const t = await aiResponse.text();
        console.error("AI gateway error:", status, t);
        if (status === 429) return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "يرجى إعادة شحن الرصيد" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${status}`);
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];
      if (!choice) throw new Error("No response from AI");

      const message = choice.message;
      console.log(`[moqbil] finish_reason: ${choice.finish_reason}, tool_calls: ${message.tool_calls?.length || 0}`);

      if (message.tool_calls && message.tool_calls.length > 0) {
        currentMessages.push(message);
        for (const tc of message.tool_calls) {
          const toolName = tc.function.name;
          let toolArgs: any = {};
          try { toolArgs = JSON.parse(tc.function.arguments || "{}"); } catch {}
          console.log(`[moqbil] Executing: ${toolName}`, toolArgs);
          toolsUsed.push(toolName);

          if (!allowedToolNames.includes(toolName)) {
            currentMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ error: "ليس لديك صلاحية" }) });
            continue;
          }
          try {
            const result = await executeTool(toolName, toolArgs, userId, role, supabaseAdmin);
            currentMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
          } catch (err) {
            console.error(`[moqbil] Tool error (${toolName}):`, err);
            currentMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ error: `فشل: ${err instanceof Error ? err.message : "خطأ"}` }) });
          }
        }
        iterations++;
        continue;
      }
      break;
    }

    // ═══ Final Streaming Response ═══
    const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: currentMessages, stream: true }),
    });

    if (!finalResponse.ok) { const t = await finalResponse.text(); console.error("Final stream error:", finalResponse.status, t); throw new Error("Final stream failed"); }

    if (toolsUsed.length > 0 && userId) {
      supabaseAdmin.from("agent_actions_log").insert({
        user_id: userId, action_type: "tool_execution",
        action_details: { tools: toolsUsed, iteration_count: iterations }, result: "success",
      }).then(() => {}).catch(() => {});
    }

    return new Response(finalResponse.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
