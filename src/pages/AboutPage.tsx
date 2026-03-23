import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const values = [
  { title: "البساطة", desc: "نجعل عملية عرض المشاريع والتفاوض عليها سهلة وواضحة بدون خطوات معقدة." },
  { title: "الثقة", desc: "نحرص على تقديم بيئة آمنة وشفافة تضمن وضوح المعلومات وتقليل المخاطر." },
  { title: "السرعة", desc: "نختصر الوقت بين العرض والاتفاق، ونساعد على تسريع إتمام الصفقات." },
  { title: "الذكاء", desc: "نستخدم تقنيات ذكية لتحليل المشاريع، دعم التفاوض، وتحسين قرارات البيع والشراء." },
];

const stats = [
  { value: "+1,000", label: "فرصة معروضة" },
  { value: "+500", label: "صفقة محتملة" },
  { value: "94%", label: "معدل إتمام الصفقات" },
];

const AboutPage = () => {
  return (
    <div className="min-h-screen" dir="rtl">
      {/* Hero / Intro */}
      <section className="py-16 md:py-24">
        <div className="container max-w-2xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-semibold mb-6">من نحن</h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4">
            نحن منصة "تقبيل"، نربط بين البائعين والمشترين بطريقة ذكية وسريعة وآمنة، لنحوّل فرص البيع والشراء إلى صفقات ناجحة بدون تعقيد.
          </p>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            نؤمن أن كل مشروع أو أصل له قيمة حقيقية، ومهمتنا هي إظهار هذه القيمة وربطها بالشخص المناسب في الوقت المناسب.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-12 md:py-16 border-t border-border/30">
        <div className="container max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            {values.map((v) => (
              <div key={v.title} className="text-center px-4 py-6">
                <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ownership */}
      <section className="py-12 md:py-16 border-t border-border/30">
        <div className="container max-w-2xl mx-auto text-center space-y-4">
          <p className="text-base text-muted-foreground leading-relaxed">
            منصة "تقبيل" هي منصة سعودية بالكامل، مملوكة ومُدارة من قبل شركة{" "}
            <a
              href="https://www.jsaas-group.com/en"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              عين جساس
            </a>
          </p>
          <p className="text-sm text-muted-foreground/70">
            السجل التجاري: <span className="font-medium text-foreground/80" dir="ltr">7017628152</span>
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 border-t border-border/30">
        <div className="container max-w-2xl mx-auto">
          <div className="grid grid-cols-3 gap-4 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-xl md:text-2xl font-semibold gradient-text">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing + CTA */}
      <section className="py-16 md:py-20 border-t border-border/30">
        <div className="container max-w-2xl mx-auto text-center">
          <p className="text-lg md:text-xl text-muted-foreground mb-1">هدفنا ليس مجرد عرض مشاريع…</p>
          <p className="text-lg md:text-xl font-semibold mb-8">بل إتمام صفقات ناجحة.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground rounded-xl shadow-soft active:scale-[0.98]">
              <Link to="/create-listing">ابدأ عرض مشروعك</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl border-border/60 hover:bg-accent/50 active:scale-[0.98]">
              <Link to="/marketplace">تصفح الفرص</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
