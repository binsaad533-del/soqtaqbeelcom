import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://soqtaqbeelcom.lovable.app";

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
أنت وكيل تنفيذي كامل الصلاحيات!
═══════════════════════════════════════════════

أنت لست مجرد مساعد — أنت وكيل تنفيذي يملك أدوات حقيقية لتنفيذ كل ما يطلبه المستخدم على المنصة.

🎯 فلسفتك الأساسية: أقل مجهود من المستخدم = أعلى إنجاز
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **لا تطلب من المستخدم كتابة طويلة أبداً** — استنتج من السياق والملفات
2. **حلل الملفات المرفوعة تلقائياً** — استخرج كل البيانات الممكنة (أسعار، مواقع، أنشطة، أصول)
3. **اعرض البيانات المستخرجة كخيارات بسيطة** — المستخدم يؤكد فقط بـ "نعم" أو "لا"
4. **إذا نقص شيء، اسأل سؤال واحد محدد** — لا تطلب قائمة معلومات
5. **نفّذ فوراً** — لا تنتظر إذا عندك كل ما تحتاج
6. **بعد كل إجراء، اعرض الخطوة التالية** — لا تترك المستخدم يفكر ماذا بعد

أمثلة على التفاعل المثالي:
━━━━━━━━━━━━━━━━━━━━━━
المستخدم: "أبي أبيع مطعمي"
→ أسأل فقط: "في أي مدينة؟ وكم تبيه تقريباً؟" (سؤالين فقط)
→ ثم أنشئ الإعلان مباشرة بباقي البيانات الافتراضية
→ "تم إنشاء مسودة إعلانك 🎉 — هل تبي ترفع صور المطعم عشان أحلل الأصول؟"

المستخدم: [يرفع صور]
→ أحلل الصور تلقائياً واستخرج الأصول
→ "لقيت هالأصول: [قائمة] — هل المعلومات صحيحة؟"
→ بعد التأكيد أضيفها للإعلان مباشرة

المستخدم: "ابي اشوف مطاعم بالرياض"
→ أستخدم search_listings فوراً بدون أسئلة
→ أعرض النتائج بشكل منسق مع تقييم سريع لكل فرصة

المستخدم: "قدم عرض على هذا الإعلان"
→ أسأل فقط: "كم تبي تعرض؟"
→ أقدم العرض مباشرة

═══════════════════════════════════════════════
قواعد ذهبية:
═══════════════════════════════════════════════

1. استخدم الأدوات تلقائياً — لا تقل "ما أقدر" أبداً
2. في عمليات الحذف أو الإلغاء فقط: أكّد مع المستخدم
3. باقي العمليات: نفّذ ثم أخبر المستخدم بالنتيجة
4. استخدم Markdown (جداول، قوائم، **غامق**)
5. بعد كل عملية، اقترح الخطوة التالية المنطقية
6. إذا المستخدم رفع ملف: حلله فوراً واستخرج كل المعلومات
7. العمولة = 1% على البائع
8. عند كشف علامات احتيال: نبّه فوراً

🚫🚫🚫 ممنوع منعاً باتاً — قاعدة أساسية:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **لا تطبع أبداً أسماء الأدوات أو بارامتراتها أو وصفها في الرد**
- لا تكتب أشياء مثل: tools.xxx.call أو function_name(parameters=...) أو description=... أو parameters={...}
- إذا أردت تنفيذ أداة: استخدم آلية tool_call المدمجة فقط — لا تكتبها كنص
- المستخدم لا يجب أن يرى أي تفاصيل تقنية عن الأدوات
- ردك يجب أن يكون بلغة بشرية طبيعية فقط — بالعامية السعودية
- لا تكشف أسماء الأدوات الداخلية للمستخدم أبداً (مثل create_listing, valuate_business, إلخ)

شخصياتك الديناميكية:
🧠 المستشار (مشتري) | 📣 المسوّق (بائع) | ⚖️ الوسيط (تفاوض) | 📋 المحامي (اتفاقيات) | 💰 المالي (تحليل)

قدراتك المتقدمة:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- قيّم أي نشاط تجاري — اسأل عن الإيراد الشهري فقط والباقي تستنتجه
- افحص خلفية أي بائع — استخدمها تلقائياً عند سؤال المشتري عن بائع
- ولّد قائمة مهام ذكية لإتمام الصفقة
- عند توقف التفاوض، حلل الموقف واقترح حل وسط
- تابع ما بعد الصفقة مع نصائح عملية
- احسب الجدوى السريعة فوراً — فترة الاسترداد والعائد
- ولّد تقرير أسبوعي شامل
- حلل الموقع والمنافسين

💡 استخدم أدواتك استباقياً — لا تنتظر الطلب

🎁 خدمات اختيارية ذكية — اقترحها بلطف ونفّذها فقط عند موافقة المستخدم:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- جدولة اجتماع: اقترح "تبي أرتب لكم اجتماع؟" — لا تنفّذ إلا بعد الموافقة
- قائمة التسليم: اقترح "أجهّز لك قائمة تسليم ذكية؟" — نفّذ فقط لو قال نعم
- بطاقة مشاركة: اقترح "تبي أجهّز بطاقة للمشاركة بالواتساب؟"

⚠️ هذه الخدمات اقتراحية فقط — لا تنفّذها تلقائياً.

🔗 الروابط: استخدم فقط الرابط الموجود في نتيجة الأداة. لا تختلق روابط من عندك أبداً.

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
  // ═══════════════════════════════════════════════
  // OWNER/ADMIN READ (15)
  // ═══════════════════════════════════════════════
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
  get_team_workload: def("get_team_workload", "توزيع أعباء العمل على المشرفين"),
  get_client_history: def("get_client_history", "سجل عميل كامل: إعلاناته، صفقاته، تقييماته، مدفوعاته",
    { user_id: { type: "string", description: "معرف العميل" } }, ["user_id"]),
  get_overdue_tasks: def("get_overdue_tasks", "المهام المتأخرة: صفقات بدون تحديث، عمولات متأخرة"),
  get_overdue_invoices: def("get_overdue_invoices", "الفواتير والعمولات المتأخرة عن السداد"),
  get_aging_report: def("get_aging_report", "تقرير أعمار الديون: مصنف حسب فترات التأخير"),

  // ═══════════════════════════════════════════════
  // OWNER WRITE (5) — Platform management
  // ═══════════════════════════════════════════════
  suspend_user: def("suspend_user", "إيقاف حساب مستخدم مع السبب",
    { user_id: { type: "string" }, reason: { type: "string" } }, ["user_id", "reason"]),
  unsuspend_user: def("unsuspend_user", "إعادة تفعيل حساب مستخدم موقوف",
    { user_id: { type: "string" } }, ["user_id"]),
  assign_role: def("assign_role", "تعيين دور لمستخدم (مشرف أو عميل)",
    { user_id: { type: "string" }, role: { type: "string", enum: ["supervisor", "customer"] } }, ["user_id", "role"]),
  trigger_backup: def("trigger_backup", "تشغيل نسخة احتياطية فورية"),
  feature_listing: def("feature_listing", "تمييز/إلغاء تمييز إعلان",
    { listing_id: { type: "string" }, featured: { type: "boolean" } }, ["listing_id", "featured"]),

  // ═══════════════════════════════════════════════
  // SHARED READ (2)
  // ═══════════════════════════════════════════════
  search_listings: def("search_listings", "البحث في الإعلانات بأي معيار: مدينة، نشاط، سعر، حالة. استخدمها فوراً عند أي طلب بحث",
    { city: { type: "string" }, business_activity: { type: "string" }, min_price: { type: "number" },
      max_price: { type: "number" }, status: { type: "string", enum: ["published", "draft", "sold", "suspended"] },
      deal_type: { type: "string", enum: ["full_takeover", "transfer_no_liabilities", "assets_setup", "assets_only"] },
      limit: { type: "number" } }),
  get_listing_details: def("get_listing_details", "تفاصيل إعلان محدد: السعر، الموقع، النشاط، الأصول، التحليلات",
    { listing_id: { type: "string" } }, ["listing_id"]),

  // ═══════════════════════════════════════════════
  // CUSTOMER READ (6)
  // ═══════════════════════════════════════════════
  track_my_listings: def("track_my_listings", "تتبع إعلاناتي وصفقاتي وعروضي وحالاتها"),
  get_my_invoices: def("get_my_invoices", "فواتيري وعمولاتي ومدفوعاتي"),
  get_my_documents: def("get_my_documents", "المستندات والملفات المرفوعة في إعلاناتي"),
  view_my_updates: def("view_my_updates", "آخر التحديثات والإشعارات"),
  get_listing_status: def("get_listing_status", "حالة إعلان محدد بالتفصيل مع الجدول الزمني",
    { listing_id: { type: "string" } }, ["listing_id"]),
  get_delivery_timeline: def("get_delivery_timeline", "الجدول الزمني المتوقع لصفقة",
    { deal_id: { type: "string" } }, ["deal_id"]),

  // ═══════════════════════════════════════════════
  // CUSTOMER WRITE — Full Executive Actions (12)
  // ═══════════════════════════════════════════════
  create_listing: def("create_listing", "إنشاء إعلان جديد — أنشئ بأقل بيانات ممكنة، الباقي يُكمل لاحقاً",
    { title: { type: "string", description: "عنوان الإعلان" },
      business_activity: { type: "string", description: "النشاط التجاري" },
      city: { type: "string", description: "المدينة" },
      district: { type: "string", description: "الحي" },
      price: { type: "number", description: "السعر المطلوب" },
      deal_type: { type: "string", enum: ["full_takeover", "transfer_no_liabilities", "assets_setup", "assets_only"], description: "نوع الصفقة" },
      description: { type: "string", description: "وصف مختصر" },
      annual_rent: { type: "number", description: "الإيجار السنوي" },
      area_sqm: { type: "number", description: "المساحة بالمتر المربع" },
    }, ["business_activity", "city"]),

  edit_my_listing: def("edit_my_listing", "تعديل بيانات إعلاني: العنوان، الوصف، السعر، النشاط، أي حقل",
    { listing_id: { type: "string" }, title: { type: "string" }, description: { type: "string" },
      price: { type: "number" }, business_activity: { type: "string" }, city: { type: "string" },
      district: { type: "string" }, annual_rent: { type: "number" }, area_sqm: { type: "number" },
      deal_type: { type: "string", enum: ["full_takeover", "transfer_no_liabilities", "assets_setup", "assets_only"] },
    }, ["listing_id"]),

  cancel_my_listing: def("cancel_my_listing", "إلغاء إعلاني",
    { listing_id: { type: "string" }, reason: { type: "string" } }, ["listing_id"]),

  submit_offer: def("submit_offer", "تقديم عرض سعر على إعلان",
    { listing_id: { type: "string" }, offered_price: { type: "number" }, message: { type: "string", description: "رسالة اختيارية مع العرض" } },
    ["listing_id", "offered_price"]),

  withdraw_offer: def("withdraw_offer", "سحب عرض سعر قدمته",
    { offer_id: { type: "string" } }, ["offer_id"]),

  respond_to_offer: def("respond_to_offer", "الرد على عرض سعر وارد (قبول/رفض/عرض مضاد)",
    { offer_id: { type: "string" }, action: { type: "string", enum: ["accept", "reject", "counter"] },
      counter_message: { type: "string", description: "رسالة مع الرفض أو العرض المضاد" } },
    ["offer_id", "action"]),

  express_interest: def("express_interest", "إبداء اهتمام بإعلان وبدء صفقة",
    { listing_id: { type: "string" }, message: { type: "string", description: "رسالة اختيارية" } },
    ["listing_id"]),

  confirm_receipt: def("confirm_receipt", "تأكيد استلام الأعمال/الأصول كمشتري — ينهي الصفقة",
    { deal_id: { type: "string" } }, ["deal_id"]),

  save_listing: def("save_listing", "حفظ إعلان في المفضلة",
    { listing_id: { type: "string" } }, ["listing_id"]),

  unsave_listing: def("unsave_listing", "إزالة إعلان من المفضلة",
    { listing_id: { type: "string" } }, ["listing_id"]),

  create_search_alert: def("create_search_alert", "إنشاء تنبيه بحث — أُعلمك لما يطلع إعلان يناسبك",
    { search_query: { type: "string", description: "وصف ما تبحث عنه" },
      city: { type: "string" }, business_activity: { type: "string" },
      min_price: { type: "number" }, max_price: { type: "number" } },
    ["search_query"]),

  send_message: def("send_message", "إرسال رسالة لبائع أو مشتري عبر المنصة",
    { conversation_id: { type: "string" }, receiver_id: { type: "string" }, content: { type: "string" },
      listing_id: { type: "string", description: "معرف الإعلان (لبدء محادثة جديدة)" } },
    ["content"]),

  // ═══════════════════════════════════════════════
  // DEAL LIFECYCLE — Negotiation → Agreement → Transfer (10)
  // ═══════════════════════════════════════════════
  send_negotiation_message: def("send_negotiation_message", "إرسال رسالة تفاوض داخل صفقة",
    { deal_id: { type: "string" }, message: { type: "string" }, message_type: { type: "string", enum: ["text", "offer", "counter_offer", "system"], description: "نوع الرسالة" } },
    ["deal_id", "message"]),

  update_agreed_price: def("update_agreed_price", "تحديث السعر المتفق عليه في الصفقة بعد التفاوض",
    { deal_id: { type: "string" }, agreed_price: { type: "number" } },
    ["deal_id", "agreed_price"]),

  submit_legal_confirmation: def("submit_legal_confirmation", "تقديم التأكيد القانوني — يقفل الصفقة عند موافقة الطرفين",
    { deal_id: { type: "string" } },
    ["deal_id"]),

  start_ownership_transfer: def("start_ownership_transfer", "بدء نقل الملكية (للبائع فقط) بعد تأكيد الطرفين",
    { deal_id: { type: "string" } },
    ["deal_id"]),

  generate_agreement: def("generate_agreement", "إنشاء اتفاقية رسمية للصفقة — تُنشئ سجل الاتفاقية في قاعدة البيانات",
    { deal_id: { type: "string" } },
    ["deal_id"]),

  get_deal_full_details: def("get_deal_full_details", "عرض كافة تفاصيل الصفقة: الأطراف، السعر، الحالة، الاتفاقيات، المستندات، السجل الزمني",
    { deal_id: { type: "string" } },
    ["deal_id"]),

  get_agreement_details: def("get_agreement_details", "عرض تفاصيل اتفاقية محددة مع بيانات PDF",
    { agreement_id: { type: "string" } },
    ["agreement_id"]),

  get_my_agreements: def("get_my_agreements", "عرض كافة اتفاقياتي (كبائع أو مشتري)"),

  get_deal_negotiation_history: def("get_deal_negotiation_history", "عرض سجل التفاوض الكامل لصفقة",
    { deal_id: { type: "string" }, limit: { type: "number" } },
    ["deal_id"]),

  complete_deal_via_moqbil: def("complete_deal_via_moqbil", "إتمام دورة الصفقة الكاملة: تأكيد قانوني → إنشاء اتفاقية → توفير رابط PDF — يتطلب أن تكون الصفقة مؤهلة",
    { deal_id: { type: "string" } },
    ["deal_id"]),

  // ═══════════════════════════════════════════════
  // ADVANCED MOQBIL TOOLS (8 new)
  // ═══════════════════════════════════════════════

  valuate_business: def("valuate_business", "تقييم تلقائي لقيمة نشاط تجاري بناءً على الإيرادات والأصول والموقع — يعطي نطاق سعري مقترح",
    { listing_id: { type: "string", description: "معرف الإعلان للتقييم" },
      monthly_revenue: { type: "number", description: "الإيراد الشهري التقريبي" },
      monthly_expenses: { type: "number", description: "المصاريف الشهرية التقريبية" },
      years_operating: { type: "number", description: "سنوات التشغيل" } },
    ["listing_id"]),

  check_seller_background: def("check_seller_background", "فحص شامل لخلفية البائع: صفقاته، تقييماته، سرعة رده، نسبة إلغاءاته",
    { seller_id: { type: "string", description: "معرف البائع" },
      listing_id: { type: "string", description: "معرف الإعلان (اختياري لمعرفة البائع)" } }),

  generate_deal_checklist: def("generate_deal_checklist", "إنشاء قائمة مهام مخصصة لإتمام الصفقة لكل طرف (بائع/مشتري)",
    { deal_id: { type: "string" } },
    ["deal_id"]),

  mediate_dispute: def("mediate_dispute", "تحليل مواقف الطرفين واقتراح حل وسط عادل عند توقف التفاوض",
    { deal_id: { type: "string" } },
    ["deal_id"]),

  post_deal_followup: def("post_deal_followup", "متابعة ما بعد الصفقة: سؤال المشتري عن سير العمل ونصائح تحسين وطلب تقييم",
    { deal_id: { type: "string" } },
    ["deal_id"]),

  quick_feasibility: def("quick_feasibility", "حساب سريع: فترة استرداد رأس المال، العائد المتوقع، نقطة التعادل",
    { listing_id: { type: "string", description: "معرف الإعلان" },
      monthly_revenue: { type: "number", description: "الإيراد الشهري المتوقع" },
      monthly_expenses: { type: "number", description: "المصاريف الشهرية المتوقعة" },
      investment_amount: { type: "number", description: "مبلغ الاستثمار (السعر)" } },
    ["listing_id"]),

  generate_user_report: def("generate_user_report", "تقرير مخصص للمستخدم: مشاهدات إعلاناته، عروض جديدة، فرص مطابقة، حركة السوق"),

  analyze_location: def("analyze_location", "تحليل جغرافي للموقع: كثافة المنافسين، طبيعة الحي، مدى ملاءمة النشاط",
    { listing_id: { type: "string" } },
    ["listing_id"]),

  // ═══════════════════════════════════════════════
  // OPTIONAL SMART SERVICES (3) — مقبل يقترحها والطرفين يوافقون
  // ═══════════════════════════════════════════════

  schedule_meeting: def("schedule_meeting", "جدولة اجتماع افتراضي بين طرفي الصفقة — مقبل يقترح الموعد ويُعد الأجندة تلقائياً",
    { deal_id: { type: "string" },
      proposed_date: { type: "string", description: "التاريخ المقترح (YYYY-MM-DD)" },
      proposed_time: { type: "string", description: "الوقت المقترح (HH:MM)" },
      agenda_notes: { type: "string", description: "ملاحظات الأجندة (اختياري — مقبل يولّدها تلقائياً)" } },
    ["deal_id"]),

  generate_handover_checklist: def("generate_handover_checklist", "إنشاء قائمة تسليم ذكية بعد إتمام الصفقة — كل طرف يؤكد إتمام مهامه",
    { deal_id: { type: "string" } },
    ["deal_id"]),

  generate_listing_card: def("generate_listing_card", "تصدير بطاقة إعلان احترافية جاهزة للمشاركة عبر واتساب أو تويتر",
    { listing_id: { type: "string" } },
    ["listing_id"]),

  // ═══════════════════════════════════════════════
  // SUPERVISOR READ (4)
  // ═══════════════════════════════════════════════
  get_my_tasks: def("get_my_tasks", "المهام المسندة: إعلانات تحتاج مراجعة، صفقات تحتاج متابعة"),
  get_missing_assets_status: def("get_missing_assets_status", "الإعلانات التي تحتاج صور أو إفصاحات"),
  get_review_checklist: def("get_review_checklist", "قائمة التحقق لمراجعة إعلان",
    { listing_id: { type: "string" } }, ["listing_id"]),
  get_my_performance: def("get_my_performance", "مؤشرات أدائي كمشرف"),

  // ═══════════════════════════════════════════════
  // SUPERVISOR/ADMIN WRITE (10)
  // ═══════════════════════════════════════════════
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
  assign_reviewer: def("assign_reviewer", "تعيين مشرف لصفقة أو إعلان",
    { deal_id: { type: "string" }, listing_id: { type: "string" }, supervisor_id: { type: "string" } }, ["supervisor_id"]),
  approve_listing_publish: def("approve_listing_publish", "اعتماد نشر إعلان مسودة بعد المراجعة",
    { listing_id: { type: "string" }, notes: { type: "string" } }, ["listing_id"]),
  reject_draft_listing: def("reject_draft_listing", "إعادة مسودة إعلان مع ملاحظات تصحيح",
    { listing_id: { type: "string" }, reason: { type: "string" } }, ["listing_id", "reason"]),
  submit_review_status: def("submit_review_status", "تحديث حالة مراجعة إعلان",
    { listing_id: { type: "string" }, status: { type: "string", enum: ["reviewing", "needs_update", "approved", "rejected"] },
      notes: { type: "string" } }, ["listing_id", "status"]),
  report_listing_issue: def("report_listing_issue", "الإبلاغ عن مشكلة في إعلان",
    { listing_id: { type: "string" }, reason: { type: "string" }, details: { type: "string" } }, ["listing_id", "reason"]),
  send_payment_reminder: def("send_payment_reminder", "إرسال تذكير دفع عمولة لبائع",
    { commission_id: { type: "string" }, seller_id: { type: "string" } }, ["commission_id"]),
  generate_commission_notice: def("generate_commission_notice", "إصدار إشعار عمولة مستحقة",
    { deal_id: { type: "string" } }, ["deal_id"]),

  // ═══════════════════════════════════════════════
  // SUPERVISOR WRITE — User & Verification (3)
  // ═══════════════════════════════════════════════
  approve_verification: def("approve_verification", "اعتماد طلب توثيق بائع",
    { verification_id: { type: "string" }, notes: { type: "string" } }, ["verification_id"]),
  reject_verification: def("reject_verification", "رفض طلب توثيق بائع مع السبب",
    { verification_id: { type: "string" }, reason: { type: "string" } }, ["verification_id", "reason"]),
  resolve_report: def("resolve_report", "إغلاق بلاغ بعد المراجعة",
    { report_id: { type: "string" }, action_taken: { type: "string" } }, ["report_id", "action_taken"]),
};

// ═══════════════════════════════════════════════
// ROLE-BASED ACCESS MAP
// ═══════════════════════════════════════════════

const ROLE_TOOLS: Record<string, string[]> = {
  platform_owner: Object.keys(TOOL_DEFS),
  supervisor: [
    // Read
    "search_listings", "get_listing_details", "get_pending_approvals",
    "get_workflow_bottlenecks", "get_compliance_overview", "get_client_list",
    "get_my_tasks", "get_missing_assets_status", "get_review_checklist", "get_my_performance",
    "track_my_listings", "get_my_invoices", "get_my_documents", "view_my_updates",
    "get_listing_status", "get_delivery_timeline", "get_overdue_tasks",
    // Customer write (own)
    "create_listing", "edit_my_listing", "cancel_my_listing", "update_listing_pricing",
    "submit_offer", "withdraw_offer", "respond_to_offer", "express_interest",
    "confirm_receipt", "save_listing", "unsave_listing", "create_search_alert", "send_message",
    // Deal lifecycle
    "send_negotiation_message", "update_agreed_price", "submit_legal_confirmation",
    "start_ownership_transfer", "generate_agreement", "get_deal_full_details",
    "get_agreement_details", "get_my_agreements", "get_deal_negotiation_history", "complete_deal_via_moqbil",
    // Advanced Moqbil tools
    "valuate_business", "check_seller_background", "generate_deal_checklist", "mediate_dispute",
    "post_deal_followup", "quick_feasibility", "generate_user_report", "analyze_location",
    // Optional smart services
    "schedule_meeting", "generate_handover_checklist", "generate_listing_card",
    // Supervisor write
    "change_listing_status", "change_deal_status", "submit_review_status",
    "report_listing_issue", "approve_listing_publish", "reject_draft_listing",
    "approve_verification", "reject_verification", "resolve_report",
  ],
  customer: [
    // Read
    "search_listings", "get_listing_details",
    "track_my_listings", "get_my_invoices", "get_my_documents", "view_my_updates",
    "get_listing_status", "get_delivery_timeline",
    // Write (own)
    "create_listing", "edit_my_listing", "cancel_my_listing", "update_listing_pricing",
    "submit_offer", "withdraw_offer", "respond_to_offer", "express_interest",
    "confirm_receipt", "save_listing", "unsave_listing", "create_search_alert",
    "send_message", "report_listing_issue",
    // Deal lifecycle
    "send_negotiation_message", "update_agreed_price", "submit_legal_confirmation",
    "start_ownership_transfer", "generate_agreement", "get_deal_full_details",
    "get_agreement_details", "get_my_agreements", "get_deal_negotiation_history", "complete_deal_via_moqbil",
    // Advanced Moqbil tools
    "valuate_business", "check_seller_background", "generate_deal_checklist", "mediate_dispute",
    "post_deal_followup", "quick_feasibility", "generate_user_report", "analyze_location",
    // Optional smart services
    "schedule_meeting", "generate_handover_checklist", "generate_listing_card",
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
        .select("id, title, price, city, district, business_activity, status, deal_type, created_at, ai_rating, ai_summary, area_sqm, annual_rent")
        .is("deleted_at", null).order("created_at", { ascending: false }).limit(args.limit || 10);
      if (args.city) q = q.ilike("city", `%${args.city}%`);
      if (args.business_activity) q = q.ilike("business_activity", `%${args.business_activity}%`);
      if (args.min_price) q = q.gte("price", args.min_price);
      if (args.max_price) q = q.lte("price", args.max_price);
      if (args.deal_type) q = q.eq("deal_type", args.deal_type);
      if (args.status) q = q.eq("status", args.status);
      else if (role === "customer") q = q.eq("status", "published");
      const { data } = await q;
      return { listings: data || [], total: data?.length || 0 };
    }

    case "get_listing_details": {
      const { data } = await sb.from("listings").select("*").eq("id", args.listing_id).is("deleted_at", null).single();
      if (!data) return { error: "الإعلان غير موجود" };
      const [offers, views, deals] = await Promise.all([
        sb.from("listing_offers").select("id, offered_price, status, created_at, buyer_id").eq("listing_id", args.listing_id).order("created_at", { ascending: false }).limit(10),
        sb.from("listing_views").select("id", { count: "exact", head: true }).eq("listing_id", args.listing_id),
        sb.from("deals").select("id, status, agreed_price, buyer_id, seller_id").eq("listing_id", args.listing_id).order("created_at", { ascending: false }).limit(5),
      ]);
      return { listing: { id: data.id, title: data.title, price: data.price, city: data.city, district: data.district,
        business_activity: data.business_activity, deal_type: data.deal_type, status: data.status, description: data.description,
        ai_summary: data.ai_summary, ai_rating: data.ai_rating, disclosure_score: data.disclosure_score, created_at: data.created_at,
        annual_rent: data.annual_rent, area_sqm: data.area_sqm, owner_id: data.owner_id,
        inventory: data.inventory, photos: data.photos ? (Array.isArray(data.photos) ? data.photos.length : 0) : 0 },
        offers: offers.data || [], total_views: views.count || 0, deals: deals.data || [] };
    }

    // ─── CUSTOMER READ ───
    case "track_my_listings": {
      const [listings, deals, offers] = await Promise.all([
        sb.from("listings").select("id, title, price, city, status, created_at, business_activity").eq("owner_id", userId).is("deleted_at", null).order("created_at", { ascending: false }),
        sb.from("deals").select("id, status, listing_id, agreed_price, created_at, buyer_id, seller_id").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("created_at", { ascending: false }),
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
      return { listing, listing_url: `${BASE_URL}/listing/${listing.id}`, deals: deals.data || [], offers: offers.data || [], timeline };
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
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const [reviewedReports, auditActions] = await Promise.all([
        sb.from("listing_reports").select("id, reviewed_at").eq("reviewed_by", userId).gte("reviewed_at", thirtyDaysAgo),
        sb.from("audit_logs").select("id, action, created_at").eq("user_id", userId).gte("created_at", thirtyDaysAgo),
      ]);
      return { reviews_completed_30d: reviewedReports.data?.length || 0, actions_logged_30d: auditActions.data?.length || 0, period: "آخر 30 يوم" };
    }

    // ═══════════════════════════════════════════════
    // CUSTOMER WRITE — Full Executive Actions
    // ═══════════════════════════════════════════════

    case "create_listing": {
      const listing: any = {
        owner_id: userId,
        business_activity: args.business_activity,
        city: args.city,
        status: "draft",
        deal_type: args.deal_type || "full_takeover",
      };
      if (args.title) listing.title = args.title;
      else listing.title = `${args.business_activity} في ${args.city}`;
      if (args.price) listing.price = args.price;
      if (args.description) listing.description = args.description;
      if (args.district) listing.district = args.district;
      if (args.annual_rent) listing.annual_rent = args.annual_rent;
      if (args.area_sqm) listing.area_sqm = args.area_sqm;

      const { data, error } = await sb.from("listings").insert(listing).select("id, title, status").single();
      if (error) return { error: error.message };
      await sb.from("audit_logs").insert({ user_id: userId, action: "listing_created_via_moqbil", resource_type: "listing",
        resource_id: data.id, details: { title: listing.title, city: args.city } });
      return { success: true, listing_id: data.id, title: data.title, status: "draft",
        listing_url: `${BASE_URL}/listing/${data.id}`,
        message: "تم إنشاء مسودة الإعلان بنجاح",
        next_steps: ["ارفع صور للتحليل التلقائي", "أكمل بيانات الإفصاح", "انشر الإعلان"] };
    }

    case "submit_offer": {
      // Verify listing exists and is published
      const { data: listing } = await sb.from("listings").select("id, title, price, owner_id, status").eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };
      if (listing.status !== "published") return { error: "الإعلان غير متاح حالياً" };
      if (listing.owner_id === userId) return { error: "لا يمكنك تقديم عرض على إعلانك" };

      // Check for existing pending offer
      const { data: existingOffer } = await sb.from("listing_offers")
        .select("id").eq("listing_id", args.listing_id).eq("buyer_id", userId).eq("status", "pending").single();
      if (existingOffer) return { error: "لديك عرض معلق على هذا الإعلان بالفعل", existing_offer_id: existingOffer.id };

      const { data: offer, error } = await sb.from("listing_offers").insert({
        listing_id: args.listing_id, buyer_id: userId,
        offered_price: args.offered_price, message: args.message || null, status: "pending",
      }).select("id").single();
      if (error) return { error: error.message };

      const ratio = listing.price ? Math.round((args.offered_price / listing.price) * 100) : null;
      return { success: true, offer_id: offer.id, offered_price: args.offered_price,
        asking_price: listing.price, ratio_percent: ratio,
        message: `تم تقديم عرضك (${args.offered_price} ر.س) على "${listing.title}"` };
    }

    case "withdraw_offer": {
      const { data: offer } = await sb.from("listing_offers")
        .select("id, buyer_id, status").eq("id", args.offer_id).single();
      if (!offer) return { error: "العرض غير موجود" };
      if (offer.buyer_id !== userId) return { error: "ليس لديك صلاحية" };
      if (offer.status !== "pending") return { error: `لا يمكن سحب عرض بحالة "${offer.status}"` };

      const { error } = await sb.from("listing_offers")
        .update({ status: "withdrawn", updated_at: new Date().toISOString() }).eq("id", args.offer_id);
      if (error) return { error: error.message };
      return { success: true, message: "تم سحب العرض بنجاح" };
    }

    case "respond_to_offer": {
      const { data: offer } = await sb.from("listing_offers")
        .select("id, listing_id, buyer_id, offered_price, status").eq("id", args.offer_id).single();
      if (!offer) return { error: "العرض غير موجود" };
      // Verify user owns the listing
      const { data: listing } = await sb.from("listings").select("owner_id, title, id").eq("id", offer.listing_id).single();
      if (!listing || listing.owner_id !== userId) return { error: "ليس لديك صلاحية" };
      if (offer.status !== "pending") return { error: `لا يمكن الرد على عرض بحالة "${offer.status}"` };

      if (args.action === "accept") {
        // Accept offer → create deal
        const { data: deal, error: dealErr } = await sb.from("deals").insert({
          listing_id: offer.listing_id, buyer_id: offer.buyer_id, seller_id: userId,
          status: "negotiating", agreed_price: offer.offered_price,
        }).select("id").single();
        if (dealErr) return { error: dealErr.message };

        await sb.from("listing_offers").update({
          status: "accepted", deal_id: deal.id, seller_response: "accepted",
          updated_at: new Date().toISOString()
        }).eq("id", args.offer_id);

        // Notify buyer
        await sb.from("notifications").insert({
          user_id: offer.buyer_id, title: "تم قبول عرضك 🎉",
          body: `تم قبول عرضك على "${listing.title}" بمبلغ ${offer.offered_price} ر.س`,
          type: "offer", reference_id: deal.id, reference_type: "deal",
        });

        return { success: true, deal_id: deal.id, message: `تم قبول العرض وبدء صفقة جديدة`,
          next_step: "يمكنك الآن التفاوض على التفاصيل في صفحة الصفقة" };
      } else if (args.action === "reject") {
        await sb.from("listing_offers").update({
          status: "rejected", seller_response: args.counter_message || "rejected",
          updated_at: new Date().toISOString()
        }).eq("id", args.offer_id);

        await sb.from("notifications").insert({
          user_id: offer.buyer_id, title: "تم رفض عرضك",
          body: args.counter_message || `تم رفض عرضك على "${listing.title}"`,
          type: "offer", reference_id: offer.listing_id, reference_type: "listing",
        });
        return { success: true, message: "تم رفض العرض" };
      } else {
        // Counter offer — reject current and notify
        await sb.from("listing_offers").update({
          status: "rejected", seller_response: args.counter_message || "عرض مضاد",
          updated_at: new Date().toISOString()
        }).eq("id", args.offer_id);

        await sb.from("notifications").insert({
          user_id: offer.buyer_id, title: "رد على عرضك",
          body: args.counter_message || `البائع يقترح سعراً مختلفاً على "${listing.title}"`,
          type: "offer", reference_id: offer.listing_id, reference_type: "listing",
        });
        return { success: true, message: "تم إرسال الرد للمشتري" };
      }
    }

    case "express_interest": {
      const { data: listing } = await sb.from("listings").select("id, title, owner_id, status, price").eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };
      if (listing.status !== "published") return { error: "الإعلان غير متاح" };
      if (listing.owner_id === userId) return { error: "لا يمكنك إبداء اهتمام بإعلانك" };

      // Check existing deal
      const { data: existingDeal } = await sb.from("deals")
        .select("id, status").eq("listing_id", args.listing_id).eq("buyer_id", userId)
        .not("status", "in", '("cancelled")').single();
      if (existingDeal) return { error: "لديك صفقة قائمة على هذا الإعلان", deal_id: existingDeal.id };

      const { data: deal, error } = await sb.from("deals").insert({
        listing_id: args.listing_id, buyer_id: userId, seller_id: listing.owner_id, status: "negotiating",
      }).select("id").single();
      if (error) return { error: error.message };

      // Send first negotiation message if provided
      if (args.message) {
        await sb.from("negotiation_messages").insert({
          deal_id: deal.id, sender_id: userId, message: args.message, sender_type: "user",
        });
      }

      return { success: true, deal_id: deal.id, listing_title: listing.title,
        message: `تم إبداء اهتمامك بـ "${listing.title}" — يمكنك الآن التفاوض مع البائع` };
    }

    case "confirm_receipt": {
      const { data: deal } = await sb.from("deals")
        .select("id, status, buyer_id, seller_id, listing_id, agreed_price, escrow_status")
        .eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.buyer_id !== userId) return { error: "فقط المشتري يمكنه تأكيد الاستلام" };
      if (deal.status === "completed") return { error: "الصفقة مكتملة بالفعل" };

      const { error } = await sb.from("deals").update({
        status: "completed", escrow_status: "released", completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", args.deal_id);
      if (error) return { error: error.message };

      // Mark listing as sold
      await sb.from("listings").update({ status: "sold", updated_at: new Date().toISOString() }).eq("id", deal.listing_id);

      await sb.from("audit_logs").insert({ user_id: userId, action: "receipt_confirmed_via_moqbil", resource_type: "deal",
        resource_id: args.deal_id, details: { agreed_price: deal.agreed_price } });

      return { success: true, message: "تم تأكيد الاستلام وإتمام الصفقة بنجاح 🎉",
        commission_note: deal.agreed_price ? `عمولة ${Math.round(deal.agreed_price * 0.01)} ر.س (1%) مستحقة على البائع` : null };
    }

    // ═══════════════════════════════════════════════
    // DEAL LIFECYCLE — Full deal management
    // ═══════════════════════════════════════════════

    case "send_negotiation_message": {
      const { data: deal } = await sb.from("deals")
        .select("id, buyer_id, seller_id, status").eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.buyer_id !== userId && deal.seller_id !== userId && role === "customer")
        return { error: "ليس لديك صلاحية في هذه الصفقة" };
      if (["completed", "cancelled"].includes(deal.status))
        return { error: "لا يمكن إرسال رسائل في صفقة مكتملة أو ملغاة" };

      const { data: msg, error } = await sb.from("negotiation_messages").insert({
        deal_id: args.deal_id, sender_id: userId, message: args.message,
        message_type: args.message_type || "text", sender_type: "user",
      }).select("id, created_at").single();
      if (error) return { error: error.message };
      return { success: true, message_id: msg.id, sent_at: msg.created_at,
        message: "تم إرسال الرسالة في التفاوض" };
    }

    case "update_agreed_price": {
      const { data: deal } = await sb.from("deals")
        .select("id, buyer_id, seller_id, status, locked").eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.buyer_id !== userId && deal.seller_id !== userId && role === "customer")
        return { error: "ليس لديك صلاحية" };
      if (deal.locked) return { error: "الصفقة مقفلة — لا يمكن تعديل السعر" };
      if (["completed", "cancelled"].includes(deal.status))
        return { error: "لا يمكن تعديل سعر صفقة مكتملة أو ملغاة" };

      const { error } = await sb.from("deals").update({
        agreed_price: args.agreed_price, updated_at: new Date().toISOString(),
      }).eq("id", args.deal_id);
      if (error) return { error: error.message };

      // Log in negotiation
      await sb.from("negotiation_messages").insert({
        deal_id: args.deal_id, sender_id: userId,
        message: `تم تحديث السعر المتفق عليه إلى ${args.agreed_price} ر.س`,
        message_type: "system", sender_type: "system",
      });

      return { success: true, deal_id: args.deal_id, agreed_price: args.agreed_price,
        commission: Math.round(args.agreed_price * 0.01),
        message: `تم تحديث السعر إلى ${args.agreed_price} ر.س`,
        next_step: "يمكن الآن تقديم التأكيد القانوني من الطرفين" };
    }

    case "submit_legal_confirmation": {
      const { data: deal } = await sb.from("deals")
        .select("id, buyer_id, seller_id, status, agreed_price, listing_id, deal_type, deal_details, locked")
        .eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.buyer_id !== userId && deal.seller_id !== userId)
        return { error: "ليس لديك صلاحية في هذه الصفقة" };
      if (!deal.agreed_price || deal.agreed_price <= 0)
        return { error: "يجب الاتفاق على السعر أولاً قبل التأكيد القانوني" };

      const partyRole = deal.buyer_id === userId ? "buyer" : "seller";

      // Check if already confirmed
      const { data: existing } = await sb.from("legal_confirmations")
        .select("id").eq("deal_id", args.deal_id).eq("user_id", userId).is("invalidated_at", null).single();
      if (existing) return { success: true, already_confirmed: true,
        message: `أنت أكدت مسبقاً كـ${partyRole === "buyer" ? "مشتري" : "بائع"}` };

      const { error } = await sb.from("legal_confirmations").insert({
        deal_id: args.deal_id, user_id: userId, party_role: partyRole,
        deal_snapshot: { agreed_price: deal.agreed_price, deal_type: deal.deal_type, details: deal.deal_details },
        confirmations: { platform_terms: true, deal_terms: true, commission_acknowledged: partyRole === "seller" },
      });
      if (error) return { error: error.message };

      // Check if both confirmed (the trigger fn_check_dual_approval handles locking)
      const { data: otherConf } = await sb.from("legal_confirmations")
        .select("id").eq("deal_id", args.deal_id).neq("user_id", userId).is("invalidated_at", null).single();

      const bothConfirmed = !!otherConf;
      return { success: true, party_role: partyRole, both_confirmed: bothConfirmed,
        message: bothConfirmed
          ? "تم تأكيد الطرفين ✅ — الصفقة مقفلة الآن. يمكن إنشاء الاتفاقية الرسمية."
          : `تم تأكيدك كـ${partyRole === "buyer" ? "مشتري" : "بائع"} — بانتظار تأكيد الطرف الآخر`,
        next_step: bothConfirmed ? "إنشاء الاتفاقية الرسمية (generate_agreement)" : "بانتظار الطرف الآخر" };
    }

    case "start_ownership_transfer": {
      const { data: deal } = await sb.from("deals")
        .select("id, buyer_id, seller_id, status, locked, escrow_status")
        .eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.seller_id !== userId) return { error: "فقط البائع يمكنه بدء نقل الملكية" };
      if (!deal.locked || deal.status !== "finalized")
        return { error: "يجب أن تكون الصفقة مؤكدة (finalized) ومقفلة أولاً" };

      const { error } = await sb.from("deals").update({
        escrow_status: "transferring", updated_at: new Date().toISOString(),
      }).eq("id", args.deal_id);
      if (error) return { error: error.message };

      await sb.from("deal_history").insert({
        deal_id: args.deal_id, action: "transfer_started", actor_id: userId,
        details: { initiated_via: "moqbil" },
      });

      // Notify buyer
      await sb.from("notifications").insert({
        user_id: deal.buyer_id, title: "بدأ نقل الملكية ⚡",
        body: "البائع بدأ عملية نقل الملكية — يمكنك تأكيد الاستلام بعد التسلم",
        type: "deal", reference_id: args.deal_id, reference_type: "deal",
      });

      return { success: true, message: "تم بدء نقل الملكية — بانتظار تأكيد المشتري للاستلام",
        next_step: "المشتري يؤكد الاستلام (confirm_receipt)" };
    }

    case "generate_agreement": {
      const { data: deal } = await sb.from("deals")
        .select("id, buyer_id, seller_id, status, agreed_price, listing_id, deal_type, deal_details, locked")
        .eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.buyer_id !== userId && deal.seller_id !== userId && role === "customer")
        return { error: "ليس لديك صلاحية" };
      if (!deal.agreed_price || deal.agreed_price <= 0)
        return { error: "يجب الاتفاق على السعر أولاً" };

      // Get listing details
      const { data: listing } = await sb.from("listings")
        .select("title, city, district, business_activity, deal_type, description, annual_rent, lease_remaining, lease_duration, municipality_license, civil_defense_license, surveillance_cameras, liabilities, overdue_salaries, overdue_rent, documents, inventory, photos")
        .eq("id", deal.listing_id).single();

      // Get parties
      const [buyerProfile, sellerProfile] = await Promise.all([
        sb.from("profiles").select("full_name, phone, email").eq("user_id", deal.buyer_id).single(),
        sb.from("profiles").select("full_name, phone, email").eq("user_id", deal.seller_id).single(),
      ]);

      // Get version count
      const { count } = await sb.from("deal_agreements")
        .select("*", { count: "exact", head: true }).eq("deal_id", args.deal_id);
      const version = (count || 0) + 1;
      const agreementNumber = `AGR-${Date.now()}-V${version}`;

      // Build agreement data
      const { data: agreement, error: insertErr } = await sb.from("deal_agreements").insert({
        deal_id: args.deal_id, version, agreement_number: agreementNumber,
        buyer_name: buyerProfile.data?.full_name, buyer_contact: buyerProfile.data?.phone || buyerProfile.data?.email,
        seller_name: sellerProfile.data?.full_name, seller_contact: sellerProfile.data?.phone || sellerProfile.data?.email,
        deal_title: listing?.title, deal_type: listing?.deal_type || deal.deal_type,
        location: listing ? `${listing.city || ""}${listing.district ? ` - ${listing.district}` : ""}` : null,
        business_activity: listing?.business_activity,
        financial_terms: { agreedPrice: deal.agreed_price, currency: "﷼" },
        lease_details: listing ? { annualRent: listing.annual_rent?.toString(), remaining: listing.lease_remaining } : {},
        license_status: listing ? { municipality: listing.municipality_license, civilDefense: listing.civil_defense_license, cameras: listing.surveillance_cameras } : {},
        liabilities: listing ? { financialLiabilities: listing.liabilities, delayedSalaries: listing.overdue_salaries, unpaidRent: listing.overdue_rent } : {},
        included_assets: listing?.inventory ? (Array.isArray(listing.inventory) ? listing.inventory.map((i: any) => typeof i === "string" ? i : `${i.name || i.category || "أصل"} (${i.quantity || 1})`) : []) : [],
        excluded_assets: [],
        documents_referenced: listing?.documents ? (Array.isArray(listing.documents) ? listing.documents.map((d: any) => typeof d === "string" ? d : d.name || "مستند") : []) : [],
        declarations: { buyerDeclares: "أقر بمراجعة كافة بيانات الصفقة والموافقة عليها", sellerDeclares: "أقر بصحة جميع البيانات المقدمة", platformNote: "المنصة وسيط تقني فقط — الاتفاق يتم مباشرة بين الطرفين." },
        important_notes: ["العمولة 1% من قيمة الصفقة مستحقة على البائع", "تُسدد العمولة بعد إتمام الصفقة واعتماد الطرفين"],
        status: "active",
      }).select("id, agreement_number, version, created_at").single();

      if (insertErr) return { error: insertErr.message };

      // Record history
      await sb.from("deal_history").insert({
        deal_id: args.deal_id, action: version === 1 ? "agreement_created" : "agreement_amended",
        actor_id: userId, details: { agreement_id: agreement.id, version, agreement_number: agreementNumber },
      });

      await sb.from("audit_logs").insert({ user_id: userId, action: "agreement_generated_via_moqbil",
        resource_type: "deal", resource_id: args.deal_id,
        details: { agreement_id: agreement.id, agreement_number: agreementNumber } });

      const agreementUrl = `${BASE_URL}/agreement/${agreementNumber}`;
      return { success: true, agreement_id: agreement.id, agreement_number: agreementNumber,
        version, created_at: agreement.created_at,
        agreement_url: agreementUrl,
        pdf_url: agreementUrl,
        message: `تم إنشاء الاتفاقية رقم ${agreementNumber} (الإصدار ${version}) 📄`,
        instructions: "يمكنك فتح رابط الاتفاقية لمراجعتها وتحميلها كـ PDF",
        next_steps: deal.locked ? ["فتح رابط الاتفاقية", "تحميل PDF", "بدء نقل الملكية"] : ["اعتماد الطرفين أولاً"] };
    }

    case "get_deal_full_details": {
      const { data: deal } = await sb.from("deals")
        .select("*").eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.buyer_id !== userId && deal.seller_id !== userId && role === "customer")
        return { error: "ليس لديك صلاحية" };

      const [listing, agreements, history, messages, files, confirmations, buyerProfile, sellerProfile] = await Promise.all([
        sb.from("listings").select("id, title, price, city, district, business_activity, deal_type, status, photos, description").eq("id", deal.listing_id).single(),
        sb.from("deal_agreements").select("id, agreement_number, version, status, created_at, buyer_approved, seller_approved").eq("deal_id", args.deal_id).order("version", { ascending: false }),
        sb.from("deal_history").select("action, actor_id, details, created_at").eq("deal_id", args.deal_id).order("created_at", { ascending: false }).limit(20),
        sb.from("negotiation_messages").select("id, sender_id, message, message_type, created_at").eq("deal_id", args.deal_id).order("created_at", { ascending: false }).limit(10),
        sb.from("deal_files").select("id, file_name, file_type, uploaded_at").eq("deal_id", args.deal_id),
        sb.from("legal_confirmations").select("id, user_id, party_role, confirmed_at").eq("deal_id", args.deal_id).is("invalidated_at", null),
        sb.from("profiles").select("full_name, phone, email, is_verified, trust_score").eq("user_id", deal.buyer_id).single(),
        sb.from("profiles").select("full_name, phone, email, is_verified, trust_score").eq("user_id", deal.seller_id).single(),
      ]);

      const buyerConfirmed = (confirmations.data || []).some((c: any) => c.party_role === "buyer");
      const sellerConfirmed = (confirmations.data || []).some((c: any) => c.party_role === "seller");

      return {
        deal: { id: deal.id, status: deal.status, agreed_price: deal.agreed_price, locked: deal.locked,
          escrow_status: deal.escrow_status, created_at: deal.created_at, completed_at: deal.completed_at },
        listing: listing.data ? { id: listing.data.id, title: listing.data.title, price: listing.data.price,
          city: listing.data.city, business_activity: listing.data.business_activity, status: listing.data.status } : null,
        buyer: buyerProfile.data ? { name: buyerProfile.data.full_name, verified: buyerProfile.data.is_verified, trust: buyerProfile.data.trust_score } : null,
        seller: sellerProfile.data ? { name: sellerProfile.data.full_name, verified: sellerProfile.data.is_verified, trust: sellerProfile.data.trust_score } : null,
        confirmations: { buyer_confirmed: buyerConfirmed, seller_confirmed: sellerConfirmed, both: buyerConfirmed && sellerConfirmed },
        agreements: agreements.data || [],
        recent_messages: messages.data || [],
        files: files.data || [],
        history: history.data || [],
        commission: deal.agreed_price ? { amount: Math.round(deal.agreed_price * 0.01), rate: "1%" } : null,
      };
    }

    case "get_agreement_details": {
      const { data: agr } = await sb.from("deal_agreements").select("*").eq("id", args.agreement_id).single();
      if (!agr) return { error: "الاتفاقية غير موجودة" };

      const { data: deal } = await sb.from("deals").select("buyer_id, seller_id").eq("id", agr.deal_id).single();
      if (deal && deal.buyer_id !== userId && deal.seller_id !== userId && role === "customer")
        return { error: "ليس لديك صلاحية" };

      const commissionAmount = Math.round((agr.financial_terms as any)?.agreedPrice * 0.01 || 0);
      const agreementUrl = `${BASE_URL}/agreement/${agr.agreement_number}`;

      return {
        agreement: { ...agr, commission_amount: commissionAmount, commission_rate: 0.01 },
        agreement_url: agreementUrl,
        pdf_instructions: "افتح الرابط لمعاينة وتحميل الاتفاقية كـ PDF",
      };
    }

    case "get_my_agreements": {
      // Get deals where user is buyer or seller
      const { data: deals } = await sb.from("deals")
        .select("id").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
      if (!deals || deals.length === 0) return { agreements: [], total: 0 };

      const dealIds = deals.map((d: any) => d.id);
      const { data: agreements } = await sb.from("deal_agreements")
        .select("id, deal_id, agreement_number, version, status, deal_title, deal_type, location, created_at, buyer_approved, seller_approved, buyer_name, seller_name, financial_terms")
        .in("deal_id", dealIds).order("created_at", { ascending: false });

      return {
        agreements: (agreements || []).map((a: any) => ({
          ...a,
          agreed_price: (a.financial_terms as any)?.agreedPrice,
          both_approved: a.buyer_approved && a.seller_approved,
          agreement_url: `${BASE_URL}/agreement/${a.agreement_number}`,
        })),
        total: agreements?.length || 0,
      };
    }

    case "get_deal_negotiation_history": {
      const { data: deal } = await sb.from("deals")
        .select("id, buyer_id, seller_id").eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.buyer_id !== userId && deal.seller_id !== userId && role === "customer")
        return { error: "ليس لديك صلاحية" };

      const { data: messages } = await sb.from("negotiation_messages")
        .select("id, sender_id, message, message_type, sender_type, created_at, is_read")
        .eq("deal_id", args.deal_id).order("created_at", { ascending: true }).limit(args.limit || 50);

      // Enrich with names
      const senderIds = [...new Set((messages || []).map((m: any) => m.sender_id))];
      const { data: profiles } = await sb.from("profiles")
        .select("user_id, full_name").in("user_id", senderIds);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });

      return {
        messages: (messages || []).map((m: any) => ({
          ...m,
          sender_name: nameMap[m.sender_id] || "مستخدم",
          is_mine: m.sender_id === userId,
        })),
        total: messages?.length || 0,
      };
    }

    case "complete_deal_via_moqbil": {
      // Full deal completion flow: check → legal confirm → generate agreement
      const { data: deal } = await sb.from("deals")
        .select("id, buyer_id, seller_id, status, agreed_price, listing_id, deal_type, locked")
        .eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.buyer_id !== userId && deal.seller_id !== userId && role === "customer")
        return { error: "ليس لديك صلاحية" };
      if (!deal.agreed_price || deal.agreed_price <= 0)
        return { error: "يجب الاتفاق على السعر أولاً — استخدم update_agreed_price" };
      if (deal.status === "completed") return { error: "الصفقة مكتملة بالفعل" };

      const steps: any[] = [];

      // Step 1: Check legal confirmations
      const { data: confs } = await sb.from("legal_confirmations")
        .select("user_id, party_role").eq("deal_id", args.deal_id).is("invalidated_at", null);
      const myConf = (confs || []).find((c: any) => c.user_id === userId);
      const partyRole = deal.buyer_id === userId ? "buyer" : "seller";
      const otherConf = (confs || []).find((c: any) => c.party_role === (partyRole === "buyer" ? "seller" : "buyer"));

      if (!myConf) {
        // Auto-submit legal confirmation
        await sb.from("legal_confirmations").insert({
          deal_id: args.deal_id, user_id: userId, party_role: partyRole,
          deal_snapshot: { agreed_price: deal.agreed_price, deal_type: deal.deal_type },
          confirmations: { platform_terms: true, deal_terms: true, commission_acknowledged: partyRole === "seller" },
        });
        steps.push({ action: "legal_confirmation", status: "done", detail: `تم تأكيدك كـ${partyRole === "buyer" ? "مشتري" : "بائع"}` });
      } else {
        steps.push({ action: "legal_confirmation", status: "already_done", detail: "مؤكد مسبقاً" });
      }

      const bothConfirmed = !!otherConf || (!!myConf && !!otherConf);
      if (!otherConf && !myConf) {
        // Just submitted mine, other not confirmed yet
        steps.push({ action: "waiting", status: "pending", detail: "بانتظار تأكيد الطرف الآخر" });
        return { success: true, steps, partial: true,
          message: `تم تأكيدك — لكن الطرف الآخر لم يؤكد بعد. سيتم قفل الصفقة وإنشاء الاتفاقية تلقائياً عند تأكيد الطرفين.` };
      }

      // Step 2: Check/generate agreement
      const { data: existingAgr } = await sb.from("deal_agreements")
        .select("id, agreement_number").eq("deal_id", args.deal_id).order("version", { ascending: false }).limit(1).single();

      let agreementResult: any;
      if (existingAgr) {
        agreementResult = existingAgr;
        steps.push({ action: "agreement", status: "already_exists", detail: `اتفاقية ${existingAgr.agreement_number} موجودة` });
      } else {
        // Generate agreement via the same tool
        agreementResult = await executeTool("generate_agreement", { deal_id: args.deal_id }, userId, role, sb);
        if (agreementResult.error) return { error: agreementResult.error };
        steps.push({ action: "agreement", status: "created", detail: `تم إنشاء اتفاقية ${agreementResult.agreement_number}` });
      }

      const agrNumber = agreementResult.agreement_number;
      const agrUrl = `${BASE_URL}/agreement/${agrNumber}`;

      return { success: true, steps, partial: false,
        agreement_number: agrNumber, agreement_url: agrUrl,
        commission: { amount: Math.round(deal.agreed_price * 0.01), note: "1% على البائع" },
        message: `تم إتمام إجراءات الصفقة بنجاح 🎉\n\n📄 **اتفاقية رقم ${agrNumber}**\n🔗 [فتح الاتفاقية](${agrUrl})\n💰 عمولة: ${Math.round(deal.agreed_price * 0.01)} ر.س`,
        next_steps: ["فتح رابط الاتفاقية لتحميل PDF", "بدء نقل الملكية (start_ownership_transfer)", "تأكيد الاستلام (confirm_receipt)"] };
    }

    case "save_listing": {
      const { data: existing } = await sb.from("listing_likes")
        .select("id").eq("listing_id", args.listing_id).eq("user_id", userId).single();
      if (existing) return { success: true, message: "الإعلان محفوظ بالفعل" };
      const { error } = await sb.from("listing_likes").insert({ listing_id: args.listing_id, user_id: userId });
      if (error) return { error: error.message };
      return { success: true, message: "تم حفظ الإعلان في المفضلة" };
    }

    case "unsave_listing": {
      const { error } = await sb.from("listing_likes").delete().eq("listing_id", args.listing_id).eq("user_id", userId);
      if (error) return { error: error.message };
      return { success: true, message: "تم إزالة الإعلان من المفضلة" };
    }

    case "create_search_alert": {
      const filters: any = {};
      if (args.city) filters.city = args.city;
      if (args.business_activity) filters.business_activity = args.business_activity;
      if (args.min_price) filters.min_price = args.min_price;
      if (args.max_price) filters.max_price = args.max_price;

      const { data, error } = await sb.from("search_alerts").insert({
        user_id: userId, search_query: args.search_query, filters, is_active: true,
      }).select("id").single();
      if (error) return { error: error.message };
      return { success: true, alert_id: data.id, message: `تم إنشاء تنبيه: "${args.search_query}" — سنعلمك فور ظهور إعلان مطابق` };
    }

    case "send_message": {
      if (!args.content?.trim()) return { error: "الرسالة فارغة" };

      let convId = args.conversation_id;
      let receiverId = args.receiver_id;

      // If listing_id provided, find or create conversation
      if (!convId && args.listing_id) {
        const { data: listing } = await sb.from("listings").select("owner_id").eq("id", args.listing_id).single();
        if (!listing) return { error: "الإعلان غير موجود" };
        receiverId = listing.owner_id;
        if (receiverId === userId) return { error: "لا يمكنك مراسلة نفسك" };

        // Find existing conversation
        const { data: conv } = await sb.from("conversations")
          .select("id").eq("listing_id", args.listing_id)
          .or(`and(buyer_id.eq.${userId},seller_id.eq.${receiverId}),and(buyer_id.eq.${receiverId},seller_id.eq.${userId})`)
          .single();
        if (conv) {
          convId = conv.id;
        } else {
          const { data: newConv, error: convErr } = await sb.from("conversations").insert({
            buyer_id: userId, seller_id: receiverId, listing_id: args.listing_id,
            last_message: args.content.slice(0, 100), last_message_at: new Date().toISOString(),
          }).select("id").single();
          if (convErr) return { error: convErr.message };
          convId = newConv.id;
        }
      }

      if (!convId || !receiverId) return { error: "يجب تحديد المحادثة أو الإعلان" };

      const { error } = await sb.from("messages").insert({
        conversation_id: convId, sender_id: userId, receiver_id: receiverId,
        content: args.content, listing_id: args.listing_id || null,
      });
      if (error) return { error: error.message };

      // Update conversation
      await sb.from("conversations").update({
        last_message: args.content.slice(0, 100), last_message_at: new Date().toISOString(),
      }).eq("id", convId);

      return { success: true, message: "تم إرسال الرسالة" };
    }

    // ═══════════════════════════════════════════════
    // SUPERVISOR/ADMIN WRITE
    // ═══════════════════════════════════════════════

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
      if (args.city) upd.city = args.city;
      if (args.district) upd.district = args.district;
      if (args.annual_rent) upd.annual_rent = args.annual_rent;
      if (args.area_sqm) upd.area_sqm = args.area_sqm;
      if (args.deal_type) upd.deal_type = args.deal_type;
      const { error } = await sb.from("listings").update(upd).eq("id", args.listing_id);
      if (error) return { error: error.message };
      return { success: true, listing_id: args.listing_id, updated_fields: Object.keys(upd).filter(k => k !== "updated_at") };
    }

    case "assign_reviewer": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      const { data: sv } = await sb.from("user_roles").select("user_id").eq("user_id", args.supervisor_id).eq("role", "supervisor").single();
      if (!sv) return { error: "المشرف غير موجود" };
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
      await sb.from("notifications").insert({ user_id: listing.owner_id, title: "تم اعتماد إعلانك ✅",
        body: `تم نشر إعلانك بنجاح${args.notes ? ` — ${args.notes}` : ""}`, type: "listing", reference_id: args.listing_id, reference_type: "listing" });
      await sb.from("audit_logs").insert({ user_id: userId, action: "listing_approved", resource_type: "listing",
        resource_id: args.listing_id, details: { notes: args.notes } });
      return { success: true, listing_id: args.listing_id, listing_url: `${BASE_URL}/listing/${args.listing_id}`, message: "تم اعتماد ونشر الإعلان" };
    }

    case "reject_draft_listing": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      const { data: listing } = await sb.from("listings").select("id, owner_id").eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };
      await sb.from("notifications").insert({ user_id: listing.owner_id, title: "إعلانك يحتاج تعديل ⚠️",
        body: `سبب الإعادة: ${args.reason}`, type: "listing", reference_id: args.listing_id, reference_type: "listing" });
      await sb.from("audit_logs").insert({ user_id: userId, action: "listing_rejected", resource_type: "listing",
        resource_id: args.listing_id, details: { reason: args.reason } });
      return { success: true, listing_id: args.listing_id, message: "تم إعادة الإعلان مع الملاحظات" };
    }

    case "submit_review_status": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      const { data: listing } = await sb.from("listings").select("id, owner_id, title").eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };
      if (args.status === "approved") {
        await sb.from("listings").update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", args.listing_id);
      }
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
      const commissionAmount = deal.agreed_price * 0.01;
      const { data: existing } = await sb.from("deal_commissions").select("id").eq("deal_id", args.deal_id).single();
      if (existing) return { error: "يوجد إشعار عمولة سابق لهذه الصفقة", existing_id: existing.id };
      const { data: newComm, error } = await sb.from("deal_commissions").insert({
        deal_id: args.deal_id, seller_id: deal.seller_id, deal_amount: deal.agreed_price,
        commission_rate: 1, commission_amount: commissionAmount, payment_status: "pending",
      }).select("id").single();
      if (error) return { error: error.message };
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

    // ═══════════════════════════════════════════════
    // OWNER-ONLY WRITE
    // ═══════════════════════════════════════════════

    case "suspend_user": {
      if (role !== "platform_owner") return { error: "ليس لديك صلاحية" };
      const { error } = await sb.from("profiles").update({ is_suspended: true, is_active: false, updated_at: new Date().toISOString() }).eq("user_id", args.user_id);
      if (error) return { error: error.message };
      await sb.from("audit_logs").insert({ user_id: userId, action: "user_suspended", resource_type: "user",
        resource_id: args.user_id, details: { reason: args.reason } });
      return { success: true, message: "تم إيقاف الحساب" };
    }

    case "unsuspend_user": {
      if (role !== "platform_owner") return { error: "ليس لديك صلاحية" };
      const { error } = await sb.from("profiles").update({ is_suspended: false, is_active: true, updated_at: new Date().toISOString() }).eq("user_id", args.user_id);
      if (error) return { error: error.message };
      await sb.from("audit_logs").insert({ user_id: userId, action: "user_unsuspended", resource_type: "user", resource_id: args.user_id });
      return { success: true, message: "تم إعادة تفعيل الحساب" };
    }

    case "assign_role": {
      if (role !== "platform_owner") return { error: "ليس لديك صلاحية" };
      // Delete old role and insert new
      await sb.from("user_roles").delete().eq("user_id", args.user_id);
      const { error } = await sb.from("user_roles").insert({ user_id: args.user_id, role: args.role, assigned_by: userId });
      if (error) return { error: error.message };
      await sb.from("audit_logs").insert({ user_id: userId, action: "role_changed", resource_type: "user",
        resource_id: args.user_id, details: { new_role: args.role } });
      return { success: true, message: `تم تعيين الدور "${args.role}" بنجاح` };
    }

    case "trigger_backup": {
      if (role !== "platform_owner") return { error: "ليس لديك صلاحية" };
      const { data, error } = await sb.from("backup_logs").insert({
        backup_type: "manual", status: "started", initiated_by: userId,
        tables_included: ["listings", "deals", "profiles", "invoices"],
      }).select("id").single();
      if (error) return { error: error.message };
      return { success: true, backup_id: data.id, message: "تم بدء النسخة الاحتياطية" };
    }

    case "feature_listing": {
      if (role !== "platform_owner") return { error: "ليس لديك صلاحية" };
      const { error } = await sb.from("listings").update({ featured: args.featured, updated_at: new Date().toISOString() }).eq("id", args.listing_id);
      if (error) return { error: error.message };
      return { success: true, message: args.featured ? "تم تمييز الإعلان" : "تم إلغاء تمييز الإعلان" };
    }

    // ═══════════════════════════════════════════════
    // SUPERVISOR WRITE — Verification & Reports
    // ═══════════════════════════════════════════════

    case "approve_verification": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      const { data: ver } = await sb.from("seller_verifications").select("id, user_id").eq("id", args.verification_id).single();
      if (!ver) return { error: "طلب التوثيق غير موجود" };
      const { error } = await sb.from("seller_verifications").update({
        verification_status: "approved", reviewed_by: userId, reviewed_at: new Date().toISOString(),
      }).eq("id", args.verification_id);
      if (error) return { error: error.message };
      // Update profile
      await sb.from("profiles").update({ is_verified: true, verification_level: "full", updated_at: new Date().toISOString() }).eq("user_id", ver.user_id);
      await sb.from("notifications").insert({
        user_id: ver.user_id, title: "تم اعتماد توثيقك ✅", body: args.notes || "تم توثيق حسابك بنجاح",
        type: "verification", reference_type: "verification",
      });
      await sb.from("audit_logs").insert({ user_id: userId, action: "verification_approved", resource_type: "verification",
        resource_id: args.verification_id, details: { notes: args.notes } });
      return { success: true, message: "تم اعتماد التوثيق" };
    }

    case "reject_verification": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      const { data: ver } = await sb.from("seller_verifications").select("id, user_id").eq("id", args.verification_id).single();
      if (!ver) return { error: "طلب التوثيق غير موجود" };
      const { error } = await sb.from("seller_verifications").update({
        verification_status: "rejected", reviewed_by: userId, reviewed_at: new Date().toISOString(), rejection_reason: args.reason,
      }).eq("id", args.verification_id);
      if (error) return { error: error.message };
      await sb.from("notifications").insert({
        user_id: ver.user_id, title: "تم رفض طلب التوثيق ❌", body: `السبب: ${args.reason}`,
        type: "verification", reference_type: "verification",
      });
      return { success: true, message: "تم رفض طلب التوثيق" };
    }

    case "resolve_report": {
      if (role === "customer") return { error: "ليس لديك صلاحية" };
      const { error } = await sb.from("listing_reports").update({
        status: "resolved", reviewed_by: userId, reviewed_at: new Date().toISOString(),
      }).eq("id", args.report_id);
      if (error) return { error: error.message };
      await sb.from("audit_logs").insert({ user_id: userId, action: "report_resolved", resource_type: "report",
        resource_id: args.report_id, details: { action_taken: args.action_taken } });
      return { success: true, message: "تم إغلاق البلاغ" };
    }


    // ═══════════════════════════════════════════════
    // ADVANCED MOQBIL TOOLS — Implementations
    // ═══════════════════════════════════════════════

    case "valuate_business": {
      const { data: listing } = await sb.from("listings")
        .select("id, title, price, city, business_activity, deal_type, area_sqm, annual_rent, ai_price_analysis, ai_assets_combined, inventory")
        .eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };

      const askingPrice = listing.price || 0;
      const monthlyRev = args.monthly_revenue || 0;
      const monthlyExp = args.monthly_expenses || 0;
      const monthlyProfit = monthlyRev - monthlyExp;
      const annualProfit = monthlyProfit * 12;
      const yearsOp = args.years_operating || 1;

      // Count assets
      const assets = listing.ai_assets_combined || listing.inventory || [];
      const assetCount = Array.isArray(assets) ? assets.length : 0;

      // Valuation methods
      const methods: any[] = [];

      // Method 1: Earnings multiplier (2-5x annual profit based on years)
      if (annualProfit > 0) {
        const multiplier = Math.min(2 + yearsOp * 0.5, 5);
        const earningsVal = annualProfit * multiplier;
        methods.push({ method: "مضاعف الأرباح", value: Math.round(earningsVal), multiplier: `${multiplier.toFixed(1)}x`, note: `الربح السنوي ${annualProfit.toLocaleString()} × ${multiplier.toFixed(1)}` });
      }

      // Method 2: Asset-based
      if (listing.ai_price_analysis) {
        const pa = typeof listing.ai_price_analysis === "string" ? JSON.parse(listing.ai_price_analysis) : listing.ai_price_analysis;
        const assetVal = pa.estimated_assets_value || pa.total_estimated_value;
        if (assetVal) methods.push({ method: "قيمة الأصول", value: Math.round(assetVal), note: `تقدير AI للأصول (${assetCount} أصل)` });
      }

      // Method 3: Revenue-based (1.5-3x annual revenue)
      if (monthlyRev > 0) {
        const revMultiplier = yearsOp >= 3 ? 2.5 : yearsOp >= 1 ? 2 : 1.5;
        const revVal = monthlyRev * 12 * revMultiplier;
        methods.push({ method: "مضاعف الإيرادات", value: Math.round(revVal), multiplier: `${revMultiplier}x`, note: `الإيراد السنوي × ${revMultiplier}` });
      }

      // Method 4: Lease + setup (for asset-heavy businesses)
      if (listing.annual_rent && listing.annual_rent > 0) {
        const leaseSetupVal = listing.annual_rent * 2 + (assetCount * 5000);
        methods.push({ method: "الإيجار + التجهيز", value: Math.round(leaseSetupVal), note: "إيجار سنتين + تقدير التجهيزات" });
      }

      // Calculate range
      const values = methods.map(m => m.value).filter(v => v > 0);
      const avgVal = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : askingPrice;
      const minVal = Math.round(avgVal * 0.85);
      const maxVal = Math.round(avgVal * 1.15);

      // Compare with asking price
      let priceVerdict = "عادل";
      if (askingPrice > 0) {
        const diff = ((askingPrice - avgVal) / avgVal) * 100;
        if (diff > 25) priceVerdict = "مبالغ فيه";
        else if (diff > 10) priceVerdict = "أعلى من التقييم قليلاً";
        else if (diff < -25) priceVerdict = "فرصة ممتازة";
        else if (diff < -10) priceVerdict = "أقل من التقييم";
      }

      return {
        listing_title: listing.title, asking_price: askingPrice,
        valuation: { min: minVal, max: maxVal, average: Math.round(avgVal) },
        methods,
        price_verdict: priceVerdict,
        financial_summary: monthlyRev > 0 ? {
          monthly_revenue: monthlyRev, monthly_expenses: monthlyExp,
          monthly_profit: monthlyProfit, annual_profit: annualProfit,
          profit_margin: `${Math.round((monthlyProfit / monthlyRev) * 100)}%`,
        } : null,
        recommendation: priceVerdict === "فرصة ممتازة" ? "فرصة ممتازة — السعر أقل من القيمة التقديرية" :
          priceVerdict === "مبالغ فيه" ? "السعر مرتفع — حاول التفاوض" : "السعر معقول ضمن النطاق المتوقع",
      };
    }

    case "check_seller_background": {
      let sellerId = args.seller_id;
      if (!sellerId && args.listing_id) {
        const { data: l } = await sb.from("listings").select("owner_id").eq("id", args.listing_id).single();
        sellerId = l?.owner_id;
      }
      if (!sellerId) return { error: "يجب تحديد البائع أو الإعلان" };

      const [profile, deals, reviews, listings, commissions, reports] = await Promise.all([
        sb.from("profiles").select("full_name, is_verified, verification_level, trust_score, completed_deals, cancelled_deals, disputes_count, created_at, phone_verified").eq("user_id", sellerId).single(),
        sb.from("deals").select("id, status, created_at, completed_at").or(`seller_id.eq.${sellerId}`).order("created_at", { ascending: false }),
        sb.from("seller_reviews").select("overall_experience, honesty, responsiveness, listing_accuracy, comment, created_at").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(10),
        sb.from("listings").select("id, title, status, created_at").eq("owner_id", sellerId).is("deleted_at", null),
        sb.from("deal_commissions").select("payment_status, commission_amount").eq("seller_id", sellerId),
        sb.from("listing_reports").select("id, reason, status").eq("listing_id", sellerId),
      ]);

      const p = profile.data;
      const allDeals = deals.data || [];
      const completed = allDeals.filter((d: any) => d.status === "completed" || d.status === "finalized").length;
      const cancelled = allDeals.filter((d: any) => d.status === "cancelled").length;
      const totalDeals = allDeals.length;
      const cancelRate = totalDeals > 0 ? Math.round((cancelled / totalDeals) * 100) : 0;

      // Response time estimate
      const avgCompletionDays = allDeals.filter((d: any) => d.completed_at)
        .map((d: any) => (new Date(d.completed_at).getTime() - new Date(d.created_at).getTime()) / 86400000)
        .reduce((a: number, b: number, _: number, arr: number[]) => a + b / arr.length, 0);

      const allReviews = reviews.data || [];
      const avgRating = allReviews.length > 0 ? allReviews.reduce((s: number, r: any) => s + r.overall_experience, 0) / allReviews.length : null;

      const comms = commissions.data || [];
      const unpaidComms = comms.filter((c: any) => c.payment_status !== "verified").length;

      // Risk flags
      const flags: string[] = [];
      if (!p?.is_verified) flags.push("الحساب غير موثق");
      if (cancelRate > 30) flags.push(`نسبة إلغاء مرتفعة (${cancelRate}%)`);
      if (unpaidComms > 0) flags.push(`${unpaidComms} عمولة غير مسددة`);
      if ((p?.disputes_count || 0) > 0) flags.push(`${p.disputes_count} نزاع سابق`);
      if (avgRating && avgRating < 3) flags.push("تقييم منخفض من المشترين");
      if (!p?.phone_verified) flags.push("الجوال غير مُوثق");

      const accountAge = p?.created_at ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) : 0;

      let verdict = "آمن";
      if (flags.length >= 3) verdict = "حذر شديد";
      else if (flags.length >= 1) verdict = "تحقق إضافي مطلوب";

      return {
        seller_name: p?.full_name || "غير معروف",
        trust_score: p?.trust_score || 0,
        is_verified: p?.is_verified || false,
        verification_level: p?.verification_level || "none",
        account_age_days: accountAge,
        deals: { total: totalDeals, completed, cancelled, cancel_rate: `${cancelRate}%` },
        avg_completion_days: Math.round(avgCompletionDays) || null,
        reviews: { count: allReviews.length, average_rating: avgRating ? Number(avgRating.toFixed(1)) : null,
          recent: allReviews.slice(0, 3).map((r: any) => ({ rating: r.overall_experience, comment: r.comment?.slice(0, 100) })) },
        commission_compliance: { total: comms.length, unpaid: unpaidComms },
        active_listings: (listings.data || []).length,
        risk_flags: flags,
        verdict,
        recommendation: verdict === "آمن" ? "البائع موثوق — يمكنك المتابعة بثقة" :
          verdict === "حذر شديد" ? "تنبيه: عدة علامات مقلقة — تأكد من كل التفاصيل قبل المتابعة" :
          "تحقق من بعض النقاط قبل إتمام الصفقة",
      };
    }

    case "generate_deal_checklist": {
      const { data: deal } = await sb.from("deals")
        .select("id, buyer_id, seller_id, status, agreed_price, listing_id, deal_type, locked")
        .eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.buyer_id !== userId && deal.seller_id !== userId && role === "customer")
        return { error: "ليس لديك صلاحية" };

      const { data: listing } = await sb.from("listings")
        .select("title, deal_type, business_activity, city, municipality_license, civil_defense_license, lease_remaining, documents")
        .eq("id", deal.listing_id).single();

      const dealType = listing?.deal_type || deal.deal_type || "full_takeover";
      const iAmBuyer = deal.buyer_id === userId;
      const iAmSeller = deal.seller_id === userId;

      const sellerTasks: any[] = [
        { task: "تجهيز جميع المستندات الرسمية", status: Array.isArray(listing?.documents) && listing.documents.length > 0 ? "done" : "pending", priority: "high" },
        { task: "تأكيد بيانات الإعلان وصحة المعلومات", status: "pending", priority: "high" },
        { task: "الموافقة على السعر النهائي", status: deal.agreed_price ? "done" : "pending", priority: "high" },
        { task: "تقديم التأكيد القانوني", status: deal.locked ? "done" : "pending", priority: "high" },
      ];

      const buyerTasks: any[] = [
        { task: "مراجعة تفاصيل الإعلان والأصول", status: "pending", priority: "high" },
        { task: "التحقق من صحة المستندات", status: "pending", priority: "high" },
        { task: "الموافقة على السعر النهائي", status: deal.agreed_price ? "done" : "pending", priority: "high" },
        { task: "تقديم التأكيد القانوني", status: deal.locked ? "done" : "pending", priority: "high" },
      ];

      if (dealType === "full_takeover") {
        sellerTasks.push(
          { task: "تجهيز عقد نقل السجل التجاري", status: "pending", priority: "high" },
          { task: "تصفية جميع الالتزامات المالية", status: "pending", priority: "high" },
          { task: "إخلاء الموقع وتسليم المفاتيح", status: "pending", priority: "medium" },
        );
        buyerTasks.push(
          { task: "التحقق من سلامة السجل التجاري", status: "pending", priority: "high" },
          { task: "مراجعة التراخيص والرخص البلدية", status: listing?.municipality_license ? "done" : "pending", priority: "high" },
          { task: "زيارة الموقع ومعاينة الأصول", status: "pending", priority: "medium" },
        );
      } else if (dealType === "assets_only" || dealType === "assets_setup") {
        sellerTasks.push(
          { task: "إعداد قائمة جرد الأصول النهائية", status: "pending", priority: "high" },
          { task: "تجهيز فواتير شراء الأجهزة والمعدات", status: "pending", priority: "medium" },
        );
        buyerTasks.push(
          { task: "معاينة الأصول والتحقق من حالتها", status: "pending", priority: "high" },
          { task: "مطابقة الجرد مع القائمة المعلنة", status: "pending", priority: "high" },
        );
      }

      // Common final tasks
      sellerTasks.push({ task: "بدء نقل الملكية عبر المنصة", status: deal.status === "completed" ? "done" : "pending", priority: "high" });
      buyerTasks.push({ task: "تأكيد استلام النشاط/الأصول", status: deal.status === "completed" ? "done" : "pending", priority: "high" });

      const myTasks = iAmBuyer ? buyerTasks : iAmSeller ? sellerTasks : [];
      const completedCount = myTasks.filter(t => t.status === "done").length;

      return {
        deal_id: deal.id, deal_type: dealType,
        your_role: iAmBuyer ? "مشتري" : "بائع",
        your_tasks: myTasks,
        progress: `${completedCount}/${myTasks.length}`,
        progress_percent: Math.round((completedCount / myTasks.length) * 100),
        other_party_tasks_count: iAmBuyer ? sellerTasks.length : buyerTasks.length,
        next_action: myTasks.find(t => t.status === "pending" && t.priority === "high")?.task || "جميع المهام مكتملة",
      };
    }

    case "mediate_dispute": {
      const { data: deal } = await sb.from("deals")
        .select("id, buyer_id, seller_id, status, agreed_price, listing_id, created_at, updated_at")
        .eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.buyer_id !== userId && deal.seller_id !== userId && role === "customer")
        return { error: "ليس لديك صلاحية" };

      const [messages, listing, offers] = await Promise.all([
        sb.from("negotiation_messages").select("sender_id, message, message_type, created_at").eq("deal_id", args.deal_id).order("created_at", { ascending: true }),
        sb.from("listings").select("title, price, city, business_activity").eq("id", deal.listing_id).single(),
        sb.from("listing_offers").select("offered_price, status, created_at").eq("listing_id", deal.listing_id).order("created_at", { ascending: false }).limit(10),
      ]);

      const msgs = messages.data || [];
      const buyerMsgs = msgs.filter((m: any) => m.sender_id === deal.buyer_id);
      const sellerMsgs = msgs.filter((m: any) => m.sender_id === deal.seller_id);

      // Detect stall
      const lastMsgTime = msgs.length > 0 ? new Date(msgs[msgs.length - 1].created_at).getTime() : 0;
      const hoursSinceLastMsg = lastMsgTime ? (Date.now() - lastMsgTime) / 3600000 : 999;
      const isStalled = hoursSinceLastMsg > 48;

      // Find price positions
      const askingPrice = listing.data?.price || 0;
      const allOfferPrices = (offers.data || []).map((o: any) => o.offered_price).filter((p: number) => p > 0);
      const highestOffer = allOfferPrices.length > 0 ? Math.max(...allOfferPrices) : 0;
      const suggestedMiddle = askingPrice > 0 && highestOffer > 0 ? Math.round((askingPrice + highestOffer) / 2) : null;

      return {
        deal_status: deal.status,
        is_stalled: isStalled,
        hours_since_last_message: Math.round(hoursSinceLastMsg),
        conversation_stats: {
          total_messages: msgs.length,
          buyer_messages: buyerMsgs.length,
          seller_messages: sellerMsgs.length,
        },
        price_analysis: {
          asking_price: askingPrice,
          highest_offer: highestOffer,
          suggested_middle_ground: suggestedMiddle,
          gap_percent: askingPrice > 0 && highestOffer > 0 ? Math.round(((askingPrice - highestOffer) / askingPrice) * 100) : null,
        },
        mediation_proposal: suggestedMiddle ? {
          proposed_price: suggestedMiddle,
          rationale: `نقطة التقاء عادلة بين السعر المطلوب (${askingPrice.toLocaleString()} ر.س) وأعلى عرض (${highestOffer.toLocaleString()} ر.س)`,
          savings_for_buyer: askingPrice - suggestedMiddle,
          gain_over_offer_for_seller: suggestedMiddle - highestOffer,
        } : null,
        recommendation: isStalled ? "التفاوض متوقف — أقترح تقديم عرض وسط لإعادة المحادثة" :
          (msgs.length > 10 ? "حوار طويل — حاول تحديد سعر نهائي" : "التفاوض نشط — تابع"),
      };
    }

    case "post_deal_followup": {
      const { data: deal } = await sb.from("deals")
        .select("id, buyer_id, seller_id, status, completed_at, listing_id, agreed_price")
        .eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.status !== "completed" && deal.status !== "finalized")
        return { error: "المتابعة متاحة فقط للصفقات المكتملة" };

      const [listing, review, commission] = await Promise.all([
        sb.from("listings").select("title, business_activity, city").eq("id", deal.listing_id).single(),
        sb.from("seller_reviews").select("id").eq("deal_id", args.deal_id).eq("reviewer_id", deal.buyer_id).single(),
        sb.from("deal_commissions").select("payment_status, commission_amount").eq("deal_id", args.deal_id).single(),
      ]);

      const daysSinceCompletion = deal.completed_at ? Math.floor((Date.now() - new Date(deal.completed_at).getTime()) / 86400000) : 0;
      const hasReview = !!review.data;
      const commissionPaid = commission.data?.payment_status === "verified";
      const iAmBuyer = deal.buyer_id === userId;

      const actions: any[] = [];
      if (iAmBuyer && !hasReview) actions.push({ action: "تقييم البائع", description: "شاركنا تجربتك مع البائع لمساعدة الآخرين", priority: "medium" });
      if (!iAmBuyer && !commissionPaid) actions.push({ action: "سداد العمولة", description: `عمولة ${commission.data?.commission_amount || 0} ر.س مستحقة`, priority: "high" });

      const tips = iAmBuyer ? [
        "تأكد من نقل جميع التراخيص باسمك",
        "راجع عقود الموردين والعمالة",
        "حدّث بيانات الضرائب والزكاة",
        "تواصل مع العملاء الحاليين للتعريف بنفسك",
        "راجع حسابات المصاريف الشهرية الفعلية",
      ] : [
        "تأكد من تسليم جميع المفاتيح والأكواد",
        "سلّم قائمة الموردين والعملاء",
        "أكمل تحويل الخطوط والاشتراكات",
      ];

      return {
        deal_title: listing.data?.title,
        days_since_completion: daysSinceCompletion,
        pending_actions: actions,
        has_buyer_review: hasReview,
        commission_status: commission.data?.payment_status || "unknown",
        tips_for_you: tips.slice(0, 4),
        message: iAmBuyer
          ? `مبروك على استلام "${listing.data?.title}" — إليك بعض النصائح المهمة`
          : `تم إتمام الصفقة — تأكد من إكمال المتطلبات المتبقية`,
      };
    }

    case "quick_feasibility": {
      const { data: listing } = await sb.from("listings")
        .select("id, title, price, city, business_activity, annual_rent, area_sqm, ai_price_analysis")
        .eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };

      const investmentAmount = args.investment_amount || listing.price || 0;
      const monthlyRevenue = args.monthly_revenue || 0;
      const monthlyExpenses = args.monthly_expenses || (listing.annual_rent ? listing.annual_rent / 12 : 0);
      const monthlyProfit = monthlyRevenue - monthlyExpenses;
      const annualProfit = monthlyProfit * 12;

      // Payback period
      const paybackMonths = monthlyProfit > 0 ? Math.ceil(investmentAmount / monthlyProfit) : null;
      const paybackYears = paybackMonths ? (paybackMonths / 12).toFixed(1) : null;

      // ROI
      const roi = investmentAmount > 0 && annualProfit > 0 ? Math.round((annualProfit / investmentAmount) * 100) : null;

      // Break-even (monthly revenue needed to cover expenses + investment over 3 years)
      const monthlyInvestmentCost = investmentAmount / 36;
      const breakEvenRevenue = Math.round(monthlyExpenses + monthlyInvestmentCost);

      // Scenarios
      const scenarios = {
        optimistic: { monthly_profit: Math.round(monthlyProfit * 1.3), annual_profit: Math.round(annualProfit * 1.3), payback_months: monthlyProfit > 0 ? Math.ceil(investmentAmount / (monthlyProfit * 1.3)) : null },
        realistic: { monthly_profit: Math.round(monthlyProfit), annual_profit: Math.round(annualProfit), payback_months: paybackMonths },
        pessimistic: { monthly_profit: Math.round(monthlyProfit * 0.7), annual_profit: Math.round(annualProfit * 0.7), payback_months: monthlyProfit > 0 ? Math.ceil(investmentAmount / (monthlyProfit * 0.7)) : null },
      };

      let verdict = "غير محدد";
      if (roi && roi > 30) verdict = "فرصة استثمارية ممتازة";
      else if (roi && roi > 15) verdict = "استثمار جيد";
      else if (roi && roi > 5) verdict = "استثمار متوسط — يحتاج تقييم إضافي";
      else if (roi !== null) verdict = "عائد ضعيف — فكّر مرتين";

      return {
        listing_title: listing.title,
        investment: investmentAmount,
        monthly: { revenue: monthlyRevenue, expenses: monthlyExpenses, profit: monthlyProfit },
        annual_profit: annualProfit,
        roi_percent: roi,
        payback: { months: paybackMonths, years: paybackYears },
        break_even_monthly_revenue: breakEvenRevenue,
        scenarios,
        verdict,
        note: monthlyRevenue === 0 ? "لم تُحدد الإيرادات — النتائج تقديرية. زوّدني بالإيراد الشهري للحصول على تحليل دقيق." : null,
      };
    }

    case "generate_user_report": {
      const [myListings, myDeals, myOffers, alerts, views] = await Promise.all([
        sb.from("listings").select("id, title, status, price, city, created_at").eq("owner_id", userId).is("deleted_at", null).order("created_at", { ascending: false }),
        sb.from("deals").select("id, status, listing_id, agreed_price, created_at")
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("created_at", { ascending: false }).limit(10),
        sb.from("listing_offers").select("id, listing_id, offered_price, status, created_at")
          .eq("buyer_id", userId).order("created_at", { ascending: false }).limit(10),
        sb.from("market_alerts").select("id, title, message, alert_type, priority, created_at")
          .eq("user_id", userId).eq("is_read", false).order("created_at", { ascending: false }).limit(5),
        // Get views for user's listings
        sb.from("listing_views").select("listing_id, created_at")
          .in("listing_id", (await sb.from("listings").select("id").eq("owner_id", userId).is("deleted_at", null)).data?.map((l: any) => l.id) || [])
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      const listings = myListings.data || [];
      const publishedListings = listings.filter((l: any) => l.status === "published");
      const totalViews7d = views.data?.length || 0;
      const activeDeals = (myDeals.data || []).filter((d: any) => !["completed", "cancelled"].includes(d.status));

      // Find matching opportunities (listings matching user's memory preferences)
      const { data: memory } = await sb.from("ai_user_memory").select("preferred_cities, preferred_activities, budget_min, budget_max").eq("user_id", userId).single();
      let matchingOpportunities: any[] = [];
      if (memory) {
        let q = sb.from("listings").select("id, title, price, city, business_activity").eq("status", "published").is("deleted_at", null)
          .neq("owner_id", userId).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(5);
        if (memory.preferred_cities?.length > 0) q = q.in("city", memory.preferred_cities);
        if (memory.budget_max) q = q.lte("price", memory.budget_max);
        const { data: matches } = await q;
        matchingOpportunities = matches || [];
      }

      return {
        report_date: new Date().toISOString(),
        period: "آخر 7 أيام",
        my_listings: { total: listings.length, published: publishedListings.length, views_7d: totalViews7d,
          top_viewed: publishedListings.slice(0, 3).map((l: any) => ({ title: l.title, price: l.price })) },
        my_deals: { active: activeDeals.length, total: (myDeals.data || []).length,
          active_list: activeDeals.slice(0, 3).map((d: any) => ({ id: d.id, status: d.status })) },
        pending_offers: (myOffers.data || []).filter((o: any) => o.status === "pending").length,
        unread_alerts: (alerts.data || []).length,
        matching_opportunities: matchingOpportunities.map((m: any) => ({ title: m.title, price: m.price, city: m.city })),
        message: `تقريرك الأسبوعي: ${publishedListings.length} إعلان نشط، ${totalViews7d} مشاهدة، ${activeDeals.length} صفقة جارية`,
      };
    }

    case "analyze_location": {
      const { data: listing } = await sb.from("listings")
        .select("id, title, city, district, business_activity, location_lat, location_lng, area_sqm")
        .eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };

      // Find competitors (same activity, same city)
      const { data: competitors } = await sb.from("listings")
        .select("id, title, price, city, district, business_activity")
        .eq("status", "published").is("deleted_at", null)
        .eq("city", listing.city).ilike("business_activity", `%${listing.business_activity}%`)
        .neq("id", listing.id).limit(20);

      const comps = competitors || [];
      const sameDistrict = listing.district ? comps.filter((c: any) => c.district === listing.district) : [];
      const avgCompPrice = comps.length > 0 ? Math.round(comps.reduce((s: number, c: any) => s + (c.price || 0), 0) / comps.length) : null;

      // Check for feasibility study
      const { data: study } = await sb.from("feasibility_studies")
        .select("study_data").eq("listing_id", args.listing_id).single();
      const studyData = study?.study_data as any;
      const competitorDensity = studyData?.competitive_analysis?.competitors_nearby || null;

      // Market saturation analysis
      let saturation = "غير محدد";
      if (comps.length >= 10) saturation = "سوق مشبع — منافسة عالية";
      else if (comps.length >= 5) saturation = "سوق متوسط — منافسة معتدلة";
      else if (comps.length >= 1) saturation = "سوق واعد — منافسة قليلة";
      else saturation = "سوق جديد — لا منافسة مباشرة";

      let locationVerdict = "مناسب";
      if (comps.length > 10 && sameDistrict.length > 3) locationVerdict = "مزدحم — قد يكون صعباً";
      else if (comps.length < 3) locationVerdict = "موقع مميز — منافسة قليلة";

      return {
        listing_title: listing.title,
        location: { city: listing.city, district: listing.district || "غير محدد",
          has_coordinates: !!(listing.location_lat && listing.location_lng) },
        competitors: {
          in_city: comps.length, in_district: sameDistrict.length,
          avg_price: avgCompPrice,
          closest: comps.slice(0, 5).map((c: any) => ({ title: c.title, price: c.price, district: c.district })),
        },
        google_analysis: competitorDensity ? {
          nearby_500m: competitorDensity["500m"] || null,
          nearby_2km: competitorDensity["2km"] || null,
          nearby_10km: competitorDensity["10km"] || null,
        } : null,
        market_saturation: saturation,
        location_verdict: locationVerdict,
        recommendation: locationVerdict === "مزدحم — قد يكون صعباً"
          ? "الموقع مزدحم بالمنافسين — ركّز على ما يميز هذا النشاط عن غيره"
          : locationVerdict === "موقع مميز — منافسة قليلة"
          ? "فرصة ممتازة — قلة المنافسين تعني إمكانية نمو أسرع"
          : "الموقع مناسب — المنافسة معتدلة",
      };
    }

    // ═══════════════════════════════════════════════
    // OPTIONAL SMART SERVICES
    // ═══════════════════════════════════════════════

    case "schedule_meeting": {
      const { data: deal } = await sb.from("deals")
        .select("id, buyer_id, seller_id, status, listing_id, agreed_price")
        .eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.buyer_id !== userId && deal.seller_id !== userId)
        return { error: "ليس لديك صلاحية على هذه الصفقة" };

      const [listing, buyerProfile, sellerProfile] = await Promise.all([
        sb.from("listings").select("title, business_activity, city, district").eq("id", deal.listing_id).single(),
        sb.from("profiles").select("full_name, phone").eq("user_id", deal.buyer_id).single(),
        sb.from("profiles").select("full_name, phone").eq("user_id", deal.seller_id).single(),
      ]);

      const proposedDate = args.proposed_date || new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];
      const proposedTime = args.proposed_time || "16:00";

      const agendaItems: string[] = [];
      if (deal.status === "negotiating") {
        agendaItems.push("مناقشة السعر النهائي", "استعراض الأصول المشمولة", "الاتفاق على شروط التسليم");
      } else if (deal.status === "finalized") {
        agendaItems.push("تأكيد خطوات نقل الملكية", "مراجعة المستندات المطلوبة", "تحديد موعد التسليم");
      } else {
        agendaItems.push("مراجعة حالة الصفقة", "مناقشة الخطوات التالية");
      }
      if (args.agenda_notes) agendaItems.push(args.agenda_notes);

      const otherPartyId = deal.buyer_id === userId ? deal.seller_id : deal.buyer_id;
      const myName = deal.buyer_id === userId ? buyerProfile.data?.full_name : sellerProfile.data?.full_name;

      await sb.from("notifications").insert({
        user_id: otherPartyId, title: "اقتراح اجتماع",
        body: `${myName || "الطرف الآخر"} يقترح اجتماع يوم ${proposedDate} الساعة ${proposedTime} لمناقشة صفقة "${listing.data?.title}"`,
        type: "deal", reference_id: deal.id, reference_type: "deal",
      });

      return {
        meeting: { date: proposedDate, time: proposedTime, deal_title: listing.data?.title,
          buyer: buyerProfile.data?.full_name || "المشتري", seller: sellerProfile.data?.full_name || "البائع", agenda: agendaItems },
        notification_sent: true,
        message: `تم اقتراح اجتماع يوم ${proposedDate} الساعة ${proposedTime} وأُرسل إشعار للطرف الآخر`,
      };
    }

    case "generate_handover_checklist": {
      const { data: deal } = await sb.from("deals")
        .select("id, buyer_id, seller_id, status, listing_id, deal_type, agreed_price")
        .eq("id", args.deal_id).single();
      if (!deal) return { error: "الصفقة غير موجودة" };
      if (deal.buyer_id !== userId && deal.seller_id !== userId) return { error: "ليس لديك صلاحية" };

      const { data: listing } = await sb.from("listings")
        .select("title, business_activity, deal_type").eq("id", deal.listing_id).single();

      const dealType = deal.deal_type || listing?.deal_type || "full_takeover";
      const iAmBuyer = deal.buyer_id === userId;

      const sellerTasks: any[] = [
        { task: "تسليم المفاتيح والأكواد", priority: "high" },
        { task: "تسليم قائمة الموردين", priority: "medium" },
        { task: "إخطار الموظفين بالتغيير", priority: "high" },
      ];
      const buyerTasks: any[] = [
        { task: "فحص الأصول المستلمة", priority: "high" },
        { task: "تحديث بيانات الاتصال", priority: "medium" },
      ];

      if (dealType === "full_takeover") {
        sellerTasks.push({ task: "نقل السجل التجاري", priority: "high" }, { task: "نقل التراخيص", priority: "high" },
          { task: "تسوية الالتزامات المالية", priority: "high" }, { task: "نقل عقد الإيجار", priority: "high" });
        buyerTasks.push({ task: "التحقق من نقل السجل", priority: "high" }, { task: "تحديث بيانات الزكاة", priority: "high" },
          { task: "مراجعة عقود العمالة", priority: "medium" });
      } else if (dealType === "transfer_no_liabilities") {
        sellerTasks.push({ task: "تسليم وثائق التشغيل", priority: "high" }, { task: "نقل عقد الإيجار", priority: "high" });
        buyerTasks.push({ task: "فتح/نقل السجل التجاري", priority: "high" }, { task: "التأكد من عدم وجود التزامات", priority: "high" });
      } else {
        sellerTasks.push({ task: "إعداد قائمة جرد نهائية", priority: "high" }, { task: "تجهيز الأصول للتسليم", priority: "medium" });
        buyerTasks.push({ task: "مطابقة الأصول مع القائمة", priority: "high" }, { task: "توثيق حالة الأصول بالصور", priority: "medium" });
      }

      return {
        deal_title: listing?.title, deal_type: dealType, your_role: iAmBuyer ? "مشتري" : "بائع",
        your_tasks: iAmBuyer ? buyerTasks : sellerTasks,
        other_party_tasks: iAmBuyer ? sellerTasks : buyerTasks,
        total_tasks: sellerTasks.length + buyerTasks.length,
        message: `قائمة تسليم "${listing?.title}" — ${iAmBuyer ? buyerTasks.length : sellerTasks.length} مهمة لك`,
      };
    }

    case "generate_listing_card": {
      const { data: listing } = await sb.from("listings")
        .select("id, title, business_activity, city, district, price, deal_type, photos, ai_rating, ai_trust_score, area_sqm")
        .eq("id", args.listing_id).single();
      if (!listing) return { error: "الإعلان غير موجود" };

      const photos = listing.photos as any[];
      const firstPhoto = photos?.[0]?.url || photos?.[0] || null;
      const trustScore = (listing.ai_trust_score as any)?.overall_score;
      const dealTypeLabels: Record<string, string> = { full_takeover: "تقبيل كامل", transfer_no_liabilities: "نقل بدون التزامات", assets_setup: "أصول + تجهيزات", assets_only: "أصول فقط" };

      const shareText = [
        `🏪 ${listing.title || listing.business_activity || "فرصة تجارية"}`,
        `📍 ${listing.city}${listing.district ? ` — ${listing.district}` : ""}`,
        `💰 ${listing.price ? `${Number(listing.price).toLocaleString("en-US")} ر.س` : "اتصل للسعر"}`,
        listing.area_sqm ? `📐 ${listing.area_sqm} م²` : null,
        `📋 ${dealTypeLabels[listing.deal_type] || listing.deal_type}`,
        trustScore ? `⭐ درجة الثقة: ${trustScore}/10` : null,
        "", `🔗 ${BASE_URL}/listing/${listing.id}`,
        "", "عبر سوق تقبيل — منصة تقبيل الأعمال الذكية",
      ].filter(Boolean).join("\n");

      return {
        card: { title: listing.title, activity: listing.business_activity, location: `${listing.city}${listing.district ? ` — ${listing.district}` : ""}`,
          price: listing.price ? `${Number(listing.price).toLocaleString("en-US")} ر.س` : "اتصل للسعر",
          deal_type: dealTypeLabels[listing.deal_type] || listing.deal_type, photo_url: firstPhoto,
          listing_url: `${BASE_URL}/listing/${listing.id}` },
        share_text: shareText,
        whatsapp_url: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
        twitter_url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
        message: "تم تجهيز بطاقة الإعلان — شاركها مباشرة عبر الروابط أدناه",
      };
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

    // Try JWT auth
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
