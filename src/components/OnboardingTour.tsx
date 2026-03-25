import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, ArrowLeft, ArrowRight, Search, PlusCircle, MessageSquare, FileCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AiStar from "@/components/AiStar";

const ONBOARDING_KEY = "taqbeel_onboarding_done";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; path: string };
}

const steps: Step[] = [
  {
    icon: <AiStar size={28} />,
    title: "أهلاً بك في سوق تقبيل!",
    description: "منصة ذكية لتقبيل المشاريع التجارية بأمان وشفافية. دعنا نأخذك في جولة سريعة.",
  },
  {
    icon: <Search size={28} className="text-primary" />,
    title: "تصفّح الفرص",
    description: "استعرض فرص التقبيل المتاحة، استخدم البحث الذكي والفلاتر للوصول لما يناسبك.",
    action: { label: "افتح السوق", path: "/marketplace" },
  },
  {
    icon: <PlusCircle size={28} className="text-primary" />,
    title: "اعرض مشروعك",
    description: "أنشئ إعلاناً جديداً بخطوات بسيطة. الذكاء الاصطناعي يساعدك في جرد المخزون وتقييم المشروع.",
    action: { label: "أنشئ إعلان", path: "/create-listing" },
  },
  {
    icon: <MessageSquare size={28} className="text-primary" />,
    title: "تفاوض بذكاء",
    description: "نظام تفاوض مدعوم بالذكاء الاصطناعي يقترح حلولاً عادلة ويساعد في إتمام الصفقة.",
  },
  {
    icon: <FileCheck size={28} className="text-primary" />,
    title: "اتفاقية رقمية",
    description: "بعد الاتفاق، يتم إنشاء اتفاقية رقمية تلقائياً مع تأكيد قانوني من الطرفين.",
  },
  {
    icon: <ShieldCheck size={28} className="text-primary" />,
    title: "أنت جاهز!",
    description: "ابدأ الآن باستكشاف الفرص أو عرض مشروعك. حظاً موفقاً!",
    action: { label: "ابدأ التصفح", path: "/marketplace" },
  },
];

const OnboardingTour = () => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only show on homepage for first-time visitors
    if (location.pathname === "/" && !localStorage.getItem(ONBOARDING_KEY)) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(ONBOARDING_KEY, "true");
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else dismiss();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleAction = () => {
    const action = steps[step].action;
    if (action) {
      dismiss();
      navigate(action.path);
    }
  };

  if (!visible) return null;

  const current = steps[step];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Close */}
          <div className="flex justify-between items-center px-5 pt-4">
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {step + 1} / {steps.length}
            </span>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              {current.icon}
            </div>
            <h3 className="text-lg font-semibold mb-2">{current.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex items-center gap-3">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={prev} className="gap-1">
                <ArrowRight size={14} />
                السابق
              </Button>
            )}
            <div className="flex-1" />
            {current.action && (
              <Button variant="outline" size="sm" onClick={handleAction} className="gap-1">
                {current.action.label}
              </Button>
            )}
            <Button size="sm" onClick={next} className="gap-1 gradient-primary text-primary-foreground">
              {step === steps.length - 1 ? "إنهاء" : "التالي"}
              {step < steps.length - 1 && <ArrowLeft size={14} />}
            </Button>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 pb-4">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  i === step ? "bg-primary w-4" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingTour;
