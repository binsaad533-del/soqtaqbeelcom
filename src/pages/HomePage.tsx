import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, ShieldCheck, FileText, MessageCircle, BarChart3, Camera } from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { useEffect, useRef } from "react";

const features = [
  {
    icon: Camera,
    title: "تحليل ذكي للصور",
    desc: "يكتشف الأصول والمعدات تلقائياً من صور المحل ويبني جرداً أولياً",
  },
  {
    icon: FileText,
    title: "استخراج بيانات المستندات",
    desc: "يقرأ عقود الإيجار والرخص ويستخلص البيانات الأساسية تلقائياً",
  },
  {
    icon: ShieldCheck,
    title: "إفصاح كامل وشفاف",
    desc: "نموذج إفصاح إلزامي يحمي المشتري ويعزز ثقة السوق",
  },
  {
    icon: BarChart3,
    title: "تحليل ذكاء الصفقة",
    desc: "تحليل تجاري شامل للمخاطر والفرص والتوصيات لكل فرصة",
  },
  {
    icon: MessageCircle,
    title: "تفاوض داخل المنصة",
    desc: "نظام تفاوض منظّم مع مساعد ذكي يسهّل الوصول لاتفاق",
  },
  {
    icon: Sparkles,
    title: "ملخص اتفاق موثّق",
    desc: "توثيق كامل للصفقة المتفق عليها بما يشمل كل التفاصيل",
  },
];

const stats = [
  { value: "847", label: "فرصة نشطة" },
  { value: "12", label: "مدينة" },
  { value: "94%", label: "إفصاح مكتمل" },
  { value: "326", label: "صفقة مكتملة" },
];

const HomePage = () => {
  const revealRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-reveal");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRevealRef = (el: HTMLDivElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero py-20 md:py-32 relative overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto text-center animate-reveal">
            <div className="flex justify-center mb-6">
              <img src={logo} alt="سوق تقبيل" className="h-16 md:h-20 w-auto mx-auto" />
            </div>
            <h1 className="text-3xl md:text-5xl font-medium leading-tight mb-5" style={{ lineHeight: 1.3 }}>
              تقبيل الأعمال بذكاء
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
              منصة ذكية لعرض وتحليل وتفاوض فرص تقبيل المحلات والمشاريع التجارية
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="gradient-primary text-primary-foreground rounded-xl shadow-soft hover:shadow-soft-lg transition-shadow active:scale-[0.98]">
                <Link to="/marketplace">
                  تصفّح الفرص
                  <ArrowLeft size={16} strokeWidth={1.5} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl border-border/60 hover:bg-accent/50 active:scale-[0.98]">
                <Link to="/create-listing">أضف فرصتك</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-b border-border/50">
        <div className="container" ref={addRevealRef} style={{ opacity: 0 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className={`text-center animate-reveal-delay-${i + 1}`}>
                <div className="text-2xl md:text-3xl font-medium gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12" ref={addRevealRef} style={{ opacity: 0 }}>
            <h2 className="text-2xl md:text-3xl font-medium mb-3">منصة متكاملة بالذكاء الاصطناعي</h2>
            <p className="text-muted-foreground max-w-md mx-auto">كل أداة تحتاجها لتقييم وتفاوض وتوثيق صفقات تقبيل الأعمال</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                ref={addRevealRef}
                style={{ opacity: 0, animationDelay: `${i * 80}ms` }}
                className="group bg-card rounded-2xl p-6 shadow-soft hover:shadow-soft-lg transition-all duration-300 cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/60 flex items-center justify-center mb-4 group-hover:bg-accent transition-colors">
                  <f.icon size={20} strokeWidth={1.3} className="text-accent-foreground" />
                </div>
                <h3 className="font-medium mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12" ref={addRevealRef} style={{ opacity: 0 }}>
            <h2 className="text-2xl md:text-3xl font-medium mb-4">ليش تقبيل؟</h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
              لأنك ما تحتاج منصة تعرض مشروعك فقط…
              <br />
              <span className="font-medium text-foreground">تحتاج منصة تساعدك تبيعه فعليًا.</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { num: "1", title: "صفقات حقيقية… مو مجرد إعلانات", desc: "نركّز على إتمام الصفقة، مو مجرد عرض إعلان بين آلاف الإعلانات العشوائية." },
              { num: "2", title: "بيانات واضحة وموثوقة", desc: "نرتّب ونحلل المعلومات بحيث تكون دقيقة ومفهومة، بدون عشوائية أو نقص." },
              { num: "3", title: "تسعير منطقي ومدروس", desc: "نساعدك تفهم القيمة الحقيقية للمشروع، ونكشف الأسعار غير الواقعية." },
              { num: "4", title: "إدخال بيانات سريع وسهل", desc: "نختصر عليك الوقت بخطوات بسيطة وواضحة، بدون تعقيد أو نماذج طويلة." },
              { num: "5", title: "تجربة منظمة وواضحة", desc: "كل شيء مصمم ليكون واضح ومرتب من أول خطوة حتى إتمام الصفقة." },
              { num: "6", title: "ذكاء اصطناعي يدعم قرارك", desc: "تحليل تلقائي للصور والمستندات والأسعار يساعدك تاخذ قرار مبني على بيانات حقيقية." },
            ].map((item, i) => (
              <div
                key={item.num}
                ref={addRevealRef}
                style={{ opacity: 0, animationDelay: `${i * 120}ms` }}
                className="group bg-card rounded-2xl p-5 shadow-soft hover:shadow-soft-lg hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 cursor-default"
              >
                <span className="inline-flex w-8 h-8 rounded-lg bg-primary/10 text-primary items-center justify-center font-medium text-sm mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  {item.num}
                </span>
                <h3 className="font-medium mb-1.5 group-hover:text-primary transition-colors duration-300">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 gradient-hero" ref={addRevealRef} style={{ opacity: 0 }}>
        <div className="container text-center">
          <AiStar size={36} className="justify-center mb-4" />
          <p className="text-muted-foreground mb-1">إذا عندك مشروع… أو تبحث عن فرصة</p>
          <h2 className="text-2xl md:text-3xl font-medium mb-6">ابدأ الآن وخلك أقرب لصفقة ناجحة</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground rounded-xl shadow-soft active:scale-[0.98]">
              <Link to="/create-listing">ابدأ الآن</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl border-border/60 hover:bg-accent/50 active:scale-[0.98]">
              <Link to="/marketplace">تصفح المشاريع</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
