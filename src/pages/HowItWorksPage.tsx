import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoIcon from "@/assets/logo-icon-gold.png";
import {
  Store, Camera, Sparkles, ClipboardList, Search, MessageSquare, Shield,
  CheckCircle, ArrowLeft, ArrowRight, FileText, Eye, Handshake, Award,
  Users, Zap, Lock, BarChart3, Plus, Heart, Send, Gavel, ArrowRightLeft,
  Receipt, Star, BadgeCheck, Bell, Wallet,
} from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

type Perspective = "seller" | "buyer";

interface Step {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  detail: string;
  tips?: string[];
  color: string;
}

const sellerSteps: Step[] = [
  {
    icon: Store,
    title: "١. أنشئ إعلانك",
    subtitle: "اختر نوع التقبيل وارفع التفاصيل",
    detail: "حدد هيكل الصفقة (تقبيل كامل، بدون التزامات، أصول فقط، أو أصول وتجهيزات). ارفع صور المشروع والوثائق الرسمية — الذكاء الاصطناعي يحلل الصور ويُصنّف الأصول تلقائياً ويحسب درجة الشفافية.",
    tips: ["النظام يحدد المستندات المطلوبة حسب نوع التقبيل", "كلما زادت البيانات ارتفعت درجة الشفافية وظهورك"],
    color: "from-primary/15 to-primary/5",
  },
  {
    icon: Eye,
    title: "٢. انشر وتابع",
    subtitle: "إعلانك يظهر في سوق الفرص مع تقييم AI",
    detail: "بعد النشر، يظهر إعلانك بشارة الشفافية وتقييم الذكاء الاصطناعي. تابع عدد المشاهدات والمهتمين من لوحة تحكم البائع.",
    tips: ["يمكنك تعديل السعر بسرعة من لوحة التحكم", "الإعلانات المميزة تظهر في الصفحة الرئيسية"],
    color: "from-accent/15 to-accent/5",
  },
  {
    icon: Bell,
    title: "٣. استقبل الاهتمام",
    subtitle: "مشترٍ مهتم → صفقة تلقائية + محادثة",
    detail: "عندما يضغط مشترٍ على «أبدِ اهتمامك»، يتم إنشاء صفقة تلقائياً بحالة «تفاوض» في مسار الصفقات، وتُفتح محادثة مباشرة بينكما مع رسالة ترحيبية. تصلك إشعارات فورية.",
    tips: ["كل محادثة مرتبطة بإعلان محدد", "نظام البلاغات يحمي من التواصل الخارجي"],
    color: "from-warning/15 to-warning/5",
  },
  {
    icon: Gavel,
    title: "٤. تفاوض واقبل العرض",
    subtitle: "عروض أسعار + مفاوضات مباشرة مع مساعد ذكي",
    detail: "يرسل المشتري عرض سعر رسمي. يمكنك قبوله أو رفضه أو التفاوض عبر الدردشة. عند قبول العرض، تنتقل الصفقة تلقائياً لمرحلة «اتفاق» ويُحدّث السعر المتفق عليه.",
    tips: ["المساعد الذكي يقترح ردوداً ويحلل عدالة السعر", "يمكن استقبال عدة عروض — قبول واحد يضع البقية في الانتظار"],
    color: "from-success/15 to-success/5",
  },
  {
    icon: FileText,
    title: "٥. وثّق الاتفاقية",
    subtitle: "اتفاقية رقمية رسمية بموافقة الطرفين",
    detail: "يُنشئ النظام اتفاقية رقمية تتضمن كل التفاصيل: الأصول المشمولة والمستثناة، الشروط المالية، الالتزامات، وحالة التراخيص. كلا الطرفين يوافقان إلكترونياً مع تأكيد قانوني.",
    tips: ["يمكن تعديل الاتفاقية وإنشاء نسخ محدّثة", "تُنشأ بصيغة PDF قابلة للتحميل والطباعة"],
    color: "from-primary/10 to-accent/10",
  },
  {
    icon: ArrowRightLeft,
    title: "٦. ابدأ نقل الملكية",
    subtitle: "زر «بدء النقل» يظهر لك فقط عند مرحلة الاتفاق",
    detail: "بعد توقيع الاتفاقية، اضغط «بدء نقل الملكية» لتنتقل الصفقة لمرحلة النقل. يتم إخطار المشتري فوراً. بعد إتمام النقل، يؤكد المشتري الاستلام وتُغلق الصفقة.",
    tips: ["الإعلان يُقفل تلقائياً ويتحول لـ «مُباع»", "يُنشأ سجل فاتورة آلي فور اكتمال الصفقة"],
    color: "from-emerald-500/15 to-emerald-500/5",
  },
  {
    icon: Receipt,
    title: "٧. الفاتورة والعمولة",
    subtitle: "عمولة 1% فقط عند إتمام الصفقة",
    detail: "تُنشأ فاتورة تلقائية بعد اكتمال الصفقة تتضمن قيمة الصفقة وعمولة المنصة (1%). لا توجد أي رسوم على التصفح أو التفاوض أو الإعلان — تدفع فقط عند النجاح.",
    tips: ["الفاتورة قابلة للتحميل كـ PDF", "تابع عمولاتك من لوحة تحكم البائع"],
    color: "from-orange-500/15 to-orange-500/5",
  },
];

const buyerSteps: Step[] = [
  {
    icon: Search,
    title: "١. تصفّح سوق الفرص",
    subtitle: "فلاتر ذكية وبحث يفهم لغتك",
    detail: "ابحث حسب المدينة، نوع التقبيل، نطاق السعر، والنشاط التجاري. البحث الذكي يفهم ما تكتبه ويقترح النتائج الأقرب. قارن بين عدة إعلانات جنباً إلى جنب.",
    tips: ["فعّل تنبيهات البحث ليصلك إشعار عند ظهور فرص جديدة", "احفظ الإعلانات المفضلة للرجوع إليها لاحقاً"],
    color: "from-primary/15 to-primary/5",
  },
  {
    icon: Eye,
    title: "٢. راجع التفاصيل",
    subtitle: "صور، أصول، تقييم AI، ودرجة شفافية",
    detail: "كل إعلان يعرض: صور المشروع، قائمة الأصول المحللة بالذكاء الاصطناعي، درجة الشفافية، تقييمات البائع، وتفاصيل مالية وتشغيلية كاملة. اطلب «فحص صفقة» بالـ AI لتحليل مخاطر إضافي.",
    tips: ["شارة التوثيق تعني أن البائع أكمل التحقق من هويته", "درجة الشفافية تعكس مدى اكتمال البيانات"],
    color: "from-accent/15 to-accent/5",
  },
  {
    icon: Heart,
    title: "٣. أبدِ اهتمامك",
    subtitle: "ضغطة واحدة → صفقة + محادثة مباشرة",
    detail: "اضغط «أبدِ اهتمامك» لتبدأ صفقة فورية بحالة «تفاوض». تُفتح محادثة مباشرة مع البائع ويتم إخطاره. الصفقة تظهر في مسار الصفقات لتتابع تقدمها.",
    tips: ["يمكنك إبداء اهتمامك بعدة إعلانات في نفس الوقت", "المحادثة محمية ببنر أمان ونظام بلاغات"],
    color: "from-warning/15 to-warning/5",
  },
  {
    icon: Send,
    title: "٤. أرسل عرض سعر",
    subtitle: "تفاوض على السعر والشروط",
    detail: "أرسل عرض سعر رسمي مع رسالة توضيحية. تفاوض عبر الدردشة المدمجة بمساعدة الذكاء الاصطناعي الذي يقترح ردوداً ويحلل عدالة السعر. عند قبول البائع، تنتقل الصفقة لمرحلة «اتفاق».",
    tips: ["المساعد الذكي يحلل السوق ويقترح نطاق سعر عادل", "شريط التقدم يوضح المرحلة الحالية في كل لحظة"],
    color: "from-success/15 to-success/5",
  },
  {
    icon: Shield,
    title: "٥. وقّع الاتفاقية",
    subtitle: "اتفاقية رقمية موثقة تحمي حقوقك",
    detail: "راجع الاتفاقية التي تتضمن كل التفاصيل المتفق عليها: الأصول، الشروط، والالتزامات. وافق إلكترونياً مع تأكيد قانوني. الاتفاقية تُحفظ في أرشيف مخصص يمكنك الرجوع إليه.",
    tips: ["كلا الطرفين يجب أن يوافقا لتصبح الاتفاقية سارية", "يمكن طلب تعديلات قبل التوقيع النهائي"],
    color: "from-primary/10 to-accent/10",
  },
  {
    icon: CheckCircle,
    title: "٦. أكّد الاستلام",
    subtitle: "تأكيد نقل الملكية وإغلاق الصفقة",
    detail: "بعد أن يبدأ البائع نقل الملكية، راجع كل شيء ثم اضغط «تأكيد استلام النشاط». تُغلق الصفقة رسمياً ويتحول الإعلان لـ «مُباع». يمكنك تقييم البائع ومشاركة تجربتك.",
    tips: ["تُنشأ فاتورة رسمية تلقائياً", "تقييمك يساعد المشترين الآخرين في اتخاذ قراراتهم"],
    color: "from-emerald-500/15 to-emerald-500/5",
  },
];

const features = [
  { icon: Sparkles, label: "تحليل ذكي بالـ AI", desc: "تصنيف الأصول وتقييم المخاطر تلقائياً" },
  { icon: Lock, label: "حماية كاملة", desc: "محادثات محمية، بنر أمان، ونظام بلاغات" },
  { icon: BarChart3, label: "شفافية مطلقة", desc: "درجة شفافية وإفصاح لكل إعلان" },
  { icon: Award, label: "تقييمات موثوقة", desc: "تقييم البائع من المشترين الحقيقيين" },
  { icon: Wallet, label: "عمولة عادلة", desc: "1% فقط عند إتمام الصفقة — لا رسوم خفية" },
  { icon: BadgeCheck, label: "توثيق الهوية", desc: "نظام تحقق متعدد المستويات للبائعين" },
];

const pipelineStages = [
  { label: "إعلان", color: "bg-muted text-muted-foreground" },
  { label: "اهتمام", color: "bg-blue-500/15 text-blue-600" },
  { label: "تفاوض", color: "bg-primary/15 text-primary" },
  { label: "اتفاق", color: "bg-amber-500/15 text-amber-600" },
  { label: "نقل ملكية", color: "bg-emerald-500/15 text-emerald-600" },
  { label: "مكتملة", color: "bg-success/15 text-success" },
];

const HowItWorksPage = () => {
  useSEO({ title: "كيف تتم الصفقة | سوق تقبيل", description: "تعرف على مراحل الصفقة من الإعلان حتى الإتمام في سوق تقبيل", canonical: "/how-it-works" });
  const [perspective, setPerspective] = useState<Perspective>("seller");
  const [activeStep, setActiveStep] = useState(0);

  const steps = perspective === "seller" ? sellerSteps : buyerSteps;
  const current = steps[activeStep];

  const goNext = () => setActiveStep(s => Math.min(steps.length - 1, s + 1));
  const goPrev = () => setActiveStep(s => Math.max(0, s - 1));

  const switchPerspective = (p: Perspective) => { setPerspective(p); setActiveStep(0); };

  return (
    <div className="py-10 md:py-16">
      <div className="container max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-10 md:mb-14">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-soft animate-fade-in">
            <img src={logoIcon} alt="سوق تقبيل" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-3">كيف تتم الصفقة؟</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            رحلة متكاملة من الإعلان حتى إتمام نقل الملكية — بشفافية وحماية كاملة
          </p>
        </div>

        {/* Pipeline Overview */}
        <div className="mb-12 rounded-2xl border border-border/30 bg-card p-5 md:p-6">
          <p className="text-xs font-semibold text-muted-foreground mb-4 text-center">مسار الصفقة الكامل</p>
          <div className="flex items-center justify-between gap-1 overflow-x-auto">
            {pipelineStages.map((stage, i) => (
              <div key={i} className="flex items-center gap-1 shrink-0">
                <span className={cn("px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-medium whitespace-nowrap", stage.color)}>
                  {stage.label}
                </span>
                {i < pipelineStages.length - 1 && (
                  <ArrowLeft size={12} className="text-muted-foreground/30 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Perspective Toggle */}
        <div className="flex justify-center mb-10">
          <div className="flex bg-muted/50 rounded-2xl p-1.5 gap-1">
            <button
              onClick={() => switchPerspective("seller")}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all",
                perspective === "seller" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Store size={16} strokeWidth={1.5} /> رحلة البائع
            </button>
            <button
              onClick={() => switchPerspective("buyer")}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all",
                perspective === "buyer" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users size={16} strokeWidth={1.5} /> رحلة المشتري
            </button>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="relative mb-8">
          <div className="flex items-center justify-between relative z-10">
            {steps.map((step, i) => (
              <button key={i} onClick={() => setActiveStep(i)} className="flex flex-col items-center group">
                <div className={cn(
                  "w-10 h-10 md:w-11 md:h-11 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                  i === activeStep
                    ? "bg-primary text-primary-foreground border-primary shadow-soft-lg scale-110"
                    : i < activeStep
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-muted text-muted-foreground border-border/50 group-hover:border-primary/30"
                )}>
                  {i < activeStep ? <CheckCircle size={16} strokeWidth={1.5} /> : <step.icon size={16} strokeWidth={1.5} />}
                </div>
                <span className={cn(
                  "text-[9px] md:text-[10px] mt-2 font-medium transition-colors max-w-[60px] md:max-w-[80px] text-center leading-tight",
                  i === activeStep ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.title.replace(/[٠-٩0-9]\.\s*/, "")}
                </span>
              </button>
            ))}
          </div>
          <div className="absolute top-[20px] md:top-[22px] right-[40px] left-[40px] h-0.5 bg-border/50 -z-0" />
          <div
            className="absolute top-[20px] md:top-[22px] right-[40px] h-0.5 bg-primary transition-all duration-500 -z-0"
            style={{ width: `${(activeStep / (steps.length - 1)) * (100 - (80 / steps.length))}%` }}
          />
        </div>

        {/* Step Detail Card */}
        <div key={`${perspective}-${activeStep}`} className={cn("rounded-2xl border border-border/40 overflow-hidden bg-card shadow-soft mb-6 animate-fade-in")}>
          <div className={cn("bg-gradient-to-br p-6 md:p-8", current.color)}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-card/80 backdrop-blur flex items-center justify-center shadow-soft shrink-0">
                <current.icon size={24} strokeWidth={1.5} className="text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-card/60 text-muted-foreground font-medium">
                  خطوة {activeStep + 1} من {steps.length}
                </span>
                <h2 className="text-lg md:text-xl font-semibold mt-1.5 mb-1">{current.title}</h2>
                <p className="text-sm text-foreground/80 font-medium">{current.subtitle}</p>
              </div>
            </div>
          </div>
          <div className="p-6 md:p-8 space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{current.detail}</p>
            {current.tips && current.tips.length > 0 && (
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-muted-foreground mb-2">💡 نصائح</p>
                <ul className="space-y-1.5">
                  {current.tips.map((tip, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-16">
          <button
            onClick={goPrev}
            disabled={activeStep === 0}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.98]",
              activeStep === 0 ? "text-muted-foreground/40 cursor-not-allowed" : "bg-secondary text-secondary-foreground hover:shadow-soft"
            )}
          >
            <ArrowRight size={14} strokeWidth={1.5} /> السابق
          </button>
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button key={i} onClick={() => setActiveStep(i)} className={cn("w-2 h-2 rounded-full transition-all duration-300", i === activeStep ? "bg-primary w-5" : "bg-border hover:bg-muted-foreground/30")} />
            ))}
          </div>
          <button
            onClick={goNext}
            disabled={activeStep === steps.length - 1}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.98]",
              activeStep === steps.length - 1 ? "text-muted-foreground/40 cursor-not-allowed" : "gradient-primary text-primary-foreground hover:shadow-soft"
            )}
          >
            التالي <ArrowLeft size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Platform Features */}
        <div className="text-center mb-8">
          <h2 className="text-lg font-semibold mb-2">لماذا سوق تقبيل؟</h2>
          <p className="text-sm text-muted-foreground">مميزات تجعل تجربتك أسهل وأكثر أماناً</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-12">
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
            <Link to="/create-listing" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:shadow-soft-lg transition-all active:scale-[0.98]">
              <Plus size={16} /> أضف مشروعك
            </Link>
            <Link to="/marketplace" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-card border border-border/50 text-foreground text-sm font-medium hover:shadow-soft transition-all active:scale-[0.98]">
              <Search size={16} /> تصفح المشاريع
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
