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
      { id: "howworks", icon: "💡", label: "كيف تتم الصفقة؟", description: "أشرح لك الخطوات من البداية للنهاية", priority: "low" },
    ],
  },
  "/marketplace": {
    greeting: "تبغى تلاقي فرصة حلوة؟ خلني أساعدك 🎯",
    role: "محلل فرص",
    suggestions: [
      { id: "filter", icon: "🎯", label: "ضيّق البحث", description: "قولي ميزانيتك واهتمامك وأنا أرتب لك", priority: "high" },
      { id: "compare", icon: "⚖️", label: "قارن بينهم", description: "أقارن لك بين كذا فرصة مع بعض", priority: "medium" },
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
      { id: "price-suggest", icon: "💰", label: "اقترح سعر", description: "أقترح سعر مناسب بناءً على السوق", priority: "medium" },
    ],
  },
  "/dashboard": {
    greeting: "هلا فيك 👋 خلني أعطيك ملخص سريع",
    role: "مدير عملياتك",
    suggestions: [
      { id: "summary", icon: "📈", label: "ملخصي اليوم", description: "نظرة سريعة على كل شي يخصك", priority: "high" },
      { id: "pending", icon: "⏳", label: "وش المعلّق؟", description: "العروض والصفقات اللي تنتظر ردّك", priority: "high" },
      { id: "improve", icon: "💡", label: "حسّن إعلاناتك", description: "اقتراحات تخلي إعلاناتك أقوى", priority: "medium" },
      { id: "missing", icon: "⚠️", label: "وش الناقص؟", description: "المعلومات اللي لازم تكمّلها", priority: "medium" },
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
    role: "مدير مبيعاتك",
    suggestions: [
      { id: "sales-summary", icon: "📈", label: "ملخص المبيعات", description: "نظرة على أداء إعلاناتك والعروض", priority: "high" },
      { id: "boost", icon: "🚀", label: "ارفع التفاعل", description: "نصائح لزيادة مشاهدات إعلاناتك", priority: "medium" },
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
    { id: "negotiate", icon: "🤝", label: "فاوض عني", description: "أوصلك لأفضل نتيجة 💪", priority: "high" as const },
    { id: "analyze-offer", icon: "📊", label: "شيّك على العرض", description: "أحلل العرض وأقترح رد مناسب", priority: "high" as const },
    { id: "risks", icon: "⚡", label: "فيه مخاطر؟", description: "أكشف نقاط الضعف والمخاطر بالصفقة", priority: "medium" as const },
    { id: "draft", icon: "✍️", label: "اكتب لي رد", description: "أصيغ لك رد احترافي ومقنع", priority: "medium" as const },
  ],
});

const getListingContext = () => ({
  greeting: "خلني أشيّك لك على هذي الفرصة 🧠",
  role: "محلل صفقات",
  suggestions: [
    { id: "deal-intel", icon: "🧠", label: "حلل لي الصفقة", description: "تحليل شامل مع المخاطر والفرص", priority: "high" as const },
    { id: "price-check", icon: "💰", label: "السعر عادل؟", description: "أشيّك إذا السعر معقول مقارنة بالسوق", priority: "high" as const },
    { id: "start-negotiate", icon: "🤝", label: "أبغى أفاوض", description: "أساعدك تبدأ مفاوضة ذكية", priority: "medium" as const },
    { id: "verify", icon: "✅", label: "البيانات كاملة؟", description: "أراجع مدى اكتمال المعلومات والمستندات", priority: "medium" as const },
  ],
});

// ─── Quick Commands ───────────────────────────────
export const QUICK_COMMANDS: QuickCommand[] = [
  { id: "my-listings", label: "وريني إعلاناتي", icon: "📋", action: "وريني إعلاناتي" },
  { id: "my-offers", label: "كم عرض جاني؟", icon: "📩", action: "كم عرض جاني اليوم؟" },
  { id: "analyze-listing", label: "حلل لي هالإعلان", icon: "🧠", action: "حلل لي هالإعلان" },
  { id: "feasibility", label: "سوّ لي دراسة جدوى", icon: "📊", action: "سوّ لي دراسة جدوى" },
  { id: "calc-commission", label: "احسب العمولة", icon: "🧮", action: "احسب لي العمولة" },
  { id: "improve-ad", label: "حسّن إعلاني", icon: "💡", action: "حسّن إعلاني" },
  { id: "daily-summary", label: "ملخص اليوم", icon: "📈", action: "أعطيني ملخص اليوم" },
  { id: "market-analysis", label: "تحليل السوق", icon: "🔍", action: "حلل لي السوق" },
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
          { id: "risks", icon: "⚠️", label: "فيه شي أنتبه له؟", description: "أحدد النقاط اللي تحتاج انتباه قانوني", priority: "high" as const },
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

    // Match exact paths
    const base = pathname.split("?")[0];
    return pageContextMap[base] || pageContextMap["/"];
  }, [pathname]);

  // Fetch proactive insights (dashboard data for logged-in users)
  useEffect(() => {
    if (insightsFetched.current) return;

    const fetchInsights = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      insightsFetched.current = true;
      const insights: ProactiveInsight[] = [];

      try {
        // Pending offers count
        const { count: pendingOffers } = await supabase
          .from("listing_offers")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .or(`buyer_id.eq.${user.id}`);

        // Get user listings to check for offers on them
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
      } catch (e) {
        console.error("Proactive insights error:", e);
      }

      setProactiveInsights(insights);
    };

    fetchInsights();
  }, []);

  // Reset insights ref on unmount
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
