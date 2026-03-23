import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { useEffect, useRef } from "react";

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
    <div className="relative">

      {/* Hero */}
      <section className="gradient-hero py-20 md:py-32 relative overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto text-center animate-reveal">
            <div className="flex justify-center mb-6">
              <img src={logo} alt="سوق تقبيل" className="h-16 md:h-20 w-auto mx-auto" />
            </div>
            <p className="text-sm font-medium text-primary mb-3 tracking-wide">أول منصة سعودية بالذكاء الاصطناعي لتقبيل المشاريع</p>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-medium leading-tight mb-5" style={{ lineHeight: 1.4 }}>
              ارفع صور مشروعك…
              <br />
              <span className="gradient-text">والذكاء الاصطناعي يكمل الباقي</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-4 max-w-xl mx-auto leading-relaxed">
              جرد، تقييم، بيانات، وتفاوض — كلها تلقائيًا بدون ما تكتب سطر واحد.
            </p>
            <p className="text-xs md:text-sm text-muted-foreground/70 mb-8">
              فقط ارفع الصور والمستندات وخلّ مقبل يشتغل عنك.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="gradient-primary text-primary-foreground rounded-xl shadow-soft hover:shadow-soft-lg transition-shadow active:scale-[0.98]">
                <Link to="/create-listing">
                  اعرض مشروعك
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl border-border/60 hover:bg-accent/50 active:scale-[0.98]">
                <Link to="/marketplace">
                  تصفح الفرص
                  <ArrowLeft size={16} strokeWidth={1.5} />
                </Link>
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

      {/* Smart Platform */}
      <section className="py-16 md:py-24 border-t border-border/50">
        <div className="container">
          <div className="text-center mb-12" ref={addRevealRef} style={{ opacity: 0 }}>
            <h2 className="text-2xl md:text-3xl font-medium mb-4">منصة بالذكاء الاصطناعي لإتمام الصفقات… مو مجرد عرض</h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              كل الأدوات اللي تحتاجها لتقييم، عرض، وتوثيق الصفقات في مكان واحد — بطريقة ذكية وسريعة وواضحة.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { num: "1", title: "ارفع صور… والذكاء يجرد لك", desc: "بمجرد رفع صور المحل أو المشروع، الذكاء الاصطناعي يسوّي جرد كامل للأصول والمعدات تلقائيًا." },
              { num: "2", title: "تقييم ذكي بدون خبير", desc: "المنصة تحلل بيانات المشروع وتعطيك تقييم واقعي للقيمة السوقية بناءً على البيانات الفعلية." },
              { num: "3", title: "بدون تعبئة بيانات… الذكاء يكفي", desc: "ارفع الصور والمستندات والذكاء الاصطناعي يستخرج كل البيانات المطلوبة بدون ما تكتب شيء." },
              { num: "4", title: "تفاوض ذكي داخل المنصة", desc: "مساعد ذكي يتفاوض معك ويقترح حلول عادلة ويساعدك توصل لأفضل صفقة." },
              { num: "5", title: "صفقات حقيقية… مو مجرد إعلانات", desc: "نركّز على إتمام الصفقة فعليًا، مو مجرد عرض إعلان بين آلاف الإعلانات." },
              { num: "6", title: "تجربة منظمة من البداية للنهاية", desc: "من رفع الصور حتى توقيع الاتفاق، كل شيء واضح ومرتب في مكان واحد." },
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
          <h2 className="text-2xl md:text-3xl font-medium mb-2">ابدأ الآن خلال 30 ثانية</h2>
          <p className="text-muted-foreground mb-6">سواء تبي تعرض مشروعك أو تدور فرصة… المنصة جاهزة لك</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground rounded-xl shadow-soft active:scale-[0.98]">
              <Link to="/create-listing">اعرض مشروعك</Link>
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

export default HomePage;
