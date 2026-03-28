import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";

export interface AiSuggestion {
  id: string;
  icon: string;
  label: string;
  description: string;
  action?: string;
  priority: "high" | "medium" | "low";
}

interface UserBehavior {
  idleSeconds: number;
  scrollDepth: number;
  clickCount: number;
  lastAction: string;
  pageVisitCount: number;
  hesitationDetected: boolean;
}

const pageContextMap: Record<string, { greeting: string; role: string; suggestions: AiSuggestion[] }> = {
  "/": {
    greeting: "هلا وغلا 👋 أنا مساعدك الذكي، وش تبغى نسوي اليوم؟",
    role: "مرشدك الذكي",
    suggestions: [
      { id: "browse", icon: "🔍", label: "وريني الفرص", description: "خلني أدوّرلك على أفضل الفرص اللي تناسبك 👌", priority: "high" },
      { id: "create", icon: "📝", label: "أبغى أضيف فرصة", description: "أساعدك تسوي إعلان احترافي بدقايق", priority: "high" },
      { id: "analyze", icon: "📊", label: "حلل لي السوق", description: "أعطيك نظرة ذكية على السوق حسب المدينة والنشاط", priority: "medium" },
    ],
  },
  "/marketplace": {
    greeting: "تبغى تلاقي فرصة حلوة؟ خلني أساعدك 🎯",
    role: "محلل فرص",
    suggestions: [
      { id: "filter", icon: "🎯", label: "ضيّق البحث", description: "قولي ميزانيتك واهتمامك وأنا أرتب لك الباقي", priority: "high" },
      { id: "compare", icon: "⚖️", label: "قارن بينهم", description: "خلني أقارن لك بين كذا فرصة مع بعض", priority: "medium" },
      { id: "alert", icon: "🔔", label: "نبّهني لو فيه جديد", description: "أخليك أول واحد يعرف لو نزلت فرصة تناسبك", priority: "low" },
    ],
  },
  "/create-listing": {
    greeting: "يلا نسوي إعلان يجذب المشترين ✨",
    role: "مساعد إنشاء",
    suggestions: [
      { id: "autofill", icon: "✨", label: "عبّي تلقائي", description: "ارفع المستندات وأنا أطلع البيانات لك", priority: "high" },
      { id: "photos", icon: "📷", label: "حلل الصور", description: "ارفع صور المشروع وأنا أحدد الأصول والمعدات", priority: "high" },
      { id: "complete", icon: "📋", label: "كمّل الإعلان", description: "أكمّل لك الحقول الناقصة من المعلومات الموجودة", priority: "medium" },
      { id: "docs", icon: "📄", label: "طلّع من المستندات", description: "ارفع العقود والفواتير وأنا أستخرج التفاصيل", priority: "medium" },
    ],
  },
  "/dashboard": {
    greeting: "هلا فيك 👋 خلني أعطيك ملخص سريع",
    role: "مدير عملياتك",
    suggestions: [
      { id: "status", icon: "📈", label: "وش آخر الأخبار؟", description: "نظرة سريعة على إعلاناتك ومفاوضاتك", priority: "high" },
      { id: "improve", icon: "💡", label: "حسّن إعلاناتك", description: "عندي اقتراحات تخلي إعلاناتك أقوى", priority: "medium" },
      { id: "missing", icon: "⚠️", label: "وش الناقص؟", description: "أقولك وش المعلومات اللي لازم تكمّلها", priority: "high" },
    ],
  },
};

const getNegotiationContext = (id?: string) => ({
  greeting: "أنا معاك بالتفاوض 🤝 خلنا نوصل لأفضل اتفاق",
  role: "مفاوضك الذكي",
  suggestions: [
    { id: "negotiate", icon: "🤝", label: "فاوض عني", description: "أتولى التفاوض عنك وأوصلك لأفضل نتيجة 💪", priority: "high" as const },
    { id: "analyze-offer", icon: "📊", label: "شيّك على العرض", description: "أحلل لك العرض الحالي وأقترح رد مناسب", priority: "high" as const },
    { id: "risks", icon: "⚡", label: "فيه مخاطر؟", description: "أكشف لك نقاط الضعف والمخاطر بالصفقة", priority: "medium" as const },
    { id: "draft", icon: "✍️", label: "اكتب لي رد", description: "أصيغ لك رد احترافي ومقنع للطرف الثاني", priority: "medium" as const },
  ],
});

const getListingContext = (id?: string) => ({
  greeting: "خلني أشيّك لك على هذي الفرصة 🧠",
  role: "محلل صفقات",
  suggestions: [
    { id: "deal-intel", icon: "🧠", label: "حلل لي الصفقة", description: "أعطيك تحليل شامل مع المخاطر والفرص", priority: "high" as const },
    { id: "price-check", icon: "💰", label: "السعر عادل؟", description: "أشيّك لك إذا السعر معقول مقارنة بالسوق", priority: "high" as const },
    { id: "start-negotiate", icon: "🤝", label: "أبغى أفاوض", description: "أساعدك تبدأ مفاوضة ذكية", priority: "medium" as const },
    { id: "verify", icon: "✅", label: "البيانات كاملة؟", description: "أراجع لك مدى اكتمال المعلومات والمستندات", priority: "medium" as const },
  ],
});

export function useAiContext() {
  const location = useLocation();
  const [behavior, setBehavior] = useState<UserBehavior>({
    idleSeconds: 0,
    scrollDepth: 0,
    clickCount: 0,
    lastAction: "",
    pageVisitCount: 0,
    hesitationDetected: false,
  });
  const [proactiveMessage, setProactiveMessage] = useState<string | null>(null);
  const idleTimer = useRef<ReturnType<typeof setInterval>>();
  const pathname = location.pathname;

  // Determine context
  const getContext = useCallback(() => {
    if (pathname.startsWith("/negotiate/")) {
      const id = pathname.split("/")[2];
      return getNegotiationContext(id);
    }
    if (pathname.startsWith("/listing/")) {
      const id = pathname.split("/")[2];
      return getListingContext(id);
    }
    if (pathname.startsWith("/agreement/")) {
      return {
        greeting: "الاتفاق جاهز، خلني أراجعه معاك 📋",
        role: "مراجع اتفاقيات",
        suggestions: [
          { id: "review", icon: "📋", label: "راجع لي الاتفاق", description: "أشيّك على البنود وأبرز لك النقاط المهمة", priority: "high" as const },
          { id: "risks", icon: "⚠️", label: "فيه شي لازم انتبه له؟", description: "أحدد لك النقاط اللي تحتاج انتباه قانوني", priority: "high" as const },
        ],
      };
    }
    return pageContextMap[pathname] || pageContextMap["/"];
  }, [pathname]);

  // Track idle — use a longer interval (5s instead of 1s) to reduce CPU churn
  useEffect(() => {
    setBehavior(b => ({ ...b, idleSeconds: 0, hesitationDetected: false }));
    setProactiveMessage(null);

    idleTimer.current = setInterval(() => {
      setBehavior(prev => {
        const newIdle = prev.idleSeconds + 5;
        if (newIdle >= 10 && !prev.hesitationDetected) {
          const ctx = getContext();
          setProactiveMessage(`💡 ${ctx.suggestions[0]?.description || "تبغاني أساعدك بشي؟ 👌"}`);
          return { ...prev, idleSeconds: newIdle, hesitationDetected: true };
        }
        return { ...prev, idleSeconds: newIdle };
      });
    }, 5000); // was 1000ms, now 5000ms

    return () => clearInterval(idleTimer.current);
  }, [pathname, getContext]);

  // Reset idle on interaction
  useEffect(() => {
    const reset = () => setBehavior(b => ({ ...b, idleSeconds: 0 }));
    window.addEventListener("click", reset);
    window.addEventListener("keydown", reset);
    window.addEventListener("scroll", reset);
    return () => {
      window.removeEventListener("click", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("scroll", reset);
    };
  }, []);

  const context = getContext();

  return {
    ...context,
    behavior,
    proactiveMessage,
    dismissProactive: () => setProactiveMessage(null),
    pathname,
  };
}
