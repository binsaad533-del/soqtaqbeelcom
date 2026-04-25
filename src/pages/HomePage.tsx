import { Link } from "react-router-dom";
import { safeJsonLd } from "@/lib/security";
import { ArrowLeft, MapPin, Eye, Star } from "lucide-react";
import AiStar from "@/components/AiStar";
import AiInlineStar from "@/components/AiInlineStar";
import { Button } from "@/components/ui/button";
import logoIconGold from "@/assets/logo-icon-gold.png";
import PriceDisplay from "@/components/PriceDisplay";
import { useEffect, useRef, useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { getOrderedPhotos } from "@/lib/photoOrdering";

function useHomeStats(t: (k: string) => string) {
  const [stats, setStats] = useState([
    { value: "—", label: t("home.stats.active") },
    { value: "—", label: t("home.stats.cities") },
    { value: "—", label: t("home.stats.disclosure") },
    { value: "—", label: t("home.stats.completed") },
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
        { value: activeListings.toLocaleString("en-GB"), label: t("home.stats.active") },
        { value: uniqueCities.toLocaleString("en-GB"), label: t("home.stats.cities") },
        { value: `${avgDisclosure}%`, label: t("home.stats.disclosure") },
        { value: completedDeals.toLocaleString("en-GB"), label: t("home.stats.completed") },
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
  }, [t]);

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
        .select("id, title, business_activity, city, district, price, photos, featured, cover_photo_url")
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

  const longestWord = words.reduce((a, b) => (a.length > b.length ? a : b), "");

  return (
    <span className="inline-block relative overflow-hidden align-bottom">
      {/* invisible longest word to reserve width */}
      <span className="invisible whitespace-nowrap">{longestWord}</span>
      <span
        className={`absolute inset-0 inline-flex items-center justify-start gradient-text font-semibold whitespace-nowrap ${
          animating ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
        }`}
        style={{ transition: "transform 0.4s ease, opacity 0.4s ease" }}
      >
        {words[index]}
      </span>
    </span>
  );
}

const HomePage = () => {
  const { t } = useTranslation();
  useSEO({
    title: "سوق تقبيل — تقبيل المشاريع والفرص التجارية بالذكاء الاصطناعي",
    description: "أول منصة سعودية بالذكاء الاصطناعي لتقبيل المشاريع التجارية — جرد وتقييم وتفاوض تلقائي بدون تعقيد",
    canonical: "/",
  });
  const stats = useHomeStats(t);
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
    { num: "1", title: t("home.smart.f1Title"), desc: t("home.smart.f1Desc") },
    { num: "2", title: t("home.smart.f2Title"), desc: t("home.smart.f2Desc") },
    { num: "3", title: t("home.smart.f3Title"), desc: t("home.smart.f3Desc") },
    { num: "4", title: t("home.smart.f4Title"), desc: t("home.smart.f4Desc") },
    { num: "5", title: t("home.smart.f5Title"), desc: t("home.smart.f5Desc") },
    { num: "6", title: t("home.smart.f6Title"), desc: t("home.smart.f6Desc") },
  ];

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "سوق تقبيل",
    alternateName: "Soq Taqbeel",
    url: "https://soqtaqbeel.com",
    logo: "https://soqtaqbeel.com/logo-icon-gold.png",
    description: t("home.orgDesc"),
    foundingDate: "2024",
    areaServed: { "@type": "Country", name: "Saudi Arabia" },
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: "https://soqtaqbeel.com/contact",
    },
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "سوق تقبيل",
    url: "https://soqtaqbeel.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://soqtaqbeel.com/marketplace?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }} />
      <section className="bg-background py-20 md:py-32 relative overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto text-center animate-reveal">
            <div className="flex flex-col items-center mb-8 -mt-4">
              <img src={logoIconGold} alt={t("home.logoAlt")} loading="lazy" className="h-28 md:h-36 w-auto" />
              <span className="text-lg md:text-xl font-semibold tracking-[0.3em] text-foreground/70 mt-3 uppercase">SOQ TAQBEEL</span>
            </div>
            <p className="text-sm font-medium text-primary mb-1 tracking-wide">
              {t("home.tagline1")} <AiInlineStar size={13} /> {t("home.tagline2")}
            </p>
            <p className="text-xs text-muted-foreground mb-3 max-w-md mx-auto leading-relaxed">
              {t("home.definition")}
            </p>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-medium leading-tight mb-5" style={{ lineHeight: 1.4 }}>
              {t("home.heroTitle")}{" "}
              <RotatingWord words={t("home.heroRotating").split(",")} />
              <br />
              <span className="gradient-text">{t("home.heroAiHandles")} <AiInlineStar size={20} /></span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-4 max-w-xl mx-auto leading-relaxed">
              {t("home.heroSub")}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground/70 mb-8">
              {t("home.heroNote1")} <AiInlineStar size={11} /> {t("home.heroNote2")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="gradient-primary text-primary-foreground rounded-xl shadow-soft hover:shadow-soft-lg transition-shadow active:scale-[0.98]">
                <Link to="/create-listing?new=1">
                  {t("home.ctaList")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl border-border/60 hover:bg-accent/50 active:scale-[0.98]">
                <Link to="/marketplace">
                  {t("home.ctaBrowse")}
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
                  <h2 className="text-xl md:text-2xl font-medium">{t("home.featuredTitle")}</h2>
                </div>
                <p className="text-sm text-muted-foreground">{t("home.featuredSubtitle")}</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                <Link to="/marketplace" className="flex items-center gap-1">
                  {t("home.viewAll")}
                  <ArrowLeft size={14} strokeWidth={1.5} />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((listing, i) => {
                const photos = getOrderedPhotos(listing.photos as Record<string, string[]>, undefined, (listing as { cover_photo_url?: string | null }).cover_photo_url);
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
                          <img src={photos[0]} alt={listing.title || listing.business_activity || t("home.featuredAlt")} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <Eye size={24} className="text-muted-foreground/20" strokeWidth={1} />
                        )}
                        <span className="absolute top-2.5 right-2.5 bg-primary/90 text-primary-foreground text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <Star size={9} fill="currentColor" /> {t("home.featuredBadge")}
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="text-sm font-medium mb-1.5 group-hover:text-primary transition-colors">
                          {listing.title || listing.business_activity || t("home.businessOpportunity")}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                          <MapPin size={12} strokeWidth={1.3} />
                          {listing.district && `${listing.district}، `}{listing.city || "—"}
                        </div>
                        <div className="flex items-center justify-between pt-2.5 border-t border-border/10">
                          <span className="text-sm font-medium text-primary">
                            {listing.price ? <PriceDisplay amount={Number(listing.price)} size={10} /> : t("home.priceOnRequest")}
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
            <h2 className="text-2xl md:text-3xl font-medium mb-4">{t("home.platformTitle1")} <AiInlineStar size={18} /> {t("home.platformTitle2")}</h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {t("home.platformDesc")}
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
          <h2 className="text-2xl md:text-3xl font-medium mb-2">{t("home.ctaStartTitle")}</h2>
          <p className="text-muted-foreground mb-6">{t("home.ctaStartDesc")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground rounded-xl shadow-soft active:scale-[0.98]">
              <Link to="/create-listing?new=1">{t("home.ctaList")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl border-border/60 hover:bg-accent/50 active:scale-[0.98]">
              <Link to="/marketplace">{t("home.ctaBrowse")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
