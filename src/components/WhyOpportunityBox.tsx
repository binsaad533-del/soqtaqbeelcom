import {
  Sparkles,
  Landmark,
  ShieldCheck,
  Wallet,
  Rocket,
  CheckCircle2,
  Package,
  Video,
  Star,
} from "lucide-react";
import type { Listing } from "@/hooks/useListings";

interface WhyOpportunityBoxProps {
  listing: Listing;
  analysisCache: any;
}

interface OpportunityPoint {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  source: "ai" | "auto";
}

const MIN_POINTS = 3;
const MAX_POINTS = 5;

export default function WhyOpportunityBox({ listing, analysisCache }: WhyOpportunityBoxProps) {
  const points: OpportunityPoint[] = [];

  // ─── أولوية 1: AI strengths من analysis (أيقونة Sparkles موحّدة لرؤى AI) ───
  const analysisStrengths: unknown[] = analysisCache?.analysis?.strengths || [];
  for (const s of analysisStrengths) {
    if (points.length >= MAX_POINTS) break;
    if (typeof s === "string" && s.trim()) {
      points.push({ icon: Sparkles, text: s.trim(), source: "ai" });
    }
  }

  // ─── أولوية 2: Trust score strengths (نفس أيقونة Sparkles) ───
  const trustStrengths: unknown[] = (listing as any)?.ai_trust_score?.strengths || [];
  for (const s of trustStrengths) {
    if (points.length >= MAX_POINTS) break;
    const text = typeof s === "string" ? s.trim() : "";
    if (text && !points.some((p) => p.text === text)) {
      points.push({ icon: Sparkles, text, source: "ai" });
    }
  }

  // ─── أولوية 3: Auto-derived (احتياطي — أيقونة مخصصة لكل نقطة) ───
  if (points.length < MAX_POINTS) {
    const auto: OpportunityPoint[] = [];

    // قوية
    const inventory = Array.isArray(listing.inventory) ? listing.inventory : [];
    const totalAssetValue = inventory.reduce((sum: number, item: any) => {
      const p = Number(item?.pricing?.price_sar) || 0;
      const q = Number(item?.quantity) || 1;
      return sum + p * q;
    }, 0);
    if (totalAssetValue > 0) {
      auto.push({
        icon: Wallet,
        text: `أصول مُسعّرة بقيمة ${totalAssetValue.toLocaleString("en-US")} ر.س`,
        source: "auto",
      });
    }
    if (listing.deal_type === "full_takeover") {
      auto.push({ icon: Rocket, text: "تشغيل فوري بدون تأسيس جديد", source: "auto" });
    }

    // متوسطة
    if (listing.municipality_license && String(listing.municipality_license).trim()) {
      auto.push({ icon: Landmark, text: "ترخيص بلدي ساري", source: "auto" });
    }
    if (listing.civil_defense_license && String(listing.civil_defense_license).trim()) {
      auto.push({ icon: ShieldCheck, text: "متوافق مع الدفاع المدني", source: "auto" });
    }
    const disclosureScore = Number((listing as any).disclosure_score) || 0;
    if (disclosureScore >= 80) {
      auto.push({
        icon: CheckCircle2,
        text: `إفصاحات شفافة (${disclosureScore}%)`,
        source: "auto",
      });
    }

    // ضعيفة
    if (inventory.length >= 10) {
      auto.push({ icon: Package, text: `جرد شامل (${inventory.length} أصل)`, source: "auto" });
    }
    if (listing.surveillance_cameras && String(listing.surveillance_cameras).trim()) {
      auto.push({ icon: Video, text: "نظام مراقبة مُركّب", source: "auto" });
    }
    if ((listing as any).featured === true) {
      auto.push({ icon: Star, text: "إعلان مختار ومميّز", source: "auto" });
    }

    for (const p of auto) {
      if (points.length >= MAX_POINTS) break;
      if (!points.some((existing) => existing.text === p.text)) {
        points.push(p);
      }
    }
  }

  // ─── شرط العرض: 3 نقاط على الأقل ───
  if (points.length < MIN_POINTS) return null;

  return (
    <section
      className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent p-5 sm:p-6"
      aria-labelledby="why-opportunity-title"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2
          id="why-opportunity-title"
          className="text-base sm:text-lg font-semibold text-foreground"
        >
          لماذا هذه الصفقة فرصة؟
        </h2>
      </div>
      <ul className="space-y-2.5">
        {points.map((point, idx) => {
          const Icon = point.icon;
          return (
            <li
              key={idx}
              className="flex items-start gap-3 text-sm text-foreground/90"
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span className="leading-relaxed">{point.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
