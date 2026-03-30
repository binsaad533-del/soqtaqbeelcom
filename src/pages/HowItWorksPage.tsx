import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoIcon from "@/assets/logo-icon-gold.png";
import {
  Store, Search, Heart, Gavel, FileText, ArrowRightLeft,
  CheckCircle, Plus, Zap, Lock, BarChart3, Award, Wallet,
  BadgeCheck, Sparkles,
} from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

interface Stage {
  icon: React.ElementType;
  title: string;
  seller: string;
  buyer: string;
  color: string;
  iconBg: string;
}

const stages: Stage[] = [
  {
    icon: Store,
    title: "إضافة الإعلان",
    seller: "يضيف نشاطه التجاري مع التفاصيل والصور والوثائق. الذكاء الاصطناعي يحلل الأصول ويحسب درجة الشفافية تلقائياً.",
    buyer: "يتصفح سوق الفرص ويستخدم الفلاتر الذكية للبحث حسب المدينة والنشاط والسعر.",
    color: "border-primary/20",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    icon: Heart,
    title: "إبداء الاهتمام",
    seller: "يستقبل إشعاراً فورياً عندما يبدي مشترٍ اهتمامه. تُفتح محادثة مباشرة ويبدأ التواصل.",
    buyer: "يضغط «أبدِ اهتمامك» فتُنشأ صفقة تلقائياً بحالة تفاوض وتُفتح محادثة مع البائع.",
    color: "border-blue-500/20",
    iconBg: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Gavel,
    title: "التفاوض وعرض السعر",
    seller: "يراجع عروض الأسعار الواردة ويقبل أو يرفض أو يتفاوض عبر الدردشة بمساعدة الذكاء الاصطناعي.",
    buyer: "يرسل عرض سعر رسمي ويتفاوض على الشروط. المساعد الذكي يحلل عدالة السعر ويقترح ردوداً.",
    color: "border-amber-500/20",
    iconBg: "bg-amber-500/10 text-amber-600",
  },
  {
    icon: FileText,
    title: "الاتفاق والتوثيق",
    seller: "عند قبول العرض تنتقل الصفقة لمرحلة اتفاق. يُنشئ النظام اتفاقية رقمية يوافق عليها الطرفان إلكترونياً.",
    buyer: "يراجع الاتفاقية التي تتضمن الأصول والشروط والالتزامات ويوافق عليها مع تأكيد قانوني.",
    color: "border-purple-500/20",
    iconBg: "bg-purple-500/10 text-purple-600",
  },
  {
    icon: ArrowRightLeft,
    title: "نقل الملكية",
    seller: "يضغط «بدء نقل الملكية» لتنتقل الصفقة لمرحلة النقل ويُخطر المشتري فوراً.",
    buyer: "يتأكد من استلام كل شيء ثم يضغط «تأكيد الاستلام» لإتمام الصفقة رسمياً.",
    color: "border-emerald-500/20",
    iconBg: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: CheckCircle,
    title: "إتمام الصفقة",
    seller: "تُنشأ فاتورة تلقائية بعمولة 1% فقط. يتابع إحصائياته من لوحة تحكم البائع.",
    buyer: "يُقيّم البائع ويشارك تجربته. الإعلان يتحول لـ «مُباع» وتُحفظ الاتفاقية في الأرشيف.",
    color: "border-success/20",
    iconBg: "bg-success/10 text-success",
  },
];

const features = [
  { icon: Sparkles, label: "تحليل ذكي بالـ AI", desc: "تصنيف الأصول وتقييم المخاطر تلقائياً" },
  { icon: Lock, label: "حماية كاملة", desc: "محادثات محمية ونظام بلاغات متقدم" },
  { icon: BarChart3, label: "شفافية مطلقة", desc: "درجة شفافية وإفصاح لكل إعلان" },
  { icon: Award, label: "تقييمات موثوقة", desc: "تقييم البائع من المشترين الحقيقيين" },
  { icon: Wallet, label: "عمولة عادلة", desc: "1% فقط عند إتمام الصفقة — لا رسوم خفية" },
  { icon: BadgeCheck, label: "توثيق الهوية", desc: "نظام تحقق متعدد المستويات للبائعين" },
];

const HowItWorksPage = () => {
  useSEO({
    title: "كيف تتم الصفقة | سوق تقبيل",
    description: "تعرف على مراحل الصفقة من الإعلان حتى الإتمام في سوق تقبيل",
    canonical: "/how-it-works",
  });

  return (
    <div className="py-10 md:py-16">
      <div className="container max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-12 md:mb-16">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-soft animate-fade-in">
            <img src={logoIcon} alt="سوق تقبيل" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-3">كيف تتم الصفقة؟</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            ٦ مراحل واضحة من الإعلان حتى إتمام نقل الملكية — بشفافية وحماية كاملة
          </p>
        </div>

        {/* Stages Timeline */}
        <div className="relative mb-16">
          {/* Vertical connector line */}
          <div className="absolute top-0 bottom-0 right-[27px] md:right-1/2 w-0.5 bg-border/40 -translate-x-1/2" />

          <div className="space-y-0">
            {stages.map((stage, i) => (
              <div key={i} className="relative group">
                {/* Stage node */}
                <div className={cn(
                  "relative flex gap-4 md:gap-0 items-start",
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                )}>
                  {/* Icon circle - always on right for mobile */}
                  <div className="relative z-10 shrink-0 md:absolute md:right-1/2 md:translate-x-1/2">
                    <div className={cn(
                      "w-[54px] h-[54px] rounded-2xl flex items-center justify-center border-2 border-background shadow-soft transition-transform group-hover:scale-110",
                      stage.iconBg
                    )}>
                      <stage.icon size={22} strokeWidth={1.5} />
                    </div>
                    {/* Step number */}
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>

                  {/* Content card */}
                  <div className={cn(
                    "flex-1 md:w-[calc(50%-40px)]",
                    i % 2 === 0 ? "md:pr-10 md:ml-auto" : "md:pl-10 md:mr-auto"
                  )}>
                    <div className={cn(
                      "rounded-2xl border bg-card p-5 md:p-6 shadow-soft hover:shadow-md transition-all",
                      stage.color
                    )}>
                      <h3 className="text-base font-semibold text-foreground mb-3">{stage.title}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-primary/[0.03] p-3">
                          <span className="text-[9px] font-bold text-primary uppercase tracking-wider">البائع</span>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{stage.seller}</p>
                        </div>
                        <div className="rounded-xl bg-accent/30 p-3">
                          <span className="text-[9px] font-bold text-accent-foreground uppercase tracking-wider">المشتري</span>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{stage.buyer}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spacer */}
                {i < stages.length - 1 && <div className="h-4 md:h-2" />}
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
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
