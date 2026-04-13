import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Brain, Sparkles } from "lucide-react";
import logoIcon from "@/assets/logo-icon-gold.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

const values = [
  { icon: Sparkles, title: "البساطة", desc: "نجعل عملية عرض المشاريع والتفاوض عليها سهلة وواضحة بدون خطوات معقدة." },
  { icon: Shield, title: "الثقة", desc: "نحرص على تقديم بيئة آمنة وشفافة تضمن وضوح المعلومات وتقليل المخاطر." },
  { icon: Zap, title: "السرعة", desc: "نختصر الوقت بين العرض والاتفاق، ونساعد على تسريع إتمام الصفقات." },
  { icon: Brain, title: "الذكاء", desc: "نستخدم تقنيات ذكية لتحليل المشاريع، دعم التفاوض، وتحسين قرارات البيع والشراء." },
];


const whyUsItems = [
  {
    num: "1",
    title: "صفقات حقيقية… مو مجرد إعلانات",
    desc: "في \"تقبيل\"، نركّز على إتمام الصفقة، مو مجرد عرض إعلان بين آلاف الإعلانات العشوائية.",
  },
  {
    num: "2",
    title: "بيانات واضحة وموثوقة",
    desc: "نرتّب ونحلل المعلومات بحيث تكون دقيقة ومفهومة، بدون عشوائية أو نقص في التفاصيل.",
  },
  {
    num: "3",
    title: "تسعير منطقي ومدروس",
    desc: "نساعدك تفهم القيمة الحقيقية للمشروع، ونكشف الأسعار غير الواقعية.",
  },
  {
    num: "4",
    title: "إدخال بيانات سريع وسهل",
    desc: "نختصر عليك الوقت بخطوات بسيطة وواضحة، بدون تعقيد أو نماذج طويلة ومشتتة.",
  },
  {
    num: "5",
    title: "تجربة منظمة وواضحة",
    desc: "كل شيء في المنصة مصمم ليكون واضح، مرتب، وسهل الاستخدام من أول خطوة حتى إتمام الصفقة.",
  },
];

const AboutPage = () => {
  useSEO({ title: "من نحن — سوق تقبيل | شركة عين جساس للمقاولات", description: "تعرّف على منصة سوق تقبيل — أول منصة سعودية بالذكاء الاصطناعي لتقبيل المشاريع التجارية، مملوكة لشركة عين جساس", canonical: "/about" });
  const [liveStats, setLiveStats] = useState({ listings: 0, deals: 0, completionRate: 0 });

  const fetchStats = async () => {
    const [listingsRes, dealsRes, completedRes] = await Promise.all([
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published").is("deleted_at", null),
      supabase.from("deals").select("id", { count: "exact", head: true }),
      supabase.from("deals").select("id", { count: "exact", head: true }).in("status", ["completed", "finalized"]),
    ]);
    const total = dealsRes.count ?? 0;
    const completed = completedRes.count ?? 0;
    setLiveStats({
      listings: listingsRes.count ?? 0,
      deals: total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  };

  useEffect(() => {
    fetchStats();
    const channel = supabase
      .channel("about-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const stats = [
    { value: liveStats.listings.toLocaleString(), label: "فرصة معروضة" },
    { value: liveStats.deals.toLocaleString(), label: "صفقة نشطة" },
    { value: `${liveStats.completionRate}%`, label: "معدل إتمام الصفقات" },
  ];

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Hero / Intro */}
      <section className="py-10 md:py-14">
        <div className="container max-w-2xl mx-auto text-center animate-fade-in">
          <div className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-soft">
            <img src={logoIcon} alt="سوق تقبيل" className="w-[4.5rem] h-[4.5rem] object-contain" />
          </div>
          <h1 className="text-xl md:text-2xl font-semibold mb-3">من نحن</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            نحن منصة "تقبيل"، نربط بين البائعين والمشترين بطريقة ذكية وسريعة وآمنة، لنحوّل فرص البيع والشراء إلى صفقات ناجحة بدون تعقيد.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            نؤمن أن كل مشروع أو أصل له قيمة حقيقية، ومهمتنا هي إظهار هذه القيمة وربطها بالشخص المناسب في الوقت المناسب.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-10 md:py-12 border-t border-border/30">
        <div className="container max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {values.map((v, i) => (
              <div
                key={v.title}
                className="text-center px-4 py-5 rounded-2xl bg-card/50 border border-border/20 shadow-soft hover:shadow-soft-hover hover:-translate-y-0.5 transition-all duration-300 animate-reveal"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <v.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-1.5">{v.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ownership */}
      <section className="py-10 md:py-12 border-t border-border/30">
        <div className="container max-w-2xl mx-auto text-center space-y-3 animate-reveal" style={{ animationDelay: "100ms" }}>
          <p className="text-sm text-muted-foreground leading-relaxed">
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
          <p className="text-xs text-muted-foreground/70">
            السجل التجاري: <span className="font-medium text-foreground/80" dir="ltr">7017628152</span>
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 border-t border-border/30">
        <div className="container max-w-2xl mx-auto">
          <div className="grid grid-cols-3 gap-4 text-center">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="animate-reveal"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="text-lg md:text-xl font-semibold gradient-text">{s.value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-12 md:py-16 border-t border-border/30">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-8 animate-reveal">
            <h2 className="text-lg md:text-xl font-semibold mb-3">ليش تقبيل؟</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
              لأنك ما تحتاج منصة تعرض مشروعك فقط…
              <br />
              <span className="font-medium text-foreground">تحتاج منصة تساعدك تبيعه فعليًا.</span>
            </p>
          </div>

          <div className="space-y-3 md:space-y-4">
            {whyUsItems.map((item, i) => (
              <div
                key={item.num}
                className="flex gap-3 md:gap-4 items-start bg-card rounded-xl p-4 md:p-5 shadow-soft hover:shadow-soft-hover hover:-translate-y-0.5 transition-all duration-300 animate-reveal"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                  {item.num}
                </span>
                <div>
                  <h3 className="font-semibold text-sm mb-0.5">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing + CTA */}
      <section className="py-12 md:py-16 border-t border-border/30">
        <div className="container max-w-2xl mx-auto text-center animate-reveal">
          <p className="text-sm text-muted-foreground mb-1">إذا عندك مشروع… أو تبحث عن فرصة</p>
          <p className="text-base md:text-lg font-semibold mb-6">ابدأ الآن وخلك أقرب لصفقة ناجحة.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="default" className="gradient-primary text-primary-foreground rounded-xl shadow-soft active:scale-[0.98] transition-transform">
              <Link to="/create-listing?new=1">ابدأ الآن</Link>
            </Button>
            <Button asChild variant="outline" size="default" className="rounded-xl border-border/60 hover:bg-accent/50 active:scale-[0.98] transition-transform">
              <Link to="/marketplace">تصفح المشاريع</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
