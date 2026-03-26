import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoIcon from "@/assets/logo-icon-gold.png";
import {
  Store, Camera, Sparkles, ClipboardList, Search, MessageSquare, Shield,
  CheckCircle, ArrowLeft, ArrowRight, FileText, Eye, Handshake, Award,
  ChevronLeft, ChevronRight, Users, Zap, Lock, BarChart3
} from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

type Perspective = "seller" | "buyer";

interface Step {
  icon: React.ElementType;
  title: string;
  description: string;
  detail: string;
  color: string;
}

const sellerSteps: Step[] = [
  {
    icon: Store,
    title: "اختر نوع التقبيل",
    description: "حدد هيكل الصفقة المناسب لمشروعك",
    detail: "اختر من بين عدة أنواع: تقبيل كامل، تقبيل بدون التزامات، تقبيل أصول فقط، أو تقبيل أصول وتجهيزات. النظام يخصص المتطلبات تلقائياً حسب اختيارك.",
    color: "from-primary/15 to-primary/5",
  },
  {
    icon: Camera,
    title: "ارفع الصور والمستندات",
    description: "صوّر مشروعك وارفع الوثائق المطلوبة",
    detail: "ارفع صور المحل، المعدات، والوثائق الرسمية. النظام يحدد الصور المطلوبة تلقائياً حسب نوع التقبيل، ويدعم السحب والإفلات المباشر.",
    color: "from-accent to-accent/50",
  },
  {
    icon: Sparkles,
    title: "تحليل ذكي بالـ AI",
    description: "الذكاء الاصطناعي يحلل ويصنف كل شيء",
    detail: "بمجرد رفع الصور، يقوم الـ AI بتعريف الأصول تلقائياً، تقدير حالتها، واقتراح الكميات — بدون إدخال يدوي. كل ما عليك هو المراجعة والتأكيد.",
    color: "from-warning/15 to-warning/5",
  },
  {
    icon: ClipboardList,
    title: "أكمل بيانات الإفصاح",
    description: "أضف التفاصيل المالية والتشغيلية",
    detail: "أدخل السعر، الموقع، تفاصيل العقد والتراخيص. النظام يتحقق من جودة البيانات ويحسب درجة الشفافية لإعلانك تلقائياً.",
    color: "from-success/15 to-success/5",
  },
  {
    icon: Eye,
    title: "انشر وراقب",
    description: "إعلانك جاهز ويظهر في سوق الفرص",
    detail: "بعد النشر، يظهر إعلانك للمشترين مع تقييم AI وشارة الشفافية. تابع الإحصائيات والاستفسارات من لوحة التحكم الخاصة بك.",
    color: "from-primary/10 to-accent/10",
  },
];

const buyerSteps: Step[] = [
  {
    icon: Search,
    title: "تصفّح سوق الفرص",
    description: "ابحث عن المشاريع المناسبة لك",
    detail: "استخدم الفلاتر الذكية للبحث حسب المدينة، نوع التقبيل، نطاق السعر، والنشاط التجاري. البحث الذكي يفهم ما تبحث عنه بلغتك.",
    color: "from-primary/15 to-primary/5",
  },
  {
    icon: FileText,
    title: "راجع تفاصيل المشروع",
    description: "اطلع على كل التفاصيل قبل اتخاذ القرار",
    detail: "شاهد صور المشروع، قائمة الأصول المحللة بالـ AI، درجة الشفافية، تقييمات البائع، وتفاصيل الصفقة الكاملة في صفحة واحدة.",
    color: "from-accent to-accent/50",
  },
  {
    icon: MessageSquare,
    title: "تفاوض مع البائع",
    description: "ابدأ محادثة مباشرة وتفاوض على الشروط",
    detail: "أرسل عرضك وتفاوض على السعر والشروط عبر نظام المفاوضات المدمج. المساعد الذكي يقترح ردوداً احترافية ويساعدك في الوصول لاتفاق.",
    color: "from-warning/15 to-warning/5",
  },
  {
    icon: Shield,
    title: "وثّق الاتفاقية",
    description: "اتفاقية رسمية موثقة تحمي حقوقك",
    detail: "بعد الاتفاق على الشروط، يُنشئ النظام اتفاقية رقمية تتضمن كل التفاصيل. كلا الطرفين يوافقان إلكترونياً مع تأكيد قانوني.",
    color: "from-success/15 to-success/5",
  },
  {
    icon: Handshake,
    title: "أتمم الصفقة",
    description: "صفقة ناجحة مع حماية كاملة",
    detail: "بعد إتمام جميع الإجراءات والتأكيدات القانونية، تُغلق الصفقة رسمياً. يمكنك تقييم البائع ومشاركة تجربتك لمساعدة الآخرين.",
    color: "from-primary/10 to-accent/10",
  },
];

const features = [
  { icon: Sparkles, label: "تحليل ذكي بالـ AI", desc: "الأصول تُعرَّف وتُصنَّف تلقائياً" },
  { icon: Lock, label: "حماية وأمان", desc: "تشفير كامل وسياسات صارمة" },
  { icon: BarChart3, label: "شفافية كاملة", desc: "درجة شفافية لكل إعلان" },
  { icon: Award, label: "تقييمات موثوقة", desc: "نظام تقييم عادل ومحايد" },
];

const HowItWorksPage = () => {
  useSEO({ title: "كيف تعمل المنصة", description: "تعرف على خطوات عرض مشروعك أو شراء فرصة عبر سوق تقبيل", canonical: "/how-it-works" });
  const [perspective, setPerspective] = useState<Perspective>("seller");
  const [activeStep, setActiveStep] = useState(0);

  const steps = perspective === "seller" ? sellerSteps : buyerSteps;
  const current = steps[activeStep];

  const goNext = () => setActiveStep(s => Math.min(steps.length - 1, s + 1));
  const goPrev = () => setActiveStep(s => Math.max(0, s - 1));

  const switchPerspective = (p: Perspective) => {
    setPerspective(p);
    setActiveStep(0);
  };

  return (
    <div className="py-10 md:py-16">
      <div className="container max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-10 md:mb-14">
          <div className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-soft animate-fade-in">
            <img src={logoIcon} alt="سوق تقبيل" className="w-[4.5rem] h-[4.5rem] object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-3">كيف تعمل المنصة؟</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            سواء كنت بائعاً أو مشترياً، نوفر لك رحلة سلسة ومحمية من البداية حتى إتمام الصفقة
          </p>
        </div>

        {/* Perspective Toggle */}
        <div className="flex justify-center mb-10">
          <div className="flex bg-muted/50 rounded-2xl p-1.5 gap-1">
            <button
              onClick={() => switchPerspective("seller")}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all",
                perspective === "seller"
                  ? "bg-card shadow-soft text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Store size={16} strokeWidth={1.5} />
              رحلة البائع
            </button>
            <button
              onClick={() => switchPerspective("buyer")}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all",
                perspective === "buyer"
                  ? "bg-card shadow-soft text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users size={16} strokeWidth={1.5} />
              رحلة المشتري
            </button>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="relative mb-8">
          <div className="flex items-center justify-between relative z-10">
            {steps.map((step, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className="flex flex-col items-center group"
              >
                <div className={cn(
                  "w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                  i === activeStep
                    ? "bg-primary text-primary-foreground border-primary shadow-soft-lg scale-110"
                    : i < activeStep
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-muted text-muted-foreground border-border/50 group-hover:border-primary/30"
                )}>
                  {i < activeStep ? (
                    <CheckCircle size={18} strokeWidth={1.5} />
                  ) : (
                    <step.icon size={18} strokeWidth={1.5} />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] md:text-[11px] mt-2 font-medium transition-colors max-w-[80px] text-center leading-tight",
                  i === activeStep ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
              </button>
            ))}
          </div>
          {/* Connector line */}
          <div className="absolute top-[22px] md:top-6 right-[44px] left-[44px] h-0.5 bg-border/50 -z-0" />
          <div
            className="absolute top-[22px] md:top-6 right-[44px] h-0.5 bg-primary transition-all duration-500 -z-0"
            style={{ width: `${(activeStep / (steps.length - 1)) * (100 - (88 / (steps.length)))}%` }}
          />
        </div>

        {/* Step Detail Card */}
        <div
          key={`${perspective}-${activeStep}`}
          className={cn(
            "rounded-2xl border border-border/40 overflow-hidden bg-card shadow-soft mb-6",
            "animate-fade-in"
          )}
        >
          <div className={cn("bg-gradient-to-br p-6 md:p-8", current.color)}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-card/80 backdrop-blur flex items-center justify-center shadow-soft shrink-0">
                <current.icon size={24} strokeWidth={1.5} className="text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-card/60 text-muted-foreground font-medium">
                    خطوة {activeStep + 1} من {steps.length}
                  </span>
                </div>
                <h2 className="text-lg md:text-xl font-semibold mb-2">{current.title}</h2>
                <p className="text-sm text-foreground/80 font-medium">{current.description}</p>
              </div>
            </div>
          </div>
          <div className="p-6 md:p-8">
            <p className="text-sm leading-relaxed text-muted-foreground">{current.detail}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-16">
          <button
            onClick={goPrev}
            disabled={activeStep === 0}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.98]",
              activeStep === 0
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "bg-secondary text-secondary-foreground hover:shadow-soft"
            )}
          >
            <ArrowRight size={14} strokeWidth={1.5} />
            السابق
          </button>
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  i === activeStep ? "bg-primary w-6" : "bg-border hover:bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
          <button
            onClick={goNext}
            disabled={activeStep === steps.length - 1}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.98]",
              activeStep === steps.length - 1
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "gradient-primary text-primary-foreground hover:shadow-soft"
            )}
          >
            التالي
            <ArrowLeft size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Platform Features */}
        <div className="text-center mb-8">
          <h2 className="text-lg font-semibold mb-2">لماذا تقبيل؟</h2>
          <p className="text-sm text-muted-foreground">مميزات تجعل تجربتك أسهل وأكثر أماناً</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          {features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-border/30 bg-card p-5 text-center hover:shadow-soft transition-all">
              <f.icon size={22} strokeWidth={1.3} className="mx-auto mb-3 text-primary" />
              <div className="text-sm font-medium mb-1">{f.label}</div>
              <div className="text-[11px] text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border border-primary/10 p-8 text-center">
          <Zap size={28} className="mx-auto mb-3 text-primary" strokeWidth={1.5} />
          <h2 className="text-lg font-semibold mb-2">جاهز للبدء؟</h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            سواء كنت تريد بيع مشروعك أو البحث عن فرصة استثمارية، المنصة جاهزة لخدمتك
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/create-listing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:shadow-soft-lg transition-all active:scale-[0.98]"
            >
              <Plus size={16} />
              أضف مشروعك
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-card border border-border/50 text-foreground text-sm font-medium hover:shadow-soft transition-all active:scale-[0.98]"
            >
              <Search size={16} />
              تصفح المشاريع
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// Used in CTA but imported at top — fix missing import
const Plus = ({ size = 24, ...props }: { size?: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

export default HowItWorksPage;
