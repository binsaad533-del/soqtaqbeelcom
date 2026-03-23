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
    greeting: "مرحباً بك في سوق تقبيل",
    role: "مرشد ذكي",
    suggestions: [
      { id: "browse", icon: "🔍", label: "استكشف الفرص", description: "أساعدك في إيجاد أفضل الفرص المتاحة حسب اهتماماتك", priority: "high" },
      { id: "create", icon: "📝", label: "أضف فرصتك", description: "أنشئ إعلان احترافي بمساعدة الذكاء الاصطناعي في دقائق", priority: "high" },
      { id: "analyze", icon: "📊", label: "تحليل السوق", description: "احصل على رؤية ذكية عن السوق السعودي حسب المدينة والنشاط", priority: "medium" },
    ],
  },
  "/marketplace": {
    greeting: "أنا هنا لمساعدتك في إيجاد الفرصة المناسبة",
    role: "محلل فرص",
    suggestions: [
      { id: "filter", icon: "🎯", label: "فلترة ذكية", description: "أساعدك في تضييق البحث بناءً على ميزانيتك واهتماماتك", priority: "high" },
      { id: "compare", icon: "⚖️", label: "قارن الفرص", description: "قارن بين عدة فرص جنباً إلى جنب", priority: "medium" },
      { id: "alert", icon: "🔔", label: "تنبيه فرص جديدة", description: "أبلغك فور ظهور فرص تناسب معاييرك", priority: "low" },
    ],
  },
  "/create-listing": {
    greeting: "سأساعدك في إنشاء إعلان احترافي",
    role: "مساعد إنشاء",
    suggestions: [
      { id: "autofill", icon: "✨", label: "تعبئة تلقائية", description: "ارفع المستندات وسأستخرج البيانات تلقائياً", priority: "high" },
      { id: "photos", icon: "📷", label: "تحليل الصور", description: "ارفع صور المشروع وسأحدد الأصول والمعدات", priority: "high" },
      { id: "complete", icon: "📋", label: "إكمال الإعلان", description: "أكمل الحقول الناقصة بناءً على المعلومات المتوفرة", priority: "medium" },
      { id: "docs", icon: "📄", label: "استخراج من المستندات", description: "ارفع العقود والفواتير وسأستخرج التفاصيل", priority: "medium" },
    ],
  },
  "/dashboard": {
    greeting: "لوحة التحكم الخاصة بك",
    role: "مدير عمليات",
    suggestions: [
      { id: "status", icon: "📈", label: "ملخص الحالة", description: "نظرة عامة على إعلاناتك ومفاوضاتك", priority: "high" },
      { id: "improve", icon: "💡", label: "تحسين الإعلانات", description: "أقترح تحسينات لزيادة جاذبية إعلاناتك", priority: "medium" },
      { id: "missing", icon: "⚠️", label: "معلومات ناقصة", description: "أحدد المعلومات المطلوبة لإكمال ملفاتك", priority: "high" },
    ],
  },
};

const getNegotiationContext = (id?: string) => ({
  greeting: "أنا مفاوضك الذكي",
  role: "مفاوض محترف",
  suggestions: [
    { id: "negotiate", icon: "🤝", label: "تفاوض بالنيابة", description: "أتولى التفاوض نيابة عنك للوصول لأفضل اتفاق ممكن", priority: "high" as const },
    { id: "analyze-offer", icon: "📊", label: "تحليل العرض", description: "أحلل العرض الحالي وأقترح رد مناسب", priority: "high" as const },
    { id: "risks", icon: "⚡", label: "كشف المخاطر", description: "أحدد نقاط الضعف والمخاطر في الصفقة", priority: "medium" as const },
    { id: "draft", icon: "✍️", label: "صياغة رد", description: "أصيغ رد احترافي ومقنع للطرف الآخر", priority: "medium" as const },
  ],
});

const getListingContext = (id?: string) => ({
  greeting: "أحلل هذه الفرصة لك",
  role: "محلل صفقات",
  suggestions: [
    { id: "deal-intel", icon: "🧠", label: "تحليل الصفقة", description: "تحليل تجاري شامل للفرصة مع المخاطر والفرص", priority: "high" as const },
    { id: "price-check", icon: "💰", label: "تقييم السعر", description: "هل السعر المطلوب عادل؟ أقارنه مع السوق", priority: "high" as const },
    { id: "start-negotiate", icon: "🤝", label: "ابدأ التفاوض", description: "أساعدك في بدء مفاوضة ذكية", priority: "medium" as const },
    { id: "verify", icon: "✅", label: "تحقق من الإفصاح", description: "أراجع مدى اكتمال المعلومات والمستندات", priority: "medium" as const },
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
        greeting: "ملخص الاتفاق جاهز",
        role: "مراجع اتفاقيات",
        suggestions: [
          { id: "review", icon: "📋", label: "مراجعة الاتفاق", description: "أراجع بنود الاتفاق وأبرز النقاط المهمة", priority: "high" as const },
          { id: "risks", icon: "⚠️", label: "تنبيهات قانونية", description: "أحدد النقاط التي تحتاج انتباه قانوني", priority: "high" as const },
        ],
      };
    }
    return pageContextMap[pathname] || pageContextMap["/"];
  }, [pathname]);

  // Track idle
  useEffect(() => {
    setBehavior(b => ({ ...b, idleSeconds: 0, hesitationDetected: false }));
    setProactiveMessage(null);

    idleTimer.current = setInterval(() => {
      setBehavior(prev => {
        const newIdle = prev.idleSeconds + 1;
        if (newIdle === 8 && !prev.hesitationDetected) {
          const ctx = getContext();
          setProactiveMessage(`💡 ${ctx.suggestions[0]?.description || "كيف أقدر أساعدك؟"}`);
          return { ...prev, idleSeconds: newIdle, hesitationDetected: true };
        }
        return { ...prev, idleSeconds: newIdle };
      });
    }, 1000);

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
