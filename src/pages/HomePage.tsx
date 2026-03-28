import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Eye, Star } from "lucide-react";
import AiStar from "@/components/AiStar";
import AiInlineStar from "@/components/AiInlineStar";
import { Button } from "@/components/ui/button";
import logoIconGold from "@/assets/logo-icon-gold.png";
import PriceDisplay from "@/components/PriceDisplay";
import { useEffect, useRef, useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

function useHomeStats(tx: (ar: string, en: string) => string) {
  const [stats, setStats] = useState([
    { value: "—", label: tx("فرصة نشطة", "Active opportunities") },
    { value: "—", label: tx("مدينة", "Cities") },
    { value: "—", label: tx("إفصاح مكتمل", "Disclosure complete") },
    { value: "—", label: tx("صفقة مكتملة", "Completed deals") },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      const [listingsRes, citiesRes, dealsRes, disclosureRes] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("listings").select("city").eq("status", "published").not("city", "is", null),
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("listings").select("disclosure_score").eq("status", "published").not("disclosure_score", "is", null),
      ]);

      if (cancelled) return;

      const activeListings = listingsRes.count ?? 0;
      const uniqueCities = new Set((citiesRes.data ?? []).map((r: any) => r.city)).size;
      const completedDeals = dealsRes.count ?? 0;

      const scores = (disclosureRes.data ?? []).map((r: any) => r.disclosure_score as number);
      const avgDisclosure = scores.length > 0
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : 0;

      setStats([
        { value: activeListings.toLocaleString("en-GB"), label: tx("فرصة نشطة", "Active opportunities") },
        { value: uniqueCities.toLocaleString("en-GB"), label: tx("مدينة", "Cities") },
        { value: `${avgDisclosure}%`, label: tx("إفصاح مكتمل", "Disclosure complete") },
        { value: completedDeals.toLocaleString("en-GB"), label: tx("صفقة مكتملة", "Completed deals") },
      ]);
    }

    fetch();

    const channel = supabase
      .channel("home-stats")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "listings", filter: "status=eq.published" }, () => fetch())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "listings" }, () => fetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "deals", filter: "status=eq.completed" }, () => fetch())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "deals" }, () => fetch())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tx]);

  return stats;
}

type FeaturedListing = {
  id: string;
  title: string | null;
  business_activity: string | null;
  city: string | null;
  district: string | null;
  price: number | null;
  photos: Record<string, unknown> | null;
  featured: boolean;
};

function useFeaturedListings() {
  const [listings, setListings] = useState<FeaturedListing[]>([]);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("listings")
        .select("id, title, business_activity, city, district, price, photos, featured")
        .eq("status", "published")
        .eq("featured", true)
        .order("published_at", { ascending: false })
        .limit(6);
      if (data) setListings(data as FeaturedListing[]);
    }
    fetch();
  }, []);

  return listings;
}

function RotatingWord({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length);
        setAnimating(false);
      }, 400);
    }, 2500);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span className="inline-block relative overflow-hidden align-bottom" style={{ minWidth: "6ch" }}>
      <span
        className={`inline-block gradient-text font-semibold transition-all duration-400 ${
          animating
            ? "translate-y-full opacity-0"
            : "translate-y-0 opacity-100"
        }`}
        style={{ transition: "transform 0.4s ease, opacity 0.4s ease" }}
      >
        {words[index]}
      </span>
    </span>
  );
}

const HomePage = () => {
  useSEO({ canonical: "/" });
  const { tx } = useLanguage();
  const stats = useHomeStats(tx);
  const featured = useFeaturedListings();
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

  const smartFeatures = [
    {
      num: "1",
      title: tx("ارفع صور… والذكاء يجرد لك", "Upload photos and let AI inventory everything"),
      desc: tx(
        "بمجرد رفع صور المحل أو المشروع، الذكاء الاصطناعي يسوّي جرد كامل للأصول والمعدات تلقائيًا.",
        "Once you upload shop or business photos, AI automatically creates a full inventory of assets and equipment."
      ),
    },
    {
      num: "2",
      title: tx("تقييم استرشادي بالذكاء الاصطناعي", "AI-guided valuation via market comparisons"),
      desc: tx(
        "المنصة تحلل بيانات المشروع وتعطيك تقييماً استرشادياً بالذكاء الاصطناعي عبر مقارنات السوق.",
        "The platform analyzes business data and gives you an AI-guided indicative valuation through market comparisons."
      ),
    },
    {
      num: "3",
      title: tx("بدون تعبئة بيانات… الذكاء يكفي", "No manual forms, AI handles it"),
      desc: tx(
        "ارفع الصور والمستندات والذكاء الاصطناعي يستخرج كل البيانات المطلوبة بدون ما تكتب شيء.",
        "Upload photos and documents, and AI extracts the required data without manual entry."
      ),
    },
    {
      num: "4",
      title: tx("تفاوض ذكي داخل المنصة", "Smart negotiation inside the platform"),
      desc: tx(
        "مساعد ذكي يتفاوض معك ويقترح حلول عادلة ويساعدك توصل لأفضل صفقة.",
        "An intelligent assistant helps negotiate, suggests fair solutions, and guides both sides to a better deal."
      ),
    },
    {
      num: "5",
      title: tx("صفقات حقيقية… مو مجرد إعلانات", "Real transactions, not just listings"),
      desc: tx(
        "نركّز على إتمام الصفقة فعليًا، مو مجرد عرض إعلان بين آلاف الإعلانات.",
        "We focus on completing real deals, not just posting another listing in a crowded marketplace."
      ),
    },
    {
      num: "6",
      title: tx("تجربة منظمة من البداية للنهاية", "A guided journey from start to finish"),
      desc: tx(
        "من رفع الصور حتى توقيع الاتفاق، كل شيء واضح ومرتب في مكان واحد.",
        "From uploading images to signing the agreement, everything stays clear and organized in one place."
      ),
    },
  ];

  return (
    <div className="relative">
      <section className="bg-background py-20 md:py-32 relative overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto text-center animate-reveal">
            <div className="flex flex-col items-center mb-8 -mt-4">
              <img src={logoIconGold} alt={tx("سوق تقبيل", "Soq Taqbeel")} className="h-28 md:h-36 w-auto" />
              <span className="text-lg md:text-xl font-semibold tracking-[0.3em] text-foreground/70 mt-3 uppercase">SOQ TAQBEEL</span>
            </div>
            <p className="text-sm font-medium text-primary mb-3 tracking-wide">
              {tx("أول منصة سعودية بالذكاء الاصطناعي", "The first Saudi AI-powered platform")} <AiInlineStar size={13} /> {tx("لتقبيل المشاريع", "for business transfers")}
            </p>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-medium leading-tight mb-5" style={{ lineHeight: 1.4 }}>
              {tx("ارفع صور مشروعك…", "Upload your business photos…")}{" "}
              <RotatingWord words={tx(
                "مطعم,حلاق,مركز تجميل,ورشة,مكتب,اثاث,محطة",
                "Restaurant,Barbershop,Beauty Center,Workshop,Office,Furniture,Station"
              ).split(",")} />
              <br />
              <span className="gradient-text">{tx("والذكاء الاصطناعي يكمل الباقي", "and AI handles the rest")} <AiInlineStar size={20} /></span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-4 max-w-xl mx-auto leading-relaxed">
              {tx(
                "جرد، تقييم، بيانات، وتفاوض — كلها تلقائيًا بدون ما تكتب سطر واحد.",
                "Inventory, valuation, data extraction, and negotiation — all automated without writing a single line."
              )}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground/70 mb-8">
              {tx("فقط ارفع الصور والمستندات وخلّ الـAI", "Just upload photos and documents and let AI")} <AiInlineStar size={11} /> {tx("يشتغل عنك.", "do the heavy lifting.")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="gradient-primary text-primary-foreground rounded-xl shadow-soft hover:shadow-soft-lg transition-shadow active:scale-[0.98]">
                <Link to="/create-listing">
                  {tx("اعرض مشروعك", "List your business")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl border-border/60 hover:bg-accent/50 active:scale-[0.98]">
                <Link to="/marketplace">
                  {tx("تصفح الفرص", "Browse opportunities")}
                  <ArrowLeft size={16} strokeWidth={1.5} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

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

      {featured.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container">
            <div className="flex items-center justify-between mb-8" ref={addRevealRef} style={{ opacity: 0 }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star size={18} className="text-primary" strokeWidth={1.5} fill="currentColor" />
                  <h2 className="text-xl md:text-2xl font-medium">{tx("فرص مميزة", "Featured opportunities")}</h2>
                </div>
                <p className="text-sm text-muted-foreground">{tx("فرص مختارة بعناية لك", "Curated opportunities for you")}</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                <Link to="/marketplace" className="flex items-center gap-1">
                  {tx("عرض الكل", "View all")}
                  <ArrowLeft size={14} strokeWidth={1.5} />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((listing, i) => {
                const photos = listing.photos ? Object.values(listing.photos).flat() as string[] : [];
                return (
                  <div
                    key={listing.id}
                    ref={addRevealRef}
                    style={{ opacity: 0, animationDelay: `${i * 100}ms` }}
                  >
                    <Link
                      to={`/listing/${listing.id}`}
                      className="group bg-card rounded-2xl shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden block"
                    >
                      <div className="h-40 bg-gradient-to-br from-primary/5 to-accent/20 flex items-center justify-center relative">
                        {photos.length > 0 ? (
                          <img src={photos[0]} alt={listing.title || listing.business_activity || tx("فرصة مميزة", "Featured opportunity")} className="w-full h-full object-cover" />
                        ) : (
                          <Eye size={24} className="text-muted-foreground/20" strokeWidth={1} />
                        )}
                        <span className="absolute top-2.5 right-2.5 bg-primary/90 text-primary-foreground text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <Star size={9} fill="currentColor" /> {tx("مميز", "Featured")}
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="text-sm font-medium mb-1.5 group-hover:text-primary transition-colors">
                          {listing.title || listing.business_activity || tx("فرصة تقبيل", "Business opportunity")}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                          <MapPin size={12} strokeWidth={1.3} />
                          {listing.district && `${listing.district}، `}{listing.city || "—"}
                        </div>
                        <div className="flex items-center justify-between pt-2.5 border-t border-border/10">
                          <span className="text-sm font-medium text-primary">
                            {listing.price ? <PriceDisplay amount={Number(listing.price)} size={10} /> : tx("السعر عند التواصل", "Price on request")}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-24 border-t border-border/50">
        <div className="container">
          <div className="text-center mb-12" ref={addRevealRef} style={{ opacity: 0 }}>
            <h2 className="text-2xl md:text-3xl font-medium mb-4">{tx("منصة بالذكاء الاصطناعي", "An AI-powered platform")} <AiInlineStar size={18} /> {tx("لإتمام الصفقات… مو مجرد عرض", "built to close deals, not just display listings")}</h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {tx(
                "كل الأدوات اللي تحتاجها لتقييم، عرض، وتوثيق الصفقات في مكان واحد — بطريقة ذكية وسريعة وواضحة.",
                "Everything you need to value, showcase, negotiate, and document deals in one smart, fast, and clear workflow."
              )}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {smartFeatures.map((item, i) => (
              <div
                key={item.num}
                ref={addRevealRef}
                style={{ opacity: 0, animationDelay: `${i * 120}ms` }}
                className="group bg-card rounded-2xl p-5 shadow-soft hover:shadow-soft-lg hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 cursor-default"
              >
                <span className="inline-flex w-8 h-8 rounded-lg bg-primary/10 text-primary items-center justify-center font-medium text-sm mb-3 group-hover:bg-gradient-to-l group-hover:from-primary group-hover:to-primary/70 group-hover:text-primary-foreground transition-all duration-300">
                  {item.num}
                </span>
                <h3 className="font-medium mb-1.5 group-hover:text-primary transition-colors duration-300">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 gradient-hero" ref={addRevealRef} style={{ opacity: 0 }}>
        <div className="container text-center">
          <AiStar size={36} className="justify-center mb-4" />
          <h2 className="text-2xl md:text-3xl font-medium mb-2">{tx("ابدأ الآن خلال 30 ثانية", "Get started in 30 seconds")}</h2>
          <p className="text-muted-foreground mb-6">{tx("سواء تبي تعرض مشروعك أو تدور فرصة… المنصة جاهزة لك", "Whether you want to list your business or discover an opportunity, the platform is ready for you")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground rounded-xl shadow-soft active:scale-[0.98]">
              <Link to="/create-listing">{tx("اعرض مشروعك", "List your business")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl border-border/60 hover:bg-accent/50 active:scale-[0.98]">
              <Link to="/marketplace">{tx("تصفح الفرص", "Browse opportunities")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
