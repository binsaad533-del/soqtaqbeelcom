import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import logoIcon from "@/assets/logo-icon-gold.png";
import {
  Store, Search, Heart, Gavel, FileText, ArrowRightLeft,
  CheckCircle, Plus, Zap, Lock, BarChart3, Award, Wallet,
  BadgeCheck, Sparkles, ShieldCheck, Eye, Landmark,
} from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

interface StageDef {
  key: string;
  icon: React.ElementType;
  hasBuyer: boolean;
  color: string;
  iconBg: string;
}

const STAGE_DEFS: StageDef[] = [
  { key: "addListing",   icon: Store,           hasBuyer: false, color: "border-primary/20",     iconBg: "bg-primary/10 text-primary" },
  { key: "verification", icon: ShieldCheck,     hasBuyer: false, color: "border-cyan-500/20",    iconBg: "bg-cyan-500/10 text-cyan-600" },
  { key: "discovery",    icon: Eye,             hasBuyer: true,  color: "border-blue-500/20",    iconBg: "bg-blue-500/10 text-blue-600" },
  { key: "interest",     icon: Heart,           hasBuyer: true,  color: "border-pink-500/20",    iconBg: "bg-pink-500/10 text-pink-600" },
  { key: "negotiation",  icon: Gavel,           hasBuyer: true,  color: "border-amber-500/20",   iconBg: "bg-amber-500/10 text-amber-600" },
  { key: "agreement",    icon: FileText,        hasBuyer: true,  color: "border-purple-500/20",  iconBg: "bg-purple-500/10 text-purple-600" },
  { key: "escrow",       icon: Landmark,        hasBuyer: true,  color: "border-sky-500/20",     iconBg: "bg-sky-500/10 text-sky-600" },
  { key: "transfer",     icon: ArrowRightLeft,  hasBuyer: true,  color: "border-emerald-500/20", iconBg: "bg-emerald-500/10 text-emerald-600" },
  { key: "closing",      icon: CheckCircle,     hasBuyer: true,  color: "border-success/20",     iconBg: "bg-success/10 text-success" },
];

const FEATURE_DEFS = [
  { key: "ai",           icon: Sparkles },
  { key: "protection",   icon: Lock },
  { key: "transparency", icon: BarChart3 },
  { key: "ratings",      icon: Award },
  { key: "commission",   icon: Wallet },
  { key: "verification", icon: BadgeCheck },
];

const HowItWorksPage = () => {
  const { t } = useTranslation();

  useSEO({
    title: t("howItWorks.seo.title"),
    description: t("howItWorks.seo.description"),
    canonical: "/how-it-works",
  });

  return (
    <div className="py-10 md:py-16">
      <div className="container max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-12 md:mb-16">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-soft animate-fade-in">
            <img src={logoIcon} alt={t("howItWorks.hero.logoAlt")} className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-3">{t("howItWorks.hero.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {t("howItWorks.hero.subtitle")}
          </p>
        </div>

        {/* Stages Timeline */}
        <div className="relative mb-16">
          <div className="absolute top-0 bottom-0 right-[27px] md:right-1/2 w-0.5 bg-border/40 -translate-x-1/2" />

          <div className="space-y-0">
            {STAGE_DEFS.map((stage, i) => {
              const Icon = stage.icon;
              const title = t(`howItWorks.stages.${stage.key}.title`);
              const sellerText = t(`howItWorks.stages.${stage.key}.seller`);
              const buyerText = stage.hasBuyer ? t(`howItWorks.stages.${stage.key}.buyer`) : "";
              return (
                <div key={stage.key} className="relative group">
                  <div className={cn(
                    "relative flex gap-4 md:gap-0 items-start",
                    i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  )}>
                    <div className="relative z-10 shrink-0 md:absolute md:right-1/2 md:translate-x-1/2">
                      <div className={cn(
                        "w-[54px] h-[54px] rounded-2xl flex items-center justify-center border-2 border-background shadow-soft transition-transform group-hover:scale-110",
                        stage.iconBg
                      )}>
                        <Icon size={22} strokeWidth={1.5} />
                      </div>
                      <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>

                    <div className={cn(
                      "flex-1 md:w-[calc(50%-40px)]",
                      i % 2 === 0 ? "md:pr-10 md:ml-auto" : "md:pl-10 md:mr-auto"
                    )}>
                      <div className={cn(
                        "rounded-2xl border bg-card p-5 md:p-6 shadow-soft hover:shadow-md transition-all",
                        stage.color
                      )}>
                        <h3 className="text-base font-semibold text-foreground mb-3">{title}</h3>
                        <div className={cn("grid gap-3", !stage.hasBuyer ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
                          <div className="rounded-xl bg-primary/[0.03] p-3">
                            <span className="text-[9px] font-bold text-primary uppercase tracking-wider">{t("howItWorks.labels.seller")}</span>
                            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{sellerText}</p>
                          </div>
                          {stage.hasBuyer && (
                            <div className="rounded-xl bg-accent/30 p-3">
                              <span className="text-[9px] font-bold text-accent-foreground uppercase tracking-wider">{t("howItWorks.labels.buyer")}</span>
                              <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{buyerText}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {i < STAGE_DEFS.length - 1 && <div className="h-4 md:h-2" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Features */}
        <div className="text-center mb-8">
          <h2 className="text-lg font-semibold mb-2">{t("howItWorks.features.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("howItWorks.features.subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-12">
          {FEATURE_DEFS.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.key} className="rounded-2xl border border-border/30 bg-card p-5 text-center hover:shadow-soft transition-all">
                <Icon size={22} strokeWidth={1.3} className="mx-auto mb-3 text-primary" />
                <div className="text-sm font-medium mb-1">{t(`howItWorks.features.${f.key}.label`)}</div>
                <div className="text-[11px] text-muted-foreground">{t(`howItWorks.features.${f.key}.desc`)}</div>
              </div>
            );
          })}
        </div>

        {/* Commission Section */}
        <div className="rounded-2xl border border-border/30 bg-card overflow-hidden mb-12">
          <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-6 md:p-8 text-center">
            <Wallet size={32} strokeWidth={1.3} className="mx-auto mb-3 text-orange-600" />
            <h2 className="text-lg font-semibold mb-2">{t("howItWorks.commission.title")}</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-5">
              {t("howItWorks.commission.subtitle")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
              <div className="rounded-xl bg-card border border-border/20 p-4">
                <p className="text-2xl font-bold text-foreground">0 <span className="text-xs font-normal text-muted-foreground">{t("howItWorks.commission.currency")}</span></p>
                <p className="text-[10px] text-muted-foreground mt-1">{t("howItWorks.commission.listingFees")}</p>
              </div>
              <div className="rounded-xl bg-card border border-border/20 p-4">
                <p className="text-2xl font-bold text-foreground">0 <span className="text-xs font-normal text-muted-foreground">{t("howItWorks.commission.currency")}</span></p>
                <p className="text-[10px] text-muted-foreground mt-1">{t("howItWorks.commission.negotiationFees")}</p>
              </div>
              <div className="rounded-xl bg-card border border-orange-500/20 p-4">
                <p className="text-2xl font-bold text-orange-600">1<span className="text-sm">%</span></p>
                <p className="text-[10px] text-muted-foreground mt-1">{t("howItWorks.commission.uponCompletion")}</p>
              </div>
            </div>
            <Link to="/commission" className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:underline mt-4">
              {t("howItWorks.commission.learnMore")}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border border-primary/10 p-8 text-center">
          <Zap size={28} className="mx-auto mb-3 text-primary" strokeWidth={1.5} />
          <h2 className="text-lg font-semibold mb-2">{t("howItWorks.cta.title")}</h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            {t("howItWorks.cta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/create-listing?new=1" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:shadow-soft-lg transition-all active:scale-[0.98]">
              <Plus size={16} /> {t("howItWorks.cta.startSelling")}
            </Link>
            <Link to="/marketplace" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-card border border-border/50 text-foreground text-sm font-medium hover:shadow-soft transition-all active:scale-[0.98]">
              <Search size={16} /> {t("howItWorks.cta.browseMarket")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
