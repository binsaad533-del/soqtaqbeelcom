import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface AiSuggestion {
  id: string;
  icon: string;
  label: string;
  description: string;
  action?: string;
  priority: "high" | "medium" | "low";
}

export interface QuickCommand {
  id: string;
  label: string;
  icon: string;
  action: string;
}

interface ProactiveInsight {
  id: string;
  message: string;
  type: "info" | "warning" | "action";
  actionLabel?: string;
  actionPath?: string;
}

// ─── Page Context Map ───────────────────────────────
const pageContextMap: Record<string, { greeting: string; role: string; suggestions: AiSuggestion[] }> = {
  "/": {
    greeting: "هلا وغلا 👋 أنا مقبل، مساعدك الذكي. وش تبغى نسوي اليوم؟",
    role: "مرشدك الذكي",
    suggestions: [
      { id: "browse", icon: "🔍", label: "وريني الفرص", description: "أدوّرلك على أفضل الفرص اللي تناسبك", priority: "high" },
      { id: "create", icon: "📝", label: "أبغى أضيف فرصة", description: "أساعدك تسوي إعلان احترافي بدقايق", priority: "high" },
      { id: "analyze", icon: "📊", label: "حلل لي السوق", description: "نظرة ذكية على السوق حسب المدينة والنشاط", priority: "medium" },
      { id: "trends", icon: "📈", label: "اتجاهات السوق", description: "وش أكثر الأنشطة طلباً والمدن النشطة؟", priority: "medium" },
      { id: "howworks", icon: "💡", label: "كيف تتم الصفقة؟", description: "أشرح لك الخطوات من البداية للنهاية", priority: "low" },
    ],
  },
  "/marketplace": {
    greeting: "تبغى تلاقي فرصة حلوة؟ خلني أساعدك 🎯",
    role: "محلل فرص",
    suggestions: [
      { id: "filter", icon: "🎯", label: "ضيّق البحث", description: "قولي ميزانيتك واهتمامك وأنا أرتب لك", priority: "high" },
      { id: "compare", icon: "⚖️", label: "قارن بينهم", description: "أقارن لك بين كذا فرصة مع بعض", priority: "medium" },
      { id: "fraud-check", icon: "🛡️", label: "فحص الأمان", description: "أفحصلك الإعلانات المشبوهة", priority: "medium" },
      { id: "alert", icon: "🔔", label: "نبّهني لو فيه جديد", description: "أخليك أول واحد يعرف لو نزلت فرصة", priority: "low" },
      { id: "cheap", icon: "💰", label: "أرخص الفرص", description: "أعرضلك الفرص الأقل سعراً المتاحة الحين", priority: "medium" },
    ],
  },
  "/create-listing": {
    greeting: "يلا نسوي إعلان يجذب المشترين ✨",
    role: "مساعد إنشاء",
    suggestions: [
      { id: "autofill", icon: "✨", label: "عبّي تلقائي", description: "ارفع المستندات وأنا أطلع البيانات لك", priority: "high" },
      { id: "photos", icon: "📷", label: "حلل الصور", description: "ارفع صور المشروع وأنا أحدد الأصول", priority: "high" },
      { id: "describe", icon: "✍️", label: "اكتب لي وصف", description: "أكتب وصف احترافي من البيانات المدخلة", priority: "medium" },
      { id: "price-suggest", icon: "💰", label: "اقترح سعر", description: "أقترح نطاق سعري بناءً على السوق", priority: "medium" },
    ],
  },
  "/dashboard": {
    greeting: "هلا فيك 👋 خلني أعطيك ملخص سريع",
    role: "مدير عملياتك",
    suggestions: [
      { id: "summary", icon: "📈", label: "ملخصي اليوم", description: "نظرة سريعة على كل شي يخصك", priority: "high" },
      { id: "pending", icon: "⏳", label: "وش المعلّق؟", description: "العروض والصفقات اللي تنتظر ردّك", priority: "high" },
      { id: "deal-predict", icon: "🔮", label: "احتمال نجاح الصفقات", description: "تنبؤ بنسبة نجاح صفقاتك النشطة", priority: "medium" },
      { id: "improve", icon: "💡", label: "حسّن إعلاناتك", description: "اقتراحات تخلي إعلاناتك أقوى", priority: "medium" },
    ],
  },
  "/messages": {
    greeting: "محادثاتك هنا 💬 أقدر أساعدك بصياغة الردود",
    role: "مساعد المحادثات",
    suggestions: [
      { id: "draft-reply", icon: "✍️", label: "صيغ لي رد", description: "أكتب رد احترافي ومناسب للمحادثة", priority: "high" },
      { id: "unread", icon: "📩", label: "كم رسالة ما قريتها؟", description: "أعطيك ملخص الرسائل الجديدة", priority: "high" },
      { id: "negotiate-tip", icon: "💡", label: "نصيحة تفاوض", description: "أنصحك كيف ترد بذكاء على العروض", priority: "medium" },
    ],
  },
  "/how-it-works": {
    greeting: "تبغى تفهم كيف تشتغل المنصة؟ خلني أوضحلك 💡",
    role: "مرشد المنصة",
    suggestions: [
      { id: "steps", icon: "📋", label: "الخطوات بالتفصيل", description: "أشرح لك كل خطوة من الصفقة", priority: "high" },
      { id: "buyer-q", icon: "🛒", label: "أنا مشتري", description: "أقولك وش تحتاج تعرفه كمشتري", priority: "medium" },
      { id: "seller-q", icon: "🏪", label: "أنا بائع", description: "أقولك وش تحتاج تعرفه كبائع", priority: "medium" },
    ],
  },
  "/contact": {
    greeting: "تبغى تواصل معنا؟ أقدر أساعدك قبل 👋",
    role: "خدمة العملاء",
    suggestions: [
      { id: "faq", icon: "❓", label: "عندي سؤال", description: "ممكن أجاوبك مباشرة بدون ما ترسل", priority: "high" },
      { id: "issue", icon: "🔧", label: "عندي مشكلة", description: "وصف لي المشكلة وأحاول أحلها لك", priority: "high" },
    ],
  },
  "/help": {
    greeting: "مركز المساعدة 🎯 قولي وش تحتاج",
    role: "دعم فني",
    suggestions: [
      { id: "guide", icon: "📖", label: "كيف أستخدم المنصة؟", description: "أوجهك خطوة بخطوة", priority: "high" },
      { id: "account", icon: "👤", label: "مشكلة بحسابي", description: "أساعدك تحل مشاكل الحساب", priority: "medium" },
      { id: "listing-help", icon: "📝", label: "مشكلة بإعلاني", description: "أشيّك وش المشكلة وأساعدك تحلها", priority: "medium" },
    ],
  },
  "/blog": {
    greeting: "المدونة فيها مقالات مفيدة 📚 تبغى أختارلك؟",
    role: "مرشد محتوى",
    suggestions: [
      { id: "recommend", icon: "⭐", label: "أفضل المقالات", description: "أرشحلك أهم المقالات للقراءة", priority: "high" },
      { id: "tips", icon: "💡", label: "نصائح تقبيل", description: "أعطيك نصائح عملية لشراء أو بيع مشروع", priority: "medium" },
    ],
  },
  "/commission": {
    greeting: "هنا كل شي عن العمولة 💼",
    role: "مستشار مالي",
    suggestions: [
      { id: "calc", icon: "🧮", label: "احسب لي العمولة", description: "أحسب العمولة على أي مبلغ تبغاه", priority: "high" },
      { id: "explain", icon: "📋", label: "شرح نظام العمولة", description: "أوضح لك كيف تشتغل العمولة", priority: "medium" },
    ],
  },
  "/verify-seller": {
    greeting: "التوثيق يزيد ثقة المشترين فيك 🏆",
    role: "مساعد التوثيق",
    suggestions: [
      { id: "verify-steps", icon: "✅", label: "خطوات التوثيق", description: "أشرح لك كل خطوة من التوثيق", priority: "high" },
      { id: "docs-needed", icon: "📄", label: "وش أحتاج؟", description: "أقولك الوثائق المطلوبة للتوثيق", priority: "high" },
    ],
  },
  "/seller-dashboard": {
    greeting: "لوحة البائع 📊 خلني ألخصلك الموقف",
    role: "مقبل البائع",
    suggestions: [
      { id: "sales-summary", icon: "📈", label: "ملخص المبيعات", description: "نظرة على أداء إعلاناتك والعروض", priority: "high" },
      { id: "boost", icon: "🚀", label: "ارفع التفاعل", description: "نصائح لزيادة مشاهدات إعلاناتك", priority: "medium" },
      { id: "improve-all", icon: "✨", label: "حسّن كل إعلاناتي", description: "أراجع إعلاناتك وأقترح تحسينات", priority: "high" },
      { id: "pricing-help", icon: "💰", label: "سعّر إعلاناتي", description: "أقترح أسعار مناسبة لكل إعلان", priority: "medium" },
    ],
  },
  "/about": {
    greeting: "تبغى تعرف أكثر عن سوق تقبيل؟ 🏢",
    role: "مرشد المنصة",
    suggestions: [
      { id: "what-is", icon: "💡", label: "وش هي سوق تقبيل؟", description: "أشرح لك فكرة المنصة ورؤيتها", priority: "high" },
    ],
  },
};

const getNegotiationContext = () => ({
  greeting: "أنا معاك بالتفاوض 🤝 خلنا نوصل لأفضل اتفاق",
  role: "مفاوضك الذكي",
  suggestions: [
    { id: "mediate", icon: "🤝", label: "وسّط بيننا", description: "أقترح حل وسط عادل للطرفين", priority: "high" as const },
    { id: "analyze-offer", icon: "📊", label: "شيّك على العرض", description: "أحلل العرض وأقترح رد مناسب", priority: "high" as const },
    { id: "predict", icon: "🔮", label: "احتمال نجاح الصفقة", description: "أحسب لك نسبة نجاح هالصفقة", priority: "medium" as const },
    { id: "risks", icon: "⚡", label: "فيه مخاطر؟", description: "أكشف نقاط الضعف والمخاطر بالصفقة", priority: "medium" as const },
    { id: "draft", icon: "✍️", label: "اكتب لي رد", description: "أصيغ لك رد احترافي ومقنع", priority: "medium" as const },
  ],
});

const getListingContext = () => ({
  greeting: "خلني أشيّك لك على هذي الفرصة 🧠",
  role: "محلل صفقات",
  suggestions: [
    { id: "deal-intel", icon: "🧠", label: "حلل لي الصفقة", description: "تحليل شامل مع المخاطر والفرص", priority: "high" as const },
    { id: "price-check", icon: "💰", label: "السعر عادل؟", description: "تسعير ذكي مقارنة بالسوق", priority: "high" as const },
    { id: "fraud-detect", icon: "🛡️", label: "فحص أمان", description: "أفحص الإعلان عن علامات الاحتيال", priority: "high" as const },
    { id: "simulate", icon: "🧪", label: "محاكاة ماذا لو؟", description: "سيناريوهات مختلفة للسعر والشروط", priority: "high" as const },
    { id: "financial", icon: "📊", label: "تحليل مالي", description: "ROI ونقطة التعادل والتدفق النقدي", priority: "medium" as const },
    { id: "start-negotiate", icon: "🤝", label: "أبغى أفاوض", description: "أساعدك تبدأ مفاوضة ذكية", priority: "medium" as const },
    { id: "similar", icon: "🔄", label: "فرص مشابهة", description: "أوريك فرص مشابهة قد تعجبك", priority: "medium" as const },
    { id: "seller-rep", icon: "⭐", label: "شيّك على البائع", description: "حلل سمعة البائع وتقييماته", priority: "medium" as const },
    { id: "lawyer", icon: "⚖️", label: "صيغ بنود حماية", description: "بنود عقد تحمي حقوقك", priority: "low" as const },
    { id: "verify", icon: "✅", label: "البيانات كاملة؟", description: "أراجع مدى اكتمال المعلومات", priority: "low" as const },
  ],
});

// ─── Quick Commands ───────────────────────────────
export const QUICK_COMMANDS: QuickCommand[] = [
  { id: "daily-summary", label: "ملخص اليوم", icon: "📈", action: "أعطيني ملخص اليوم" },
  { id: "analyze-listing", label: "حلل لي هالإعلان", icon: "🧠", action: "حلل لي هالإعلان" },
  { id: "smart-price", label: "سعّر ذكي", icon: "💰", action: "اقترح سعر عادل لهالإعلان" },
  { id: "fraud-check", label: "فحص أمان", icon: "🛡️", action: "افحص هالإعلان من ناحية الأمان والاحتيال" },
  { id: "calc-commission", label: "احسب العمولة", icon: "🧮", action: "احسب لي العمولة" },
  { id: "deal-predict", label: "احتمال نجاح الصفقة", icon: "🔮", action: "كم احتمال نجاح هالصفقة؟" },
  { id: "mediate", label: "وساطة ذكية", icon: "🤝", action: "التفاوض متعثر، وسّط بيننا واقترح حل" },
  { id: "market-trends", label: "اتجاهات السوق", icon: "📊", action: "وش اتجاهات السوق؟ أكثر الأنشطة والمدن؟" },
  { id: "improve-ad", label: "حسّن إعلاني", icon: "✨", action: "حسّن إعلاني واقترح تعديلات" },
  { id: "write-desc", label: "اكتب وصف", icon: "✍️", action: "اكتب لي وصف احترافي" },
  { id: "feasibility", label: "دراسة جدوى", icon: "📋", action: "سوّ لي دراسة جدوى" },
  { id: "compare", label: "قارن الفرص", icon: "⚖️", action: "قارن لي بين الفرص المتاحة" },
  { id: "simulate", label: "محاكاة ماذا لو؟", icon: "🧪", action: "سوّ لي محاكاة للصفقة بسيناريوهات مختلفة" },
  { id: "financial", label: "تحليل مالي", icon: "📊", action: "سوّ لي تحليل مالي شامل: ROI ونقطة التعادل وفترة الاسترداد" },
  { id: "auto-negotiate", label: "فاوض بدالي", icon: "🤖", action: "فاوض بدالي — حدي الأدنى والأقصى واكتب لي 3 رسائل تفاوض متدرجة" },
  { id: "lawyer", label: "صيغ بنود", icon: "⚖️", action: "صيغ لي بنود عقد حماية للمشتري والبائع" },
  { id: "seller-rep", label: "شيّك على البائع", icon: "⭐", action: "حلل لي سمعة البائع وتقييماته" },
  { id: "full-report", label: "تقرير شامل", icon: "📄", action: "سوّ لي تقرير تحليلي شامل" },
];

export function useAiContext() {
  const location = useLocation();
  const [proactiveInsights, setProactiveInsights] = useState<ProactiveInsight[]>([]);
  const [proactiveMessage, setProactiveMessage] = useState<string | null>(null);
  const insightsFetched = useRef(false);
  const pathname = location.pathname;

  // Determine context based on current page
  const getContext = useCallback(() => {
    if (pathname.startsWith("/negotiate/")) return getNegotiationContext();
    if (pathname.startsWith("/listing/")) return getListingContext();
    if (pathname.startsWith("/agreement/")) {
      return {
        greeting: "الاتفاق جاهز، خلني أراجعه معاك 📋",
        role: "مراجع اتفاقيات",
        suggestions: [
          { id: "review", icon: "📋", label: "راجع لي الاتفاق", description: "أشيّك على البنود وأبرز النقاط المهمة", priority: "high" as const },
          { id: "doc-analyze", icon: "📄", label: "حلل المستندات", description: "أحلل البنود وأحدد المخاطر القانونية", priority: "high" as const },
          { id: "risks", icon: "⚠️", label: "فيه شي أنتبه له؟", description: "أحدد النقاط اللي تحتاج انتباه قانوني", priority: "medium" as const },
        ],
      };
    }
    if (pathname.startsWith("/blog/")) {
      return {
        greeting: "تقرأ مقال؟ أقدر ألخصه لك 📖",
        role: "ملخص المحتوى",
        suggestions: [
          { id: "summarize", icon: "📝", label: "لخّص لي المقال", description: "أعطيك أهم النقاط بشكل مختصر", priority: "high" as const },
        ],
      };
    }
    if (pathname.startsWith("/seller/")) {
      return {
        greeting: "تشيّك على بائع؟ خلني أساعدك 🔍",
        role: "محلل بائعين",
        suggestions: [
          { id: "seller-review", icon: "⭐", label: "شيّك على البائع", description: "أحلل لك سمعة البائع وتقييماته", priority: "high" as const },
          { id: "seller-listings", icon: "📋", label: "إعلاناته", description: "أعرضلك كل إعلانات هالبائع", priority: "medium" as const },
        ],
      };
    }
    if (pathname.startsWith("/invoice/")) {
      return {
        greeting: "الفاتورة أمامك 🧾 تبغاني أشرحها؟",
        role: "مساعد مالي",
        suggestions: [
          { id: "explain-invoice", icon: "🧾", label: "اشرح الفاتورة", description: "أوضح لك كل بند بالفاتورة", priority: "high" as const },
        ],
      };
    }

    const base = pathname.split("?")[0];
    return pageContextMap[base] || pageContextMap["/"];
  }, [pathname]);

  // Fetch proactive insights with preference matching
  useEffect(() => {
    if (insightsFetched.current) return;

    const fetchInsights = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      insightsFetched.current = true;
      const insights: ProactiveInsight[] = [];

      try {
        // Pending offers count
        const { data: myListings } = await supabase
          .from("listings")
          .select("id")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .limit(50);

        if (myListings && myListings.length > 0) {
          const listingIds = myListings.map(l => l.id);
          const { count: offersOnMyListings } = await supabase
            .from("listing_offers")
            .select("id", { count: "exact", head: true })
            .in("listing_id", listingIds)
            .eq("status", "pending");

          if (offersOnMyListings && offersOnMyListings > 0) {
            insights.push({
              id: "pending-offers",
              message: `عندك ${offersOnMyListings} عرض بانتظار ردّك`,
              type: "action",
              actionLabel: "شوف العروض",
              actionPath: "/dashboard",
            });
          }
        }

        // Unread messages
        const { count: unreadMsgs } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .eq("is_read", false);

        if (unreadMsgs && unreadMsgs > 0) {
          insights.push({
            id: "unread-msgs",
            message: `عندك ${unreadMsgs} رسالة ما قريتها`,
            type: "info",
            actionLabel: "شوف الرسائل",
            actionPath: "/messages",
          });
        }

        // Incomplete listings (draft)
        const { count: draftListings } = await supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .eq("status", "draft")
          .is("deleted_at", null);

        if (draftListings && draftListings > 0) {
          insights.push({
            id: "draft-listings",
            message: `عندك ${draftListings} إعلان مسودة ما اكتمل`,
            type: "warning",
            actionLabel: "كمّل الإعلان",
            actionPath: "/dashboard",
          });
        }

        // Proactive: Check for new listings matching user preferences
        const { data: memoryData } = await supabase
          .from("ai_user_memory")
          .select("preferred_cities, preferred_activities, budget_min, budget_max")
          .eq("user_id", user.id)
          .maybeSingle();

        if (memoryData) {
          const cities = memoryData.preferred_cities || [];
          const activities = memoryData.preferred_activities || [];

          if (cities.length > 0 || activities.length > 0) {
            // Check for new matching listings in last 3 days
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
            let query = supabase
              .from("listings")
              .select("id, title, city, business_activity, price", { count: "exact", head: false })
              .eq("status", "published")
              .is("deleted_at", null)
              .gte("published_at", threeDaysAgo)
              .neq("owner_id", user.id)
              .limit(3);

            if (cities.length > 0) {
              query = query.in("city", cities);
            }

            const { data: matchingListings, count: matchCount } = await query;

            if (matchCount && matchCount > 0 && matchingListings) {
              const first = matchingListings[0];
              insights.push({
                id: "matching-opportunity",
                message: `نزلت ${matchCount} فرصة جديدة تطابق اهتماماتك${first?.city ? ` في ${first.city}` : ""}`,
                type: "action",
                actionLabel: "شوف الفرص",
                actionPath: "/marketplace",
              });
            }
          }
        }

        // Stalled negotiations alert
        const { data: activeDeals } = await supabase
          .from("deals")
          .select("id, status, updated_at")
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .eq("status", "negotiating")
          .limit(5);

        if (activeDeals) {
          const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
          const stalledDeals = activeDeals.filter(d => new Date(d.updated_at).getTime() < twoDaysAgo);
          
          if (stalledDeals.length > 0) {
            insights.push({
              id: "stalled-deals",
              message: `عندك ${stalledDeals.length} صفقة بدون تحديث من يومين — تبغى مقبل يوسّط؟`,
              type: "warning",
              actionLabel: "شوف الصفقات",
              actionPath: `/negotiate/${stalledDeals[0].id}`,
            });
          }
        }
      } catch (e) {
        console.error("Proactive insights error:", e);
      }

      setProactiveInsights(insights);
    };

    fetchInsights();
  }, []);

  useEffect(() => {
    return () => { insightsFetched.current = false; };
  }, []);

  const context = getContext();

  return {
    ...context,
    proactiveInsights,
    proactiveMessage,
    dismissProactive: () => setProactiveMessage(null),
    quickCommands: QUICK_COMMANDS,
    pathname,
  };
}
