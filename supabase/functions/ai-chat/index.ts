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
// TOOL DEFINITIONS (OpenAI function calling format)
// ═══════════════════════════════════════════════

const TOOL_DEFS: Record<string, any> = {
  // ─── Owner/Admin Read Tools ───
  get_dashboard_summary: {
    type: "function",
    function: {
      name: "get_dashboard_summary",
      description: "ملخص لوحة التحكم: عدد الإعلانات النشطة، الصفقات، العملاء، العمولات المعلقة، والمؤشرات الرئيسية",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },
  get_workflow_bottlenecks: {
    type: "function",
    function: {
      name: "get_workflow_bottlenecks",
      description: "كشف الاختناقات: الصفقات المتوقفة أكثر من 48 ساعة والإعلانات المعلقة بدون تحرك",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },
  get_pending_approvals: {
    type: "function",
    function: {
      name: "get_pending_approvals",
      description: "عرض الإعلانات والصفقات التي تحتاج موافقة أو مراجعة",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },
  get_financial_summary: {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "ملخص مالي شامل: إجمالي العمولات، المحصّلة، المعلقة، إيرادات الفترة",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["week", "month", "quarter", "year"], description: "الفترة الزمنية" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  get_audit_trail: {
    type: "function",
    function: {
      name: "get_audit_trail",
      description: "سجل التدقيق: آخر الإجراءات والتعديلات في المنصة",
      parameters: {
        type: "object",
        properties: {
          resource_id: { type: "string", description: "معرف المورد (إعلان أو صفقة) للفلترة" },
          limit: { type: "number", description: "عدد السجلات (الافتراضي 20)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  get_compliance_overview: {
    type: "function",
    function: {
      name: "get_compliance_overview",
      description: "نظرة شاملة على الامتثال: إعلانات بإفصاحات ناقصة، مستندات مفقودة، بيانات غير مكتملة",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },
  get_client_list: {
    type: "function",
    function: {
      name: "get_client_list",
      description: "قائمة العملاء مع معلوماتهم الأساسية وأدوارهم ومستوى التوثيق",
      parameters: {
        type: "object",
        properties: {
          role_filter: { type: "string", enum: ["customer", "supervisor", "all"], description: "فلترة حسب الدور" },
          limit: { type: "number", description: "عدد النتائج (الافتراضي 20)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  weekly_report: {
    type: "function",
    function: {
      name: "weekly_report",
      description: "تقرير أداء أسبوعي فوري للمنصة: إعلانات جديدة، صفقات، إيرادات، نمو المستخدمين",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },
  get_pending_payments: {
    type: "function",
    function: {
      name: "get_pending_payments",
      description: "عرض العمولات والمدفوعات المعلقة أو المتأخرة",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },
  get_revenue_report: {
    type: "function",
    function: {
      name: "get_revenue_report",
      description: "تقرير الإيرادات: عمولات محصّلة، معلقة، إجمالي حسب الفترة",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["week", "month", "quarter", "year"] },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },

  // ─── Shared Read Tools ───
  search_listings: {
    type: "function",
    function: {
      name: "search_listings",
      description: "البحث في الإعلانات بمعايير متعددة: مدينة، نشاط، نطاق سعري، حالة",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "المدينة" },
          business_activity: { type: "string", description: "نوع النشاط التجاري" },
          min_price: { type: "number", description: "أقل سعر" },
          max_price: { type: "number", description: "أعلى سعر" },
          status: { type: "string", enum: ["published", "draft", "sold", "suspended"], description: "حالة الإعلان" },
          limit: { type: "number", description: "عدد النتائج (الافتراضي 10)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  get_listing_details: {
    type: "function",
    function: {
      name: "get_listing_details",
      description: "عرض تفاصيل إعلان محدد بالكامل: السعر، الموقع، النشاط، الأصول، التحليلات",
      parameters: {
        type: "object",
        properties: {
          listing_id: { type: "string", description: "معرف الإعلان" },
        },
        required: ["listing_id"],
        additionalProperties: false,
      },
    },
  },

  // ─── Customer Tools ───
  track_my_listings: {
    type: "function",
    function: {
      name: "track_my_listings",
      description: "تتبع إعلاناتي وصفقاتي وحالاتها الحالية",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },
  get_my_invoices: {
    type: "function",
    function: {
      name: "get_my_invoices",
      description: "عرض فواتيري وعمولاتي ومدفوعاتي",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },
  get_my_documents: {
    type: "function",
    function: {
      name: "get_my_documents",
      description: "عرض المستندات والملفات المرفوعة في إعلاناتي",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },
  view_my_updates: {
    type: "function",
    function: {
      name: "view_my_updates",
      description: "آخر التحديثات والإشعارات المتعلقة بصفقاتي وإعلاناتي",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },

  // ─── Supervisor Tools ───
  get_my_tasks: {
    type: "function",
    function: {
      name: "get_my_tasks",
      description: "عرض المهام المسندة إليّ: إعلانات تحتاج مراجعة، صفقات تحتاج متابعة",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },
  get_missing_assets_status: {
    type: "function",
    function: {
      name: "get_missing_assets_status",
      description: "عرض الإعلانات التي تحتاج صور أو إفصاحات أو مستندات ناقصة",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },

  // ─── Write Tools ───
  change_listing_status: {
    type: "function",
    function: {
      name: "change_listing_status",
      description: "تغيير حالة إعلان: نشر، تعليق، إلغاء، إعادة تنشيط. يشمل تسجيل السبب",
      parameters: {
        type: "object",
        properties: {
          listing_id: { type: "string", description: "معرف الإعلان" },
          new_status: { type: "string", enum: ["published", "suspended", "draft", "sold"], description: "الحالة الجديدة" },
          reason: { type: "string", description: "سبب التغيير" },
        },
        required: ["listing_id", "new_status"],
        additionalProperties: false,
      },
    },
  },
  change_deal_status: {
    type: "function",
    function: {
      name: "change_deal_status",
      description: "تغيير حالة صفقة: تعليق، تنشيط، إلغاء",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "string", description: "معرف الصفقة" },
          new_status: { type: "string", enum: ["negotiating", "suspended", "cancelled", "completed"], description: "الحالة الجديدة" },
          reason: { type: "string", description: "سبب التغيير" },
        },
        required: ["deal_id", "new_status"],
        additionalProperties: false,
      },
    },
  },
  update_listing_pricing: {
    type: "function",
    function: {
      name: "update_listing_pricing",
      description: "تحديث سعر إعلان",
      parameters: {
        type: "object",
        properties: {
          listing_id: { type: "string", description: "معرف الإعلان" },
          new_price: { type: "number", description: "السعر الجديد" },
        },
        required: ["listing_id", "new_price"],
        additionalProperties: false,
      },
    },
  },
  send_notification: {
    type: "function",
    function: {
      name: "send_notification",
      description: "إرسال إشعار لمستخدم أو مجموعة مستخدمين",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", enum: ["all_customers", "all_supervisors", "specific_user"], description: "الهدف" },
          user_id: { type: "string", description: "معرف المستخدم (إذا كان الهدف specific_user)" },
          title: { type: "string", description: "عنوان الإشعار" },
          body: { type: "string", description: "نص الإشعار" },
        },
        required: ["target", "title", "body"],
        additionalProperties: false,
      },
    },
  },
  confirm_payment: {
    type: "function",
    function: {
      name: "confirm_payment",
      description: "تأكيد استلام دفعة عمولة من بائع",
      parameters: {
        type: "object",
        properties: {
          commission_id: { type: "string", description: "معرف العمولة" },
          notes: { type: "string", description: "ملاحظات" },
        },
        required: ["commission_id"],
        additionalProperties: false,
      },
    },
  },
  edit_my_listing: {
    type: "function",
    function: {
      name: "edit_my_listing",
      description: "تعديل بيانات إعلاني: العنوان، الوصف، السعر، النشاط",
      parameters: {
        type: "object",
        properties: {
          listing_id: { type: "string", description: "معرف الإعلان" },
          title: { type: "string", description: "العنوان الجديد" },
          description: { type: "string", description: "الوصف الجديد" },
          price: { type: "number", description: "السعر الجديد" },
          business_activity: { type: "string", description: "النشاط التجاري" },
        },
        required: ["listing_id"],
        additionalProperties: false,
      },
    },
  },
};

// ═══════════════════════════════════════════════
// ROLE-BASED ACCESS MAP
// ═══════════════════════════════════════════════

const ROLE_TOOLS: Record<string, string[]> = {
  platform_owner: [
    // All read tools
    "get_dashboard_summary", "get_workflow_bottlenecks", "get_pending_approvals",
    "get_financial_summary", "get_audit_trail", "get_compliance_overview",
    "get_client_list", "weekly_report", "get_pending_payments", "get_revenue_report",
    "search_listings", "get_listing_details",
    "track_my_listings", "get_my_invoices", "get_my_documents", "view_my_updates",
    // All write tools
    "change_listing_status", "change_deal_status", "update_listing_pricing",
    "send_notification", "confirm_payment", "edit_my_listing",
    // Supervisor tools too
    "get_my_tasks", "get_missing_assets_status",
  ],
  supervisor: [
    "search_listings", "get_listing_details", "get_pending_approvals",
    "get_workflow_bottlenecks", "get_compliance_overview", "get_client_list",
    "get_my_tasks", "get_missing_assets_status",
    "track_my_listings", "get_my_invoices", "get_my_documents", "view_my_updates",
    // Limited write
    "change_listing_status", "change_deal_status",
  ],
  customer: [
    "search_listings", "get_listing_details",
    "track_my_listings", "get_my_invoices", "get_my_documents", "view_my_updates",
    // Own listing edits
    "edit_my_listing", "update_listing_pricing",
  ],
};

// ═══════════════════════════════════════════════
// TOOL EXECUTOR
// ═══════════════════════════════════════════════

async function executeTool(
  name: string,
  args: any,
  userId: string,
  role: string,
  supabase: any,
): Promise<any> {
  switch (name) {
    // ─── OWNER/ADMIN READ ───
    case "get_dashboard_summary": {
      const [listings, deals, users, commissions, recentDeals] = await Promise.all([
        supabase.from("listings").select("id, status", { count: "exact", head: false })
          .is("deleted_at", null),
        supabase.from("deals").select("id, status", { count: "exact", head: false }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("deal_commissions").select("payment_status, commission_amount"),
        supabase.from("deals").select("id, status, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const listingData = listings.data || [];
      const dealData = deals.data || [];
      const commData = commissions.data || [];

      const published = listingData.filter((l: any) => l.status === "published").length;
      const draft = listingData.filter((l: any) => l.status === "draft").length;
      const activeDeals = dealData.filter((d: any) => !["completed", "cancelled"].includes(d.status)).length;
      const completedDeals = dealData.filter((d: any) => d.status === "completed" || d.status === "finalized").length;
      const totalCommissions = commData.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
      const paidCommissions = commData.filter((c: any) => c.payment_status === "verified")
        .reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
      const pendingCommissions = totalCommissions - paidCommissions;

      return {
        total_listings: listingData.length,
        published_listings: published,
        draft_listings: draft,
        total_deals: dealData.length,
        active_deals: activeDeals,
        completed_deals: completedDeals,
        total_users: users.count || 0,
        total_commissions: totalCommissions,
        paid_commissions: paidCommissions,
        pending_commissions: pendingCommissions,
        recent_deals: (recentDeals.data || []).map((d: any) => ({ id: d.id, status: d.status, created_at: d.created_at })),
      };
    }

    case "get_workflow_bottlenecks": {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const [stalledDeals, stalledListings] = await Promise.all([
        supabase.from("deals").select("id, status, updated_at, listing_id")
          .not("status", "in", '("completed","cancelled","finalized")')
          .lt("updated_at", cutoff).limit(20),
        supabase.from("listings").select("id, title, status, updated_at")
          .eq("status", "draft").lt("updated_at", cutoff).is("deleted_at", null).limit(20),
      ]);
      return {
        stalled_deals: stalledDeals.data || [],
        stalled_drafts: stalledListings.data || [],
        total_bottlenecks: (stalledDeals.data?.length || 0) + (stalledListings.data?.length || 0),
      };
    }

    case "get_pending_approvals": {
      const [draftListings, pendingVerifications] = await Promise.all([
        supabase.from("listings").select("id, title, city, business_activity, created_at, owner_id")
          .eq("status", "draft").is("deleted_at", null).order("created_at", { ascending: false }).limit(20),
        supabase.from("seller_verifications").select("id, user_id, submitted_at, verification_status")
          .eq("verification_status", "pending").order("submitted_at", { ascending: false }).limit(10),
      ]);
      return {
        draft_listings: draftListings.data || [],
        pending_verifications: pendingVerifications.data || [],
      };
    }

    case "get_financial_summary": {
      const period = args.period || "month";
      const periodMap: Record<string, number> = { week: 7, month: 30, quarter: 90, year: 365 };
      const days = periodMap[period] || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const [commissions, invoices] = await Promise.all([
        supabase.from("deal_commissions").select("*").gte("created_at", since),
        supabase.from("invoices").select("*").gte("created_at", since),
      ]);

      const commData = commissions.data || [];
      const total = commData.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
      const paid = commData.filter((c: any) => c.payment_status === "verified")
        .reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);

      return {
        period,
        total_commissions: total,
        paid_commissions: paid,
        pending_commissions: total - paid,
        total_invoices: invoices.data?.length || 0,
        total_deal_volume: commData.reduce((s: number, c: any) => s + (c.deal_amount || 0), 0),
      };
    }

    case "get_audit_trail": {
      let query = supabase.from("audit_logs").select("*")
        .order("created_at", { ascending: false }).limit(args.limit || 20);
      if (args.resource_id) query = query.eq("resource_id", args.resource_id);
      const { data } = await query;
      return { logs: data || [] };
    }

    case "get_compliance_overview": {
      const { data: listings } = await supabase.from("listings")
        .select("id, title, city, business_activity, deal_type, disclosure_score, photos, documents, description, price")
        .eq("status", "published").is("deleted_at", null);

      const issues: any[] = [];
      for (const l of listings || []) {
        const problems: string[] = [];
        if (!l.description || l.description.length < 20) problems.push("وصف قصير أو مفقود");
        if (!l.photos || (Array.isArray(l.photos) && l.photos.length === 0)) problems.push("بدون صور");
        if ((l.disclosure_score || 0) < 50) problems.push("درجة إفصاح منخفضة");
        if (!l.price || l.price <= 0) problems.push("سعر مفقود");
        if (problems.length > 0) issues.push({ id: l.id, title: l.title, problems });
      }
      return { total_published: listings?.length || 0, issues_count: issues.length, issues: issues.slice(0, 15) };
    }

    case "get_client_list": {
      const roleFilter = args.role_filter || "all";
      let query = supabase.from("profiles")
        .select("user_id, full_name, email, phone, city, is_verified, trust_score, completed_deals, created_at")
        .order("created_at", { ascending: false }).limit(args.limit || 20);

      if (roleFilter !== "all") {
        const { data: roleUsers } = await supabase.from("user_roles")
          .select("user_id").eq("role", roleFilter);
        const ids = (roleUsers || []).map((r: any) => r.user_id);
        if (ids.length > 0) query = query.in("user_id", ids);
        else return { clients: [], total: 0 };
      }

      const { data } = await query;
      return { clients: data || [], total: data?.length || 0 };
    }

    case "weekly_report": {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [newListings, newDeals, newUsers, completedDeals, commissions] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).gte("created_at", weekAgo).is("deleted_at", null),
        supabase.from("deals").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
        supabase.from("deals").select("id", { count: "exact", head: true })
          .gte("completed_at", weekAgo).in("status", ["completed", "finalized"]),
        supabase.from("deal_commissions").select("commission_amount, payment_status").gte("created_at", weekAgo),
      ]);

      const commData = commissions.data || [];
      return {
        new_listings: newListings.count || 0,
        new_deals: newDeals.count || 0,
        new_users: newUsers.count || 0,
        completed_deals: completedDeals.count || 0,
        weekly_revenue: commData.filter((c: any) => c.payment_status === "verified")
          .reduce((s: number, c: any) => s + (c.commission_amount || 0), 0),
        period: "آخر 7 أيام",
      };
    }

    case "get_pending_payments": {
      const { data } = await supabase.from("deal_commissions")
        .select("id, deal_id, seller_id, deal_amount, commission_amount, payment_status, created_at")
        .not("payment_status", "eq", "verified")
        .order("created_at", { ascending: false }).limit(20);
      return { pending_payments: data || [], total: data?.length || 0 };
    }

    case "get_revenue_report": {
      const period = args.period || "month";
      const days = { week: 7, month: 30, quarter: 90, year: 365 }[period] || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data } = await supabase.from("deal_commissions")
        .select("deal_amount, commission_amount, payment_status, created_at")
        .gte("created_at", since);

      const all = data || [];
      return {
        period,
        total_deal_volume: all.reduce((s: number, c: any) => s + (c.deal_amount || 0), 0),
        total_commissions: all.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0),
        collected: all.filter((c: any) => c.payment_status === "verified")
          .reduce((s: number, c: any) => s + (c.commission_amount || 0), 0),
        deals_count: all.length,
      };
    }

    // ─── SHARED READ ───
    case "search_listings": {
      let query = supabase.from("listings")
        .select("id, title, price, city, business_activity, status, deal_type, created_at, ai_rating")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(args.limit || 10);

      if (args.city) query = query.ilike("city", `%${args.city}%`);
      if (args.business_activity) query = query.ilike("business_activity", `%${args.business_activity}%`);
      if (args.min_price) query = query.gte("price", args.min_price);
      if (args.max_price) query = query.lte("price", args.max_price);
      if (args.status) query = query.eq("status", args.status);
      else if (role === "customer") query = query.eq("status", "published");

      const { data } = await query;
      return { listings: data || [], total: data?.length || 0 };
    }

    case "get_listing_details": {
      const { data } = await supabase.from("listings")
        .select("*").eq("id", args.listing_id).is("deleted_at", null).single();
      if (!data) return { error: "الإعلان غير موجود" };

      // Get related data
      const [offers, views] = await Promise.all([
        supabase.from("listing_offers").select("id, offered_price, status, created_at")
          .eq("listing_id", args.listing_id).order("created_at", { ascending: false }).limit(5),
        supabase.from("listing_views").select("id", { count: "exact", head: true })
          .eq("listing_id", args.listing_id),
      ]);

      return {
        listing: {
          id: data.id, title: data.title, price: data.price, city: data.city,
          district: data.district, business_activity: data.business_activity,
          deal_type: data.deal_type, status: data.status, description: data.description,
          ai_summary: data.ai_summary, ai_rating: data.ai_rating,
          disclosure_score: data.disclosure_score, created_at: data.created_at,
          annual_rent: data.annual_rent, area_sqm: data.area_sqm,
        },
        offers: offers.data || [],
        total_views: views.count || 0,
      };
    }

    // ─── CUSTOMER ───
    case "track_my_listings": {
      const [listings, deals, offers] = await Promise.all([
        supabase.from("listings").select("id, title, price, city, status, created_at, business_activity")
          .eq("owner_id", userId).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("deals").select("id, status, listing_id, agreed_price, created_at")
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
          .order("created_at", { ascending: false }),
        supabase.from("listing_offers").select("id, listing_id, offered_price, status, created_at")
          .eq("buyer_id", userId).order("created_at", { ascending: false }).limit(10),
      ]);
      return {
        my_listings: listings.data || [],
        my_deals: deals.data || [],
        my_offers: offers.data || [],
      };
    }

    case "get_my_invoices": {
      const { data } = await supabase.from("invoices")
        .select("*")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false }).limit(20);
      
      const commissions = await supabase.from("deal_commissions")
        .select("*").eq("seller_id", userId).order("created_at", { ascending: false });

      return {
        invoices: data || [],
        commissions: commissions.data || [],
      };
    }

    case "get_my_documents": {
      const { data: listings } = await supabase.from("listings")
        .select("id, title, photos, documents").eq("owner_id", userId).is("deleted_at", null);

      const { data: dealFiles } = await supabase.from("deal_files")
        .select("*").eq("uploaded_by", userId).order("uploaded_at", { ascending: false });

      return {
        listing_files: (listings || []).map((l: any) => ({
          listing_id: l.id, title: l.title,
          photos_count: Array.isArray(l.photos) ? l.photos.length : 0,
          documents_count: Array.isArray(l.documents) ? l.documents.length : 0,
        })),
        deal_files: dealFiles || [],
      };
    }

    case "view_my_updates": {
      const { data } = await supabase.from("notifications")
        .select("id, title, body, type, is_read, created_at, reference_type, reference_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(15);
      return { notifications: data || [] };
    }

    // ─── SUPERVISOR ───
    case "get_my_tasks": {
      const [draftListings, activeDeals, reports] = await Promise.all([
        supabase.from("listings").select("id, title, city, status, created_at")
          .eq("status", "draft").is("deleted_at", null).order("created_at", { ascending: false }).limit(15),
        supabase.from("deals").select("id, status, listing_id, created_at")
          .not("status", "in", '("completed","cancelled","finalized")')
          .order("created_at", { ascending: false }).limit(15),
        supabase.from("listing_reports").select("id, listing_id, reason, status, created_at")
          .eq("status", "pending").order("created_at", { ascending: false }).limit(10),
      ]);
      return {
        listings_to_review: draftListings.data || [],
        active_deals: activeDeals.data || [],
        pending_reports: reports.data || [],
      };
    }

    case "get_missing_assets_status": {
      const { data } = await supabase.from("listings")
        .select("id, title, photos, documents, disclosure_score, description")
        .eq("status", "published").is("deleted_at", null);

      const incomplete = (data || []).filter((l: any) => {
        const noPhotos = !l.photos || (Array.isArray(l.photos) && l.photos.length === 0);
        const lowDisclosure = (l.disclosure_score || 0) < 50;
        const noDesc = !l.description || l.description.length < 20;
        return noPhotos || lowDisclosure || noDesc;
      }).map((l: any) => ({
        id: l.id, title: l.title,
        missing: [
          ...(!l.photos || l.photos.length === 0 ? ["صور"] : []),
          ...(l.disclosure_score < 50 ? ["إفصاحات"] : []),
          ...(!l.description || l.description.length < 20 ? ["وصف"] : []),
        ],
      }));

      return { incomplete_listings: incomplete.slice(0, 15), total: incomplete.length };
    }

    // ─── WRITE TOOLS ───
    case "change_listing_status": {
      // Verify ownership or admin role
      if (role === "customer") {
        const { data: listing } = await supabase.from("listings")
          .select("owner_id").eq("id", args.listing_id).single();
        if (listing?.owner_id !== userId) return { error: "ليس لديك صلاحية تعديل هذا الإعلان" };
      }

      const updateData: any = { status: args.new_status, updated_at: new Date().toISOString() };
      if (args.new_status === "published") updateData.published_at = new Date().toISOString();

      const { error } = await supabase.from("listings").update(updateData).eq("id", args.listing_id);
      if (error) return { error: error.message };

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: `listing_${args.new_status}`,
        resource_type: "listing",
        resource_id: args.listing_id,
        details: { reason: args.reason || "via_moqbil", new_status: args.new_status },
      });

      return { success: true, listing_id: args.listing_id, new_status: args.new_status };
    }

    case "change_deal_status": {
      if (role === "customer") return { error: "ليس لديك صلاحية تغيير حالة الصفقات" };

      const { error } = await supabase.from("deals")
        .update({ status: args.new_status, updated_at: new Date().toISOString() })
        .eq("id", args.deal_id);
      if (error) return { error: error.message };

      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: `deal_${args.new_status}`,
        resource_type: "deal",
        resource_id: args.deal_id,
        details: { reason: args.reason || "via_moqbil", new_status: args.new_status },
      });

      return { success: true, deal_id: args.deal_id, new_status: args.new_status };
    }

    case "update_listing_pricing": {
      if (role === "customer") {
        const { data: listing } = await supabase.from("listings")
          .select("owner_id").eq("id", args.listing_id).single();
        if (listing?.owner_id !== userId) return { error: "ليس لديك صلاحية تعديل هذا الإعلان" };
      }

      const { error } = await supabase.from("listings")
        .update({ price: args.new_price, updated_at: new Date().toISOString() })
        .eq("id", args.listing_id);
      if (error) return { error: error.message };

      await supabase.from("audit_logs").insert({
        user_id: userId, action: "listing_price_updated",
        resource_type: "listing", resource_id: args.listing_id,
        details: { new_price: args.new_price },
      });

      return { success: true, listing_id: args.listing_id, new_price: args.new_price };
    }

    case "send_notification": {
      if (role === "customer") return { error: "ليس لديك صلاحية إرسال إشعارات" };

      if (args.target === "specific_user" && args.user_id) {
        await supabase.from("notifications").insert({
          user_id: args.user_id, title: args.title, body: args.body, type: "admin",
        });
        return { success: true, sent_to: 1 };
      }

      // Bulk notifications
      const targetRole = args.target === "all_supervisors" ? "supervisor" : "customer";
      const { data: users } = await supabase.from("user_roles")
        .select("user_id").eq("role", targetRole);

      const notifications = (users || []).map((u: any) => ({
        user_id: u.user_id, title: args.title, body: args.body, type: "admin",
      }));

      if (notifications.length > 0) {
        // Insert in batches of 100
        for (let i = 0; i < notifications.length; i += 100) {
          await supabase.from("notifications").insert(notifications.slice(i, i + 100));
        }
      }

      return { success: true, sent_to: notifications.length };
    }

    case "confirm_payment": {
      if (role === "customer") return { error: "ليس لديك صلاحية تأكيد المدفوعات" };

      const { error } = await supabase.from("deal_commissions")
        .update({ payment_status: "verified", paid_at: new Date().toISOString(), notes: args.notes || "تم التأكيد عبر مقبل" })
        .eq("id", args.commission_id);
      if (error) return { error: error.message };

      await supabase.from("audit_logs").insert({
        user_id: userId, action: "commission_verified",
        resource_type: "commission", resource_id: args.commission_id,
        details: { notes: args.notes, confirmed_via: "moqbil" },
      });

      return { success: true, commission_id: args.commission_id };
    }

    case "edit_my_listing": {
      // Verify ownership
      const { data: listing } = await supabase.from("listings")
        .select("owner_id, status").eq("id", args.listing_id).single();

      if (!listing) return { error: "الإعلان غير موجود" };
      if (role === "customer" && listing.owner_id !== userId) return { error: "ليس لديك صلاحية تعديل هذا الإعلان" };

      const updateFields: any = { updated_at: new Date().toISOString() };
      if (args.title) updateFields.title = args.title;
      if (args.description) updateFields.description = args.description;
      if (args.price) updateFields.price = args.price;
      if (args.business_activity) updateFields.business_activity = args.business_activity;

      const { error } = await supabase.from("listings").update(updateFields).eq("id", args.listing_id);
      if (error) return { error: error.message };

      return { success: true, listing_id: args.listing_id, updated_fields: Object.keys(updateFields).filter(k => k !== "updated_at") };
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

    // Create admin client for tool execution
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Determine user identity — try JWT first, fall back to client-provided ID
    let userId = clientUserId || "";
    let role = userRole || "customer";

    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ") && authHeader.length > 50) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          userId = user.id;
          // Get actual role from DB
          const { data: roleData } = await supabaseAdmin
            .from("user_roles").select("role").eq("user_id", user.id).single();
          if (roleData) role = roleData.role;
        }
      } catch { /* use client-provided values */ }
    }

    // Build system message with context
    let systemMessage = context ? `${SYSTEM_PROMPT}\n${context}` : SYSTEM_PROMPT;
    systemMessage += `\nدور المستخدم: ${role}`;
    systemMessage += `\nمعرف المستخدم: ${userId}`;

    // Get tools for this role
    const allowedToolNames = ROLE_TOOLS[role] || ROLE_TOOLS.customer;
    const tools = allowedToolNames
      .filter((name) => TOOL_DEFS[name])
      .map((name) => TOOL_DEFS[name]);

    // Format messages (support multimodal)
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: Array.isArray(msg.content) ? msg.content : msg.content,
    }));

    // ═══ Tool Calling Loop ═══
    let currentMessages: any[] = [
      { role: "system", content: systemMessage },
      ...formattedMessages,
    ];

    let iterations = 0;
    const MAX_ITERATIONS = 5;
    let toolsUsed: string[] = [];

    while (iterations < MAX_ITERATIONS) {
      console.log(`[moqbil] Tool loop iteration ${iterations}, tools available: ${tools.length}`);

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: currentMessages,
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? "auto" : undefined,
          stream: false,
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        const t = await aiResponse.text();
        console.error("AI gateway error:", status, t);
        if (status === 429) {
          return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "يرجى إعادة شحن الرصيد." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI error: ${status}`);
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];
      if (!choice) throw new Error("No response from AI");

      const message = choice.message;
      console.log(`[moqbil] AI response - finish_reason: ${choice.finish_reason}, has_tool_calls: ${!!message.tool_calls}, tool_calls_count: ${message.tool_calls?.length || 0}`);

      // Check if AI wants to call tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Add assistant message with tool calls
        currentMessages.push(message);

        // Execute each tool
        for (const tc of message.tool_calls) {
          const toolName = tc.function.name;
          let toolArgs: any = {};
          try { toolArgs = JSON.parse(tc.function.arguments || "{}"); } catch { /* empty args */ }

          console.log(`[moqbil] Executing tool: ${toolName}`, toolArgs);
          toolsUsed.push(toolName);

          // Verify role access
          if (!allowedToolNames.includes(toolName)) {
            currentMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify({ error: "ليس لديك صلاحية لاستخدام هذه الأداة" }),
            });
            continue;
          }

          try {
            const result = await executeTool(toolName, toolArgs, userId, role, supabaseAdmin);
            currentMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          } catch (err) {
            console.error(`[moqbil] Tool error (${toolName}):`, err);
            currentMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify({ error: `فشل تنفيذ الأداة: ${err instanceof Error ? err.message : "خطأ غير معروف"}` }),
            });
          }
        }

        iterations++;
        continue; // Loop back to AI with tool results
      }

      // No tool calls — we have the final response. Now stream it.
      break;
    }

    // ═══ Final Streaming Response ═══
    // Make a final streaming call with all context (including tool results)
    const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: currentMessages,
        stream: true,
        // No tools on final call to ensure text response
      }),
    });

    if (!finalResponse.ok) {
      const t = await finalResponse.text();
      console.error("Final stream error:", finalResponse.status, t);
      throw new Error("Final stream failed");
    }

    // Log tool usage
    if (toolsUsed.length > 0 && userId) {
      supabaseAdmin.from("agent_actions_log").insert({
        user_id: userId,
        action_type: "tool_execution",
        action_details: { tools: toolsUsed, iteration_count: iterations },
        result: "success",
      }).then(() => {}).catch(() => {});
    }

    return new Response(finalResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
