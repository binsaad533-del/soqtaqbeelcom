import { useState, useRef, useEffect } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Shield,
  ChevronDown, ChevronUp, Loader2, BarChart3, Target, AlertTriangle,
  CheckCircle2, Building2, Lightbulb, Download, FileText,
  ArrowUpRight, ArrowDownRight, Minus, Share2, Check,
} from "lucide-react";
import AiStar from "@/components/AiStar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import SarSymbol from "@/components/SarSymbol";
import { hasSimulationPhotos } from "@/components/SimulationOverlay";
import {
  ensurePdfFontLoaded, loadPdfLogo, loadPdfLogoIcon, generatePdfQR,
  buildPdfPageShell, buildPdfSection, buildPdfInfoGrid, buildPdfQrSection, buildPdfDisclaimer,
  createPdfMount, renderPagesToPdf, paginateSections,
  formatPdfPrice, escapeHtml, PDF_COLORS,
} from "@/lib/pdfShared";
import { useTranslation } from "react-i18next";
import { mapFeasibilityVerdictToKey } from "@/lib/condition-utils";
/* ── Types ── */
interface Scenario {
  monthlyRevenue: number;
  monthlyProfit: number;
  roiMonths: number;
  annualROI: number;
  assumptions: string;
}

interface FeasibilityStudy {
  executiveSummary: string;
  investmentOverview: {
    totalInvestment: number;
    breakdownItems: { label: string; amount: number; note?: string }[];
  };
  operationalCosts: {
    monthlyTotal: number;
    items: { label: string; monthlyCost: number; note?: string }[];
  };
  revenueProjections: {
    optimistic: Scenario;
    realistic: Scenario;
    conservative: Scenario;
  };
  competitorAnalysis: {
    summary: string;
    competitiveDensity: string;
    nearbyCount: number;
    neighborhoodCount: number;
    areaCount: number;
    avgRating?: number;
    topCompetitors?: { name: string; rating?: number; distance: number; threat: string }[];
    opportunities?: string[];
    threats?: string[];
  };
  riskAssessment: {
    overallRisk: string;
    financialRisks: string[];
    operationalRisks: string[];
    marketRisks: string[];
    regulatoryRisks?: string[];
    mitigationStrategies?: string[];
  };
  recommendations: string[];
  verdict: string;
  verdictColor: string;
  confidenceLevel: string;
  disclaimer: string;
  _meta?: { activityType: string; hasRealCompetitorData: boolean; hasRealFinancials?: boolean; generatedAt: string; dealTypeFlag?: string | null };
}

interface FeasibilityStudyPanelProps {
  listing: any;
  analysisCache: import("@/hooks/useAnalysisCache").UseAnalysisCacheReturn;
  isOwner?: boolean;
}

const VERDICT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  green: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  yellow: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  red: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20" },
};

const DENSITY_COLORS: Record<string, string> = {
  "منخفضة": "text-emerald-600 dark:text-emerald-400",
  "متوسطة": "text-amber-600 dark:text-amber-400",
  "عالية": "text-orange-600 dark:text-orange-400",
  "مشبعة": "text-red-600 dark:text-red-400",
};

const RISK_COLORS: Record<string, string> = {
  "منخفض": "text-emerald-600",
  "متوسط": "text-amber-600",
  "مرتفع": "text-orange-600",
  "مرتفع جداً": "text-red-600",
};

function formatNum(n: number): string {
  return n.toLocaleString("en-US");
}

const normalizeScenario = (
  raw: Partial<Scenario> | undefined,
  fallbackRevenue: number,
  fallbackProfit: number,
  fallbackRoiMonths: number,
  fallbackAnnualRoi: number,
  fallbackAssumptions: string,
): Scenario => ({
  monthlyRevenue: typeof raw?.monthlyRevenue === "number" ? raw.monthlyRevenue : fallbackRevenue,
  monthlyProfit: typeof raw?.monthlyProfit === "number" ? raw.monthlyProfit : fallbackProfit,
  roiMonths: typeof raw?.roiMonths === "number" ? raw.roiMonths : fallbackRoiMonths,
  annualROI: typeof raw?.annualROI === "number" ? raw.annualROI : fallbackAnnualRoi,
  assumptions: typeof raw?.assumptions === "string" && raw.assumptions.trim() ? raw.assumptions : fallbackAssumptions,
});

const getVerdictColor = (verdict: string): string => {
  if (verdict.includes("ممتاز") || verdict.includes("جيد")) return "green";
  if (verdict.includes("متوسط")) return "yellow";
  if (verdict.includes("حذر") || verdict.includes("مخاطر")) return "orange";
  return "blue";
};

const toPositiveNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasRiskyDisclosure = (value: unknown): boolean => {
  if (!hasText(value)) return false;
  const normalized = value.trim().toLowerCase();
  return !["لا يوجد", "لايوجد", "none", "n/a", "0", "false"].includes(normalized);
};

interface ActivityProfile {
  label: string;
  revenueMultiplier: number;
  revenuePerSqm: number;
  payrollBase: number;
  payrollPerSqm: number;
  utilitiesBase: number;
  utilitiesPerSqm: number;
  marketingRate: number;
  density: string;
  opportunity: string;
  marketRisk: string;
}

const DEFAULT_ACTIVITY_PROFILE: ActivityProfile = {
  label: "نشاط تجاري",
  revenueMultiplier: 0.1,
  revenuePerSqm: 280,
  payrollBase: 9000,
  payrollPerSqm: 28,
  utilitiesBase: 1800,
  utilitiesPerSqm: 8,
  marketingRate: 0.035,
  density: "متوسطة",
  opportunity: "رفع الكفاءة التشغيلية وتحسين عرض القيمة قد يزيد المبيعات خلال الأشهر الأولى.",
  marketRisk: "حساسية الطلب المحلي للموقع والسعر تتطلب متابعة شهرية للمبيعات وهوامش الربح.",
};

const ACTIVITY_PROFILES: Array<{ keywords: string[]; profile: ActivityProfile }> = [
  {
    keywords: ["مطعم", "شاورما", "كافيه", "كوفي", "مقهى", "بوفيه"],
    profile: {
      label: "نشاط ضيافة",
      revenueMultiplier: 0.14,
      revenuePerSqm: 420,
      payrollBase: 14000,
      payrollPerSqm: 45,
      utilitiesBase: 3200,
      utilitiesPerSqm: 16,
      marketingRate: 0.045,
      density: "عالية",
      opportunity: "الطلب المتكرر وبرامج الولاء والتوصيل ترفع معدل دوران المبيعات إذا كان التشغيل منظمًا.",
      marketRisk: "المنافسة عالية في أنشطة الأغذية والمشروبات وتتطلب جودة ثابتة وسرعة خدمة.",
    },
  },
  {
    keywords: ["بقالة", "سوبر", "تموينات", "ميني ماركت"],
    profile: {
      label: "تجزئة غذائية",
      revenueMultiplier: 0.12,
      revenuePerSqm: 360,
      payrollBase: 11000,
      payrollPerSqm: 30,
      utilitiesBase: 2200,
      utilitiesPerSqm: 10,
      marketingRate: 0.02,
      density: "متوسطة",
      opportunity: "تنويع الأصناف ورفع متوسط السلة الشرائية يدعم نمو الإيراد بسرعة.",
      marketRisk: "ضغط الهوامش في قطاع التجزئة يتطلب إدارة دقيقة للمخزون والهدر.",
    },
  },
  {
    keywords: ["مغسلة", "غسيل", "laundry"],
    profile: {
      label: "خدمات تشغيلية",
      revenueMultiplier: 0.09,
      revenuePerSqm: 250,
      payrollBase: 8000,
      payrollPerSqm: 22,
      utilitiesBase: 2800,
      utilitiesPerSqm: 14,
      marketingRate: 0.02,
      density: "متوسطة",
      opportunity: "العقود المتكررة مع المجمعات السكنية أو الشركات تزيد استقرار التدفقات النقدية.",
      marketRisk: "تكاليف المياه والكهرباء والصيانة قد تؤثر مباشرة على الربحية إذا لم تُضبط جيدًا.",
    },
  },
  {
    keywords: ["ورشة", "سيارات", "صيانة", "mechanic"],
    profile: {
      label: "خدمات فنية",
      revenueMultiplier: 0.11,
      revenuePerSqm: 300,
      payrollBase: 12000,
      payrollPerSqm: 26,
      utilitiesBase: 2400,
      utilitiesPerSqm: 10,
      marketingRate: 0.018,
      density: "متوسطة",
      opportunity: "الخدمات المتخصصة ورفع متوسط الفاتورة يحسنان العائد لكل عميل.",
      marketRisk: "الاعتماد على الفنيين المهرة وتوفر قطع الغيار قد يسبب تذبذبًا في التشغيل.",
    },
  },
  {
    keywords: ["صالون", "حلاقة", "تجميل", "barber"],
    profile: {
      label: "خدمات شخصية",
      revenueMultiplier: 0.12,
      revenuePerSqm: 340,
      payrollBase: 10000,
      payrollPerSqm: 32,
      utilitiesBase: 1600,
      utilitiesPerSqm: 7,
      marketingRate: 0.03,
      density: "متوسطة",
      opportunity: "الاشتراكات والحجوزات المتكررة ترفع الإشغال وتقلل تقلب الإيرادات.",
      marketRisk: "جودة الخدمة واعتماد النشاط على الكوادر عنصران حاسمان لاستمرارية الطلب.",
    },
  },
  {
    keywords: ["مصنع", "أثاث", "معمل", "تصنيع"],
    profile: {
      label: "تصنيع خفيف",
      revenueMultiplier: 0.08,
      revenuePerSqm: 220,
      payrollBase: 18000,
      payrollPerSqm: 20,
      utilitiesBase: 4200,
      utilitiesPerSqm: 18,
      marketingRate: 0.015,
      density: "منخفضة",
      opportunity: "التشغيل بعقود توريد ثابتة يرفع وضوح التدفقات النقدية ويقلل المخاطر السوقية.",
      marketRisk: "تكاليف المواد الخام والطاقة قد تؤثر على هامش الربح بشكل مباشر.",
    },
  },
  {
    keywords: ["جوال", "إلكترون", "تقنية", "هواتف"],
    profile: {
      label: "تجزئة إلكترونيات",
      revenueMultiplier: 0.1,
      revenuePerSqm: 310,
      payrollBase: 9500,
      payrollPerSqm: 18,
      utilitiesBase: 1400,
      utilitiesPerSqm: 6,
      marketingRate: 0.028,
      density: "عالية",
      opportunity: "الملحقات والخدمات الإضافية ترفع هامش الربح أكثر من بيع الأجهزة وحده.",
      marketRisk: "تغير الأسعار السريع في سوق الإلكترونيات قد يضغط على تقييم المخزون.",
    },
  },
  {
    keywords: ["تدريب", "تعليم", "أكاديمية", "دورات"],
    profile: {
      label: "خدمات تعليمية",
      revenueMultiplier: 0.09,
      revenuePerSqm: 240,
      payrollBase: 11000,
      payrollPerSqm: 24,
      utilitiesBase: 1500,
      utilitiesPerSqm: 6,
      marketingRate: 0.04,
      density: "متوسطة",
      opportunity: "العقود المؤسسية والبرامج المتخصصة تعزز الإيراد وتدعم الاستمرارية.",
      marketRisk: "الطلب يرتبط بسمعة المركز وجودة المحتوى وقد يتأثر بالموسمية.",
    },
  },
  {
    keywords: ["توصيل", "تطبيق", "app", "منصة"],
    profile: {
      label: "خدمة رقمية",
      revenueMultiplier: 0.07,
      revenuePerSqm: 120,
      payrollBase: 13000,
      payrollPerSqm: 8,
      utilitiesBase: 1200,
      utilitiesPerSqm: 4,
      marketingRate: 0.06,
      density: "عالية",
      opportunity: "توسيع قاعدة المستخدمين وتحسين الاحتفاظ ينعكسان سريعًا على قيمة الأصل الرقمي.",
      marketRisk: "اكتساب العملاء مكلف والمنافسة الرقمية تتطلب إنفاقًا تسويقيًا مستمرًا.",
    },
  },
];

const getActivityProfile = (listing: any): ActivityProfile => {
  const content = [listing?.business_activity, listing?.title, listing?.category]
    .filter(hasText)
    .join(" ")
    .toLowerCase();

  return ACTIVITY_PROFILES.find(({ keywords }) =>
    keywords.some((keyword) => content.includes(keyword.toLowerCase())),
  )?.profile || DEFAULT_ACTIVITY_PROFILE;
};

const buildEstimatedFeasibilityStudy = (listing: any): FeasibilityStudy | null => {
  if (!listing || typeof listing !== "object") return null;

  const profile = getActivityProfile(listing);
  const price = toPositiveNumber(listing.price, 120000);
  const area = toPositiveNumber(listing.area_sqm, 90);
  const monthlyRent = Math.round(
    toPositiveNumber(listing.annual_rent) > 0
      ? toPositiveNumber(listing.annual_rent) / 12
      : Math.max(3500, price * 0.007),
  );

  const payroll = Math.round(profile.payrollBase + area * profile.payrollPerSqm);
  const utilities = Math.round(profile.utilitiesBase + area * profile.utilitiesPerSqm);
  const marketing = Math.round(Math.max(1200, price * profile.marketingRate * 0.1));
  const misc = Math.round(Math.max(1500, monthlyRent * 0.12));
  const monthlyCosts = monthlyRent + payroll + utilities + marketing + misc;

  let monthlyRevenue = Math.round(
    Math.max(price * profile.revenueMultiplier, area * profile.revenuePerSqm, monthlyRent * 3.4),
  );
  if (monthlyRevenue <= monthlyCosts) {
    monthlyRevenue = Math.round(monthlyCosts * 1.22);
  }

  const monthlyProfit = Math.max(2500, monthlyRevenue - monthlyCosts);
  const transferCosts = Math.round(Math.max(6000, price * 0.04));
  const setupCosts = Math.round(Math.max(5000, price * 0.03));
  const workingCapital = Math.round(Math.max(monthlyCosts * 1.5, 15000));
  const totalInvestment = price + transferCosts + setupCosts + workingCapital;
  const roiMonths = Math.max(12, Math.min(36, Math.ceil(totalInvestment / monthlyProfit)));
  const annualROI = Math.max(8, Math.round((monthlyProfit * 12 / totalInvestment) * 100));

  const realistic = normalizeScenario(undefined, monthlyRevenue, monthlyProfit, roiMonths, annualROI, "يعكس أداءً متوازنًا وفق السعر المعروض وتكاليف التشغيل التقديرية.");
  const optimistic = normalizeScenario(undefined, Math.round(monthlyRevenue * 1.18), Math.round(monthlyProfit * 1.22), Math.max(12, roiMonths - 4), Math.round(annualROI * 1.15), "يفترض تحسين التشغيل ورفع التحويل أو متوسط الفاتورة.");
  const conservative = normalizeScenario(undefined, Math.round(monthlyRevenue * 0.88), Math.round(monthlyProfit * 0.72), Math.min(36, roiMonths + 6), Math.max(6, Math.round(annualROI * 0.78)), "يفترض تباطؤ الطلب وارتفاعًا محدودًا في التكاليف.");

  const financialRisks = [
    !hasText(listing?.lease_remaining) ? "مدة الإيجار المتبقية غير واضحة وتحتاج تحقق قبل الإتمام." : null,
    hasRiskyDisclosure(listing?.liabilities) ? `وجود التزامات مذكورة يتطلب تدقيقًا ماليًا تفصيليًا (${listing.liabilities}).` : null,
    hasRiskyDisclosure(listing?.overdue_rent) ? "وجود متأخرات إيجار محتملة قد يؤثر على رأس المال العامل بعد الاستحواذ." : null,
    hasRiskyDisclosure(listing?.overdue_salaries) ? "وجود متأخرات رواتب محتملة يستلزم حصر الالتزامات بدقة قبل التوقيع." : null,
  ].filter(Boolean) as string[];

  const regulatoryRisks = [
    !hasText(listing?.municipality_license) ? "حالة رخصة البلدية غير موثقة في الإعلان الحالي." : null,
    !hasText(listing?.civil_defense_license) ? "بيانات السلامة والدفاع المدني غير مكتملة وتحتاج مراجعة." : null,
  ].filter(Boolean) as string[];

  const operationalRisks = [
    !hasText(listing?.surveillance_cameras) ? "جاهزية أنظمة المراقبة والحماية غير موضحة بالكامل." : null,
    area < 60 ? "المساحة المحدودة قد تقيد التوسع أو تحسين تجربة التشغيل." : null,
    profile.marketRisk,
  ].filter(Boolean) as string[];

  const marketRisks = [
    `${profile.label} في ${listing?.district || listing?.city || "المنطقة المحددة"} يحتاج مراجعة ميدانية للتأكد من كثافة المنافسين وحجم الطلب الفعلي.`,
    listing?.city ? `القوة الشرائية في ${listing.city} عامل مؤثر على سرعة الاسترداد ويجب التحقق منها ميدانيًا.` : null,
  ].filter(Boolean) as string[];

  const recommendations = [
    `التحقق من الأداء الفعلي لآخر 3-6 أشهر قبل الإتمام النهائي لأن فترة الاسترداد المقدرة تبلغ ${roiMonths} شهرًا.`,
    !hasText(listing?.municipality_license) || !hasText(listing?.civil_defense_license)
      ? "استكمال التراخيص النظامية قبل الإغلاق لتقليل مخاطر التعطل بعد الاستحواذ."
      : "مراجعة سريان التراخيص ومطابقتها للنشاط قبل نقل التشغيل.",
    hasRiskyDisclosure(listing?.liabilities) || hasRiskyDisclosure(listing?.overdue_rent) || hasRiskyDisclosure(listing?.overdue_salaries)
      ? "إعداد كشف التزامات نهائي وتضمينه ضمن شروط الصفقة قبل السداد."
      : "تأكيد خلو النشاط من الالتزامات غير المدرجة ضمن مستندات التسليم.",
    profile.opportunity,
  ];

  const verdict = roiMonths <= 18 ? "استثمار جيد" : roiMonths <= 28 ? "استثمار متوسط" : "مقبولة مع حذر";
  const competitiveDensity = profile.density;
  const nearbyCount = competitiveDensity === "عالية" ? 6 : competitiveDensity === "متوسطة" ? 4 : 2;
  const neighborhoodCount = nearbyCount + 4;
  const areaCount = neighborhoodCount + 6;
  const activity = listing?.business_activity || listing?.category || profile.label;
  const district = listing?.district ? ` في ${listing.district}` : "";
  const city = listing?.city ? `، ${listing.city}` : "";

  return {
    executiveSummary: `تعكس المؤشرات الأولية أن ${activity}${district}${city} يمكنه تحقيق ربح تشغيلي شهري تقديري بنحو ${formatNum(monthlyProfit)} مع فترة استرداد تقارب ${roiMonths} شهرًا، اعتمادًا على سعر الطلب الحالي ${formatNum(price)} وهيكل تشغيل تقديري مستمد من بيانات الإعلان المتاحة.`,
    investmentOverview: {
      totalInvestment,
      breakdownItems: [
        { label: "سعر الشراء", amount: price, note: "القيمة المعروضة في الإعلان" },
        { label: "تكاليف نقل وتجهيز", amount: transferCosts + setupCosts, note: "إجراءات وتشغيل أولي" },
        { label: "رأس مال عامل", amount: workingCapital, note: "لتغطية الأشهر الأولى" },
      ],
    },
    operationalCosts: {
      monthlyTotal: monthlyCosts,
      items: [
        { label: "الإيجار الشهري التقديري", monthlyCost: monthlyRent, note: hasText(listing?.annual_rent) ? "مستند إلى الإيجار السنوي" : "تقدير من سعر الصفقة" },
        { label: "رواتب وتشغيل", monthlyCost: payroll, note: `تقدير حسب المساحة (${formatNum(area)} م²)` },
        { label: "خدمات وطاقة", monthlyCost: utilities },
        { label: "تسويق ومصاريف متغيرة", monthlyCost: marketing + misc },
      ],
    },
    revenueProjections: {
      optimistic,
      realistic,
      conservative,
    },
    competitorAnalysis: {
      summary: `تم توليد هذا التقدير تلقائيًا من موقع الإعلان ونوع النشاط، ويشير إلى منافسة ${competitiveDensity.toLowerCase()} نسبيًا لقطاع ${activity} مع حاجة لزيارة ميدانية للتحقق من جودة المنافسين وحركة العملاء الفعلية.`,
      competitiveDensity,
      nearbyCount,
      neighborhoodCount,
      areaCount,
      opportunities: [
        profile.opportunity,
        listing?.district ? `الموقع داخل ${listing.district} قد يدعم الوصول السريع للعملاء المستهدفين إذا كان الظهور التجاري جيدًا.` : "تحسين تجربة العميل والهوية التشغيلية يمكن أن يرفع معدل التحويل في الموقع الحالي.",
      ],
      threats: [
        profile.marketRisk,
        competitiveDensity === "عالية" ? "الضغط السعري من المنافسين القريبين قد يبطئ الوصول إلى نقطة التعادل." : "نجاح النشاط يعتمد على تسويق مستمر للحفاظ على زخم الطلب.",
      ],
    },
    riskAssessment: {
      overallRisk: roiMonths <= 18 ? "منخفض" : roiMonths <= 28 ? "متوسط" : "مرتفع",
      financialRisks,
      operationalRisks,
      marketRisks,
      regulatoryRisks,
      mitigationStrategies: [
        "مراجعة العقود والتراخيص والمستندات التشغيلية قبل الإغلاق النهائي.",
        "مطابقة الإيرادات الفعلية مع نقاط البيع أو الكشوف المحاسبية لآخر عدة أشهر.",
        "تخصيص رأس مال عامل يكفي لتغطية الأشهر الأولى بعد الاستحواذ.",
      ],
    },
    recommendations,
    verdict,
    verdictColor: getVerdictColor(verdict),
    confidenceLevel: "متوسط",
    disclaimer: "هذه الدراسة تقديرية مولدة تلقائيًا من بيانات الإعلان الحالية وتهدف لدعم التقييم الأولي فقط، ولا تغني عن الفحص المالي والقانوني والميداني قبل اتخاذ القرار النهائي.",
    _meta: {
      activityType: activity,
      hasRealCompetitorData: false,
      generatedAt: new Date().toISOString(),
    },
  };
};

const normalizeFeasibilityStudy = (raw: any, listing: any): FeasibilityStudy | null => {
  if (!raw || typeof raw !== "object") return null;

  const listingPrice = typeof listing?.price === "number" ? listing.price : 0;
  const baseRevenue = typeof raw.monthly_revenue === "number" ? raw.monthly_revenue : 0;
  const baseProfit = typeof raw.monthly_profit === "number" ? raw.monthly_profit : 0;
  const baseExpenses = typeof raw.monthly_expenses === "number" ? raw.monthly_expenses : 0;
  const basePayback = typeof raw.payback_months === "number" ? raw.payback_months : 24;
  const annualRoi = typeof raw.roi_percentage === "number" ? raw.roi_percentage : 0;
  const totalInvestment = raw.investmentOverview?.totalInvestment
    ?? raw.total_investment
    ?? Math.round(listingPrice * 1.1);
  const verdict = typeof raw.verdict === "string" && raw.verdict.trim()
    ? raw.verdict
    : typeof raw.recommendation === "string" && raw.recommendation.trim()
      ? raw.recommendation
      : "استثمار متوسط";
  const recommendations = Array.isArray(raw.recommendations) && raw.recommendations.length > 0
    ? raw.recommendations.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
    : [
        typeof raw.recommendation === "string" ? raw.recommendation : "مراجعة العقود والالتزامات قبل الإتمام",
        "التحقق الميداني من الأصول والجاهزية التشغيلية",
      ].filter(Boolean) as string[];

  return {
    executiveSummary:
      raw.executiveSummary ||
      raw.summary ||
      "هذه دراسة جدوى محفوظة مسبقاً وتعتمد على بيانات الإعلان الحالية.",
    investmentOverview: {
      totalInvestment,
      breakdownItems: Array.isArray(raw.investmentOverview?.breakdownItems) && raw.investmentOverview.breakdownItems.length > 0
        ? raw.investmentOverview.breakdownItems
        : [
            { label: "سعر الشراء", amount: listingPrice, note: "قيمة الأصل المعروض" },
            { label: "تكاليف نقل وتشغيل أولية", amount: Math.round(totalInvestment * 0.05), note: "رسوم وتجهيزات" },
            { label: "رأس مال عامل", amount: Math.max(5000, Math.round(totalInvestment * 0.05)), note: "سيولة الأشهر الأولى" },
          ],
    },
    operationalCosts: {
      monthlyTotal: raw.operationalCosts?.monthlyTotal ?? baseExpenses,
      items: Array.isArray(raw.operationalCosts?.items) && raw.operationalCosts.items.length > 0
        ? raw.operationalCosts.items
        : [
            { label: "إيجار ورواتب وتشغيل", monthlyCost: baseExpenses || Math.round((listing?.annual_rent || 0) / 12), note: "تقدير شهري" },
          ],
    },
    revenueProjections: {
      optimistic: normalizeScenario(raw.revenueProjections?.optimistic, Math.round(baseRevenue * 1.15), Math.round(baseProfit * 1.2), Math.max(12, basePayback - 4), Math.round(annualRoi * 1.1), "يفترض تحسن التشغيل وزيادة الطلب."),
      realistic: normalizeScenario(raw.revenueProjections?.realistic, baseRevenue, baseProfit, basePayback, annualRoi, "يفترض استمرار الأداء الحالي دون توسع كبير."),
      conservative: normalizeScenario(raw.revenueProjections?.conservative, Math.round(baseRevenue * 0.85), Math.max(0, Math.round(baseProfit * 0.7)), basePayback + 6, Math.max(0, Math.round(annualRoi * 0.75)), "يفترض تباطؤ الطلب وارتفاع بعض التكاليف."),
    },
    competitorAnalysis: {
      summary: raw.competitorAnalysis?.summary || raw.summary || "المنافسة تعتمد على الحي والنشاط وتحتاج زيارة ميدانية لتأكيد الكثافة.",
      competitiveDensity: raw.competitorAnalysis?.competitiveDensity || raw.competition_level || "متوسطة",
      nearbyCount: raw.competitorAnalysis?.nearbyCount ?? 0,
      neighborhoodCount: raw.competitorAnalysis?.neighborhoodCount ?? 0,
      areaCount: raw.competitorAnalysis?.areaCount ?? 0,
      avgRating: raw.competitorAnalysis?.avgRating,
      topCompetitors: Array.isArray(raw.competitorAnalysis?.topCompetitors) ? raw.competitorAnalysis.topCompetitors : [],
      opportunities: Array.isArray(raw.competitorAnalysis?.opportunities) ? raw.competitorAnalysis.opportunities : (Array.isArray(raw.opportunities) ? raw.opportunities : []),
      threats: Array.isArray(raw.competitorAnalysis?.threats) ? raw.competitorAnalysis.threats : (Array.isArray(raw.risks) ? raw.risks : []),
    },
    riskAssessment: {
      overallRisk: raw.riskAssessment?.overallRisk || (raw.competition_level === "عالي" ? "متوسط" : "منخفض"),
      financialRisks: Array.isArray(raw.riskAssessment?.financialRisks) ? raw.riskAssessment.financialRisks : (Array.isArray(raw.risks) ? raw.risks.slice(0, 2) : []),
      operationalRisks: Array.isArray(raw.riskAssessment?.operationalRisks) ? raw.riskAssessment.operationalRisks : [],
      marketRisks: Array.isArray(raw.riskAssessment?.marketRisks) ? raw.riskAssessment.marketRisks : (Array.isArray(raw.risks) ? raw.risks.slice(2) : []),
      regulatoryRisks: Array.isArray(raw.riskAssessment?.regulatoryRisks) ? raw.riskAssessment.regulatoryRisks : [],
      mitigationStrategies: Array.isArray(raw.riskAssessment?.mitigationStrategies) ? raw.riskAssessment.mitigationStrategies : ["مراجعة العقود والتراخيص", "اختبار الأداء المالي الفعلي قبل الإتمام"],
    },
    recommendations,
    verdict,
    verdictColor: raw.verdictColor || getVerdictColor(verdict),
    confidenceLevel: raw.confidenceLevel || "متوسط",
    disclaimer: raw.disclaimer || "هذه الدراسة تقديرية ومعدة لأغراض استرشادية ولا تغني عن الفحص المالي والقانوني والميداني.",
    _meta: {
      activityType: raw._meta?.activityType || listing?.business_activity || listing?.category || "نشاط تجاري",
      hasRealCompetitorData: Boolean(raw._meta?.hasRealCompetitorData),
      generatedAt: raw._meta?.generatedAt || new Date().toISOString(),
    },
  };
};

const resolveFeasibilityStudy = (listing: any, raw?: any): FeasibilityStudy | null =>
  normalizeFeasibilityStudy(raw, listing) || buildEstimatedFeasibilityStudy(listing);

const FeasibilityStudyPanel = ({ listing, analysisCache, isOwner }: FeasibilityStudyPanelProps) => {
  const { t, i18n } = useTranslation();
  const isArabic = (i18n.language || "ar").toLowerCase() === "ar";
  const [study, setStudy] = useState<FeasibilityStudy | null>(() =>
    isArabic ? resolveFeasibilityStudy(listing, analysisCache.cachedFeasibility) : null,
  );
  const [loading, setLoading] = useState(false);
  // If we already have a study from initialization, skip loading state entirely
  const [loadingCache, setLoadingCache] = useState(() =>
    isArabic ? !resolveFeasibilityStudy(listing, analysisCache.cachedFeasibility) : false,
  );
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(analysisCache.cacheAge || null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(analysisCache.analysisUpdatedAt || analysisCache.cacheAge || null);
  const [copied, setCopied] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: false,
    investment: false,
    costs: false,
    revenue: false,
    competitors: false,
    risks: false,
    recommendations: false,
  });
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isSimulation = hasSimulationPhotos(listing?.photos as Record<string, unknown> | null | undefined);

  // Auto-scroll to panel if URL has #feasibility hash
  useEffect(() => {
    if (window.location.hash === "#feasibility" && panelRef.current) {
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 500);
    }
  }, [study]);

  useEffect(() => {
    if (!isArabic) return;
    const immediateStudy = resolveFeasibilityStudy(listing, analysisCache.cachedFeasibility);
    setStudy(immediateStudy);
    setCachedAt(analysisCache.cacheAge || immediateStudy?._meta?.generatedAt || null);
    setLastUpdatedAt(analysisCache.analysisUpdatedAt || analysisCache.cacheAge || immediateStudy?._meta?.generatedAt || null);
  }, [listing?.id, isArabic]);

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Check if refresh is allowed (24h cooldown).
  // For non-Arabic languages, bypass the cooldown — cached study is Arabic-only,
  // so the user must be allowed to regenerate in their language.
  const canRefresh = (() => {
    const lang = (i18n.language || "ar").toLowerCase();
    if (lang !== "ar") return true;
    if (!lastUpdatedAt) return true;
    const age = Date.now() - new Date(lastUpdatedAt).getTime();
    return age >= 24 * 60 * 60 * 1000;
  })();

  // Load cached study on mount - NO edge function call
  // Bypass cache when user language is not Arabic (cached studies are Arabic-only).
  useEffect(() => {
    if (!listing?.id) { setLoadingCache(false); return; }
    const lang = (i18n.language || "ar").toLowerCase();
    if (lang !== "ar") {
      setLoadingCache(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("feasibility_studies")
          .select("study_data, created_at, last_updated_at")
          .eq("listing_id", listing.id)
          .maybeSingle();
        if (data?.study_data) {
          setStudy(resolveFeasibilityStudy(listing, data.study_data));
          setCachedAt(data.created_at);
          setLastUpdatedAt((data as any).last_updated_at || data.created_at);
          setExpandedSections({ summary: false, investment: false, costs: false, revenue: false, competitors: false, risks: false, recommendations: false });
        }
      } catch { /* ignore */ }
      setLoadingCache(false);
    })();
  }, [listing?.id, i18n.language]);

  // Auto-trigger study generation when language is non-Arabic and no study yet
  // (cached/estimated study is Arabic-only — user needs it in their selected language).
  useEffect(() => {
    if (isArabic) return;
    if (study) return;
    if (loading || loadingCache) return;
    if (autoTriggered) return;
    if (isSimulation) return;
    if (!listing?.id) return;
    setAutoTriggered(true);
    runStudy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArabic, study, loading, loadingCache, autoTriggered, isSimulation, listing?.id]);

  const runStudy = async () => {
    if (isSimulation) {
      toast("هذا إعلان محاكاة ويعرض دراسة جدوى محفوظة مسبقاً.");
      return;
    }

    if (!canRefresh) {
      toast.error("يمكن التحديث مرة كل 24 ساعة فقط");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { invokeWithRetry } = await import("@/lib/invokeWithRetry");
      const { data, error: fnError } = await invokeWithRetry("feasibility-study", {
        listing,
        language: i18n.language || "ar",
      });
      if (fnError) {
        const response = (fnError as any)?.context;
        let message = "تعذّر إعداد الدراسة حالياً، يرجى المحاولة بعد قليل";
        if (response instanceof Response) {
          try {
            const payload = await response.json();
            if (typeof payload?.error === "string" && payload.error.trim()) {
              message = payload.error;
            }
          } catch {
            // ignore response parsing failure
          }
        }
        throw new Error(message);
      }
      if (!data?.success) throw new Error(data?.error || "فشل في إنشاء الدراسة");
      setStudy(resolveFeasibilityStudy(listing, data.study));
      const now = new Date().toISOString();
      setCachedAt(now);
      setLastUpdatedAt(now);
      setExpandedSections({ summary: false, investment: false, costs: false, revenue: false, competitors: false, risks: false, recommendations: false });

      // Save to unified cache + database
      await analysisCache.saveFeasibility(data.study);
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase.from("feasibility_studies").upsert({
          listing_id: listing.id,
          requested_by: userData.user.id,
          study_data: data.study,
          last_updated_at: now,
        } as any, { onConflict: "listing_id" });
      }
      toast.success("تم تحديث دراسة الجدوى بنجاح");
    } catch (err: any) {
      toast.error(t("dealCheck.reanalyze"));
      setError(err.message || t("dealCheck.reanalyze"));
    } finally {
      setLoading(false);
    }
  };

  const shareStudy = async () => {
    const url = `${window.location.origin}/listing/${listing.id}#feasibility`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `دراسة جدوى: ${listing.title || "فرصة استثمارية"}`,
          text: `اطّلع على دراسة الجدوى الاقتصادية لـ ${listing.title || "هذه الفرصة"}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("تم نسخ رابط الدراسة");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("تم نسخ رابط الدراسة");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current || !study) return;
    setPdfLoading(true);
    try {
      const [logoBase64, logoIconBase64, qrDataUrl] = await Promise.all([
        loadPdfLogo(),
        loadPdfLogoIcon(),
        generatePdfQR(`${window.location.origin}/listing/${listing.id}#feasibility`),
        ensurePdfFontLoaded(),
      ]);

      const mount = createPdfMount();
      const sections: HTMLElement[] = [];

      // Executive Summary
      sections.push(buildPdfSection("الملخص التنفيذي", `
        <div style="font-size:12px;line-height:2;color:${PDF_COLORS.text};">${escapeHtml(study.executiveSummary)}</div>
      `, true));

      // Investment Overview
      sections.push(buildPdfSection("نظرة على الاستثمار", buildPdfInfoGrid([
        { label: "إجمالي الاستثمار", value: `${formatPdfPrice(study.investmentOverview.totalInvestment)} ﷼`, emphasized: true },
        ...study.investmentOverview.breakdownItems.map(item => ({
          label: item.label,
          value: `${formatPdfPrice(item.amount)} ﷼${item.note ? ` (${item.note})` : ""}`,
        })),
      ])));

      // Operational Costs
      sections.push(buildPdfSection("التكاليف التشغيلية الشهرية", buildPdfInfoGrid([
        { label: "الإجمالي الشهري", value: `${formatPdfPrice(study.operationalCosts.monthlyTotal)} ﷼`, emphasized: true },
        ...study.operationalCosts.items.map(item => ({
          label: item.label,
          value: `${formatPdfPrice(item.monthlyCost)} ﷼`,
        })),
      ])));

      // Revenue Projections
      const scenarioHtml = (label: string, s: FeasibilityStudy["revenueProjections"]["realistic"]) => `
        <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:16px;padding:14px;background:${PDF_COLORS.cardBg};display:grid;gap:6px;">
          <div style="font-size:12px;font-weight:600;color:${PDF_COLORS.primary};">${escapeHtml(label)}</div>
          <div style="font-size:11px;color:${PDF_COLORS.text};line-height:1.8;">
            ربح شهري: ${formatPdfPrice(s.monthlyProfit)} ﷼ &nbsp;|&nbsp; ROI: ${s.annualROI}% &nbsp;|&nbsp; استرداد: ${s.roiMonths} شهر
          </div>
          <div style="font-size:10px;color:${PDF_COLORS.textMuted};">${escapeHtml(s.assumptions)}</div>
        </div>`;
      sections.push(buildPdfSection("التوقعات المالية", `
        <div style="display:grid;gap:10px;">
          ${scenarioHtml("السيناريو المتفائل", study.revenueProjections.optimistic)}
          ${scenarioHtml("السيناريو الواقعي", study.revenueProjections.realistic)}
          ${scenarioHtml("السيناريو المتحفظ", study.revenueProjections.conservative)}
        </div>
      `));

      // Competitor Analysis
      sections.push(buildPdfSection("تحليل المنافسين", `
        <div style="display:grid;gap:8px;">
          <div style="font-size:11px;line-height:2;color:${PDF_COLORS.text};">${escapeHtml(study.competitorAnalysis.summary)}</div>
          ${buildPdfInfoGrid([
            { label: "كثافة المنافسة", value: study.competitorAnalysis.competitiveDensity },
            { label: "المنافسون القريبون", value: String(study.competitorAnalysis.nearbyCount) },
          ])}
        </div>
      `));

      // Risk Assessment
      const riskItems = [
        ...(study.riskAssessment.financialRisks || []).map(r => `مالي: ${r}`),
        ...(study.riskAssessment.operationalRisks || []).map(r => `تشغيلي: ${r}`),
        ...(study.riskAssessment.marketRisks || []).map(r => `سوقي: ${r}`),
      ];
      if (riskItems.length > 0) {
        sections.push(buildPdfSection("تقييم المخاطر", `
          <div style="display:grid;gap:8px;">
            <div style="font-size:12px;font-weight:600;color:${PDF_COLORS.primary};">مستوى المخاطر: ${escapeHtml(study.riskAssessment.overallRisk)}</div>
            ${riskItems.map(r => `<div style="font-size:11px;color:${PDF_COLORS.text};line-height:1.8;padding:8px 12px;background:${PDF_COLORS.cardBg};border-radius:12px;border:0.5px solid ${PDF_COLORS.border};">• ${escapeHtml(r)}</div>`).join("")}
          </div>
        `));
      }

      // Recommendations
      sections.push(buildPdfSection("التوصيات", `
        <div style="display:grid;gap:8px;">
          ${study.recommendations.map((r, i) => `
            <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-radius:14px;background:${PDF_COLORS.cardBg};border:0.5px solid ${PDF_COLORS.border};">
              <div style="width:22px;height:22px;border-radius:999px;background:hsl(212 84% 42% / 0.1);color:${PDF_COLORS.primary};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0;">${i + 1}</div>
              <div style="font-size:11px;line-height:1.9;color:${PDF_COLORS.text};">${escapeHtml(r)}</div>
            </div>
          `).join("")}
        </div>
      `));

      // Verdict
      sections.push(buildPdfSection("الحكم النهائي", `
        <div style="text-align:center;padding:16px;background:${PDF_COLORS.primaryLight};border-radius:16px;border:0.5px solid hsl(212 84% 82%);">
          <div style="font-size:16px;font-weight:700;color:${PDF_COLORS.primary};">${escapeHtml(study.verdict)}</div>
          <div style="font-size:11px;color:${PDF_COLORS.textMuted};margin-top:6px;">مستوى الثقة: ${escapeHtml(study.confidenceLevel)}</div>
        </div>
      `, true));

      // Disclaimer
      sections.push(buildPdfSection("إخلاء المسؤولية", `
        <div style="font-size:10px;line-height:2;color:${PDF_COLORS.textMuted};">${escapeHtml(study.disclaimer)}</div>
      `));

      // Feasibility disclaimer
      sections.push(buildPdfDisclaimer("feasibility"));
      // QR verification section (outside footer)
      if (qrDataUrl) {
        sections.push(buildPdfQrSection(qrDataUrl));
      }

      const shellBuilder = (pageNumber: number) => buildPdfPageShell({
        documentTitle: "دراسة الجدوى الاقتصادية",
        documentSubtitle: listing.title || listing.business_activity || "فرصة استثمارية",
        documentMeta: [listing.city ? `الموقع: ${listing.city}` : "", listing.price ? `السعر: ${formatPdfPrice(listing.price)} ﷼` : ""].filter(Boolean),
        logoBase64,
        logoIconBase64,
        pageNumber,
        qrDataUrl,
        showQrInFooter: false,
      });

      const pages = paginateSections({ sections, mount, shellBuilder });
      const fileName = `دراسة-جدوى-${listing.title?.replace(/\s+/g, "-") || listing.id || "report"}.pdf`;
      await renderPagesToPdf({ pages, fileName });
      document.body.removeChild(mount);
      toast.success("تم تحميل دراسة الجدوى بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء إنشاء ملف PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  // Guard: economic feasibility does not apply to "assets_only" deals.
  // We ignore any pre-existing (hallucinated) study in DB and show the
  // alternative card instead. We DO NOT delete DB rows.
  const primaryDealType = String(listing?.primary_deal_type || listing?.deal_type || "").trim();
  const isAssetsOnly = primaryDealType === "assets_only";

  if (isAssetsOnly) {
    return (
      <div
        ref={panelRef}
        id="feasibility"
        className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <AiStar size={18} />
          <h3 className="text-base font-semibold">{t("feasibility.title")}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          هذي الصفقة من نوع <span className="font-medium text-foreground">"أصول فقط"</span> — أي بيع معدات
          أو أصول دون نشاط تشغيلي. لذلك، دراسة الجدوى الاقتصادية لا تنطبق.
        </p>
        <div className="rounded-lg bg-background/60 border border-border/40 p-3 space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            بدائل أنسب لتقييم هذه الصفقة:
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><span className="font-medium">تقييم الأصل:</span> راجع قسم <span className="text-primary">"فحص الصفقة"</span></span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><span className="font-medium">مقارنة السوق:</span> راجع قسم <span className="text-primary">"تقييم الأصول"</span></span>
          </div>
        </div>
      </div>
    );
  }

  if (loadingCache && !study) {
    return (
      <div ref={panelRef} id="feasibility" className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-5 flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">جاري تحميل الدراسة...</span>
      </div>
    );
  }

  // If study is still null after all resolution attempts, force-build from listing data
  // — but only for Arabic. For other languages we must wait for/trigger AI generation.
  const resolvedStudy = study || (isArabic ? buildEstimatedFeasibilityStudy(listing) : null);
  if (!resolvedStudy) {
    return (
      <div ref={panelRef} id="feasibility" className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AiStar size={18} />
          <h3 className="text-base font-semibold">{t("feasibility.title")}</h3>
        </div>
        {loading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {!isArabic ? t("dealCheck.generatingInYourLanguage") : "جاري إعداد الدراسة... (قد تستغرق 30 ثانية)"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {!isArabic ? t("dealCheck.tapToGenerateInYourLanguage") : "لا تتوفر بيانات كافية لإعداد دراسة الجدوى حالياً"}
            </p>
            {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
            <Button onClick={runStudy} variant="outline" className="w-full gap-2" size="sm" disabled={isSimulation || loading || !canRefresh}>
              <BarChart3 size={14} />
              {isSimulation ? "دراسة محفوظة" : (!isArabic ? t("dealCheck.reanalyze") : "إعداد الدراسة الآن")}
              <AiStar size={12} />
            </Button>
          </>
        )}
      </div>
    );
  }

  const displayStudy = resolvedStudy;
  const v = VERDICT_COLORS[displayStudy.verdictColor] || VERDICT_COLORS.blue;
  const rs = displayStudy.revenueProjections.realistic;

  return (
    <div ref={panelRef} id="feasibility" className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AiStar size={18} />
          <h3 className="text-base font-semibold">{t("feasibility.title")}</h3>
          {displayStudy._meta?.hasRealCompetitorData && (
            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">بيانات Google Maps</span>
          )}
        </div>
        <div className="flex gap-1.5 items-center flex-wrap">
          {(lastUpdatedAt || cachedAt) && (() => {
            const dateStr = lastUpdatedAt || cachedAt;
            return (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                {t("dealCheck.updatedAt")} {new Date(dateStr!).toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" })}
                <span className="text-muted-foreground/50">• {t("feasibility.weeklyUpdate")}</span>
              </span>
            );
          })()}
          <Button variant="outline" size="sm" onClick={shareStudy} className="gap-1.5 text-xs">
            {copied ? <Check size={12} className="text-emerald-500" /> : <Share2 size={12} />}
            {copied ? "تم النسخ" : t("common.share")}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPDF} disabled={pdfLoading} className="gap-1.5 text-xs">
            {pdfLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            PDF
          </Button>
          {isOwner && (
            <Button variant="ghost" size="sm" onClick={runStudy} disabled={isSimulation || loading || !canRefresh} className="gap-1.5 text-xs" title={isSimulation ? "هذه دراسة محاكاة محفوظة" : !canRefresh ? "يمكن التحديث مرة كل 24 ساعة" : ""}>
              {loading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
              {isSimulation ? "محفوظة" : "تحديث"}
            </Button>
          )}
        </div>
      </div>

      {/* Verdict Badge */}
      <div className={cn("rounded-xl border p-4 flex items-center justify-between", v.bg, v.border)}>
        <div>
          <div className={cn("text-lg font-bold", v.text)}>{t(`feasibility.${mapFeasibilityVerdictToKey(displayStudy.verdict)}`)}</div>
          <div className="text-xs text-muted-foreground">{t("feasibility.confidenceLevel")}: {t(`dealCheck.confidenceLevel${mapConfidenceToKey(displayStudy.confidenceLevel) === "High" ? "High" : mapConfidenceToKey(displayStudy.confidenceLevel) === "Low" ? "Low" : "Medium"}`)}</div>
        </div>
        <div className="text-left">
          <div className="text-xs text-muted-foreground">{t("feasibility.paybackPeriod")}</div>
          <div className={cn("text-xl font-bold", v.text)}>{rs.roiMonths} <span className="text-sm font-normal">{t("common.month")}</span></div>
        </div>
      </div>

      {/* Financial Data Warning Badge */}
      {displayStudy._meta && displayStudy._meta.hasRealFinancials === false && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
          <span className="text-amber-600 mt-0.5 text-lg">⚠️</span>
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
              هذه الأرقام تقديرية - لم يتم تقديم بيانات مالية موثّقة
            </div>
            <div className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-1 leading-relaxed">
              البائع لم يرفق قوائم مالية أو كشوف بنك أو فواتير تدعم هذه التقديرات.
              يُنصح بطلب بيانات مالية موثّقة قبل اتخاذ قرار الاستثمار.
            </div>
          </div>
        </div>
      )}

      {/* Report body */}
      <div ref={reportRef} className="space-y-2.5 bg-background">
        {/* Executive Summary */}
        <CollapsibleSection
          title={t("feasibility.executiveSummary")}
          icon={<Target size={14} />}
          isOpen={expandedSections.summary}
          onToggle={() => toggleSection("summary")}
        >
          <p className="text-sm leading-relaxed text-muted-foreground">{displayStudy.executiveSummary}</p>
        </CollapsibleSection>

        {/* Investment Overview */}
        <CollapsibleSection
          title={t("feasibility.investmentStructure")}
          icon={<DollarSign size={14} />}
          isOpen={expandedSections.investment}
          onToggle={() => toggleSection("investment")}
          badge={<span className="text-xs font-mono">{formatNum(displayStudy.investmentOverview.totalInvestment)} <SarSymbol className="inline w-2.5 h-2.5" /></span>}
        >
          <div className="space-y-1.5">
            {displayStudy.investmentOverview.breakdownItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                <span className="text-muted-foreground">{item.label}</span>
                <div className="text-left">
                  <span className="font-mono">{formatNum(item.amount)}</span>
                  <SarSymbol className="inline w-2.5 h-2.5 mr-1 opacity-50" />
                  {item.note && <span className="text-[10px] text-muted-foreground block">{item.note}</span>}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Operational Costs */}
        <CollapsibleSection
          title={t("feasibility.monthlyCosts")}
          icon={<TrendingDown size={14} />}
          isOpen={expandedSections.costs}
          onToggle={() => toggleSection("costs")}
          badge={<span className="text-xs font-mono">{formatNum(displayStudy.operationalCosts.monthlyTotal)} <SarSymbol className="inline w-2.5 h-2.5" />/شهر</span>}
        >
          <div className="space-y-1.5">
            {displayStudy.operationalCosts.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-mono">{formatNum(item.monthlyCost)} <SarSymbol className="inline w-2.5 h-2.5 opacity-50" /></span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Revenue Projections */}
        <CollapsibleSection
          title={t("feasibility.profitScenarios")}
          icon={<TrendingUp size={14} />}
          isOpen={expandedSections.revenue}
          onToggle={() => toggleSection("revenue")}
        >
          <div className="grid grid-cols-3 gap-2">
            <ScenarioCard label={t("feasibility.optimistic")} scenario={displayStudy.revenueProjections.optimistic} color="emerald" icon={<ArrowUpRight size={12} />} />
            <ScenarioCard label={t("feasibility.realistic")} scenario={displayStudy.revenueProjections.realistic} color="blue" icon={<Minus size={12} />} />
            <ScenarioCard label={t("feasibility.conservative")} scenario={displayStudy.revenueProjections.conservative} color="amber" icon={<ArrowDownRight size={12} />} />
          </div>
        </CollapsibleSection>

        {/* Competitor Analysis */}
        <CollapsibleSection
          title={t("feasibility.competitors")}
          icon={<Users size={14} />}
          isOpen={expandedSections.competitors}
          onToggle={() => toggleSection("competitors")}
          badge={
            <span className={cn("text-xs font-semibold", DENSITY_COLORS[displayStudy.competitorAnalysis.competitiveDensity] || "")}>
              {displayStudy.competitorAnalysis.competitiveDensity}
            </span>
          }
        >
          <div className="space-y-3">
            {(() => {
              const nearby = displayStudy.competitorAnalysis.nearbyCount || 0;
              const neighborhood = displayStudy.competitorAnalysis.neighborhoodCount || 0;
              const area = displayStudy.competitorAnalysis.areaCount || 0;
              const topCount = displayStudy.competitorAnalysis.topCompetitors?.length || 0;
              const totalDigital = nearby + neighborhood + area;

              // No digital competitor data found at all → show only neutral one-liner (no long summary)
              if (totalDigital === 0 && topCount === 0) {
                return (
                  <div className="rounded-lg bg-muted/30 p-3 text-center text-xs text-muted-foreground">
                    {t("feasibility.noCompetitorData")}
                  </div>
                );
              }

              // Standard view: summary + radii (only show non-zero buckets to avoid misleading zeros)
              return (
                <>
                  <p className="text-sm text-muted-foreground">{displayStudy.competitorAnalysis.summary}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                      <div className="text-lg font-bold">{nearby || "—"}</div>
                      <div className="text-[10px] text-muted-foreground">500م (الشارع)</div>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                      <div className="text-lg font-bold">{neighborhood || "—"}</div>
                      <div className="text-[10px] text-muted-foreground">2كم (الحي)</div>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                      <div className="text-lg font-bold">{area || "—"}</div>
                      <div className="text-[10px] text-muted-foreground">10كم (المنطقة)</div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Top competitors */}
            {displayStudy.competitorAnalysis.topCompetitors && displayStudy.competitorAnalysis.topCompetitors.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">{t("feasibility.topCompetitors")}</div>
                {displayStudy.competitorAnalysis.topCompetitors.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={10} className="text-muted-foreground" />
                      <span>{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {c.rating && <span>⭐ {c.rating}</span>}
                      <span>{c.distance}م</span>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full",
                        c.threat === "عالي" ? "bg-red-500/10 text-red-600" :
                        c.threat === "متوسط" ? "bg-amber-500/10 text-amber-600" :
                        "bg-emerald-500/10 text-emerald-600"
                      )}>{c.threat}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Opportunities & Threats */}
            {displayStudy.competitorAnalysis.opportunities && displayStudy.competitorAnalysis.opportunities.length > 0 && (
              <div>
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">{t("feasibility.differentiators")}</div>
                {displayStudy.competitorAnalysis.opportunities.map((o, i) => (
                  <div key={i} className="flex gap-1.5 text-xs text-muted-foreground"><CheckCircle2 size={10} className="text-emerald-500 shrink-0 mt-0.5" />{o}</div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Risk Assessment */}
        <CollapsibleSection
          title={t("feasibility.riskAssessment")}
          icon={<Shield size={14} />}
          isOpen={expandedSections.risks}
          onToggle={() => toggleSection("risks")}
          badge={<span className={cn("text-xs font-semibold", RISK_COLORS[displayStudy.riskAssessment.overallRisk] || "")}>{displayStudy.riskAssessment.overallRisk}</span>}
        >
          <div className="space-y-2">
            <RiskGroup label={t("feasibility.financialRisks")} items={displayStudy.riskAssessment.financialRisks} />
            <RiskGroup label={t("feasibility.operationalRisks")} items={displayStudy.riskAssessment.operationalRisks} />
            <RiskGroup label={t("feasibility.marketRisks")} items={displayStudy.riskAssessment.marketRisks} />
            {displayStudy.riskAssessment.regulatoryRisks && displayStudy.riskAssessment.regulatoryRisks.length > 0 && (
              <RiskGroup label={t("feasibility.regulatoryRisks")} items={displayStudy.riskAssessment.regulatoryRisks} />
            )}
            {displayStudy.riskAssessment.mitigationStrategies && displayStudy.riskAssessment.mitigationStrategies.length > 0 && (
              <div>
                <div className="text-xs font-medium text-primary mb-1">{t("feasibility.mitigationStrategies")}</div>
                {displayStudy.riskAssessment.mitigationStrategies.map((s, i) => (
                  <div key={i} className="flex gap-1.5 text-xs text-muted-foreground"><Lightbulb size={10} className="text-primary shrink-0 mt-0.5" />{s}</div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Recommendations */}
        <CollapsibleSection
          title={t("feasibility.recommendations")}
          icon={<Lightbulb size={14} />}
          isOpen={expandedSections.recommendations}
          onToggle={() => toggleSection("recommendations")}
        >
          <div className="space-y-1.5">
            {displayStudy.recommendations.map((r, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                <span className="text-muted-foreground">{r}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Disclaimer */}
        <div className="rounded-lg bg-muted/20 border border-border/30 px-3 py-2 text-[10px] text-muted-foreground leading-relaxed">
          <AlertTriangle size={10} className="inline mr-1" />
          {displayStudy.disclaimer}
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ── */
const CollapsibleSection = ({
  title, icon, isOpen, onToggle, badge, children,
}: {
  title: string; icon: React.ReactNode; isOpen: boolean; onToggle: () => void;
  badge?: React.ReactNode; children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-border/40 overflow-hidden">
    <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <span className="text-sm font-medium">{title}</span>
        {badge}
      </div>
      {isOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
    </button>
    {isOpen && <div className="px-3 pb-3 border-t border-border/20 pt-2.5">{children}</div>}
  </div>
);

const ScenarioCard = ({ label, scenario, color, icon }: { label: string; scenario: Scenario; color: string; icon: React.ReactNode }) => {
  const { t } = useTranslation();
  return (
    <div className={cn("rounded-lg border p-2.5 space-y-1.5", `border-${color}-500/20 bg-${color}-500/5`)}>
      <div className="flex items-center gap-1 text-xs font-medium">
        <span className={`text-${color}-600 dark:text-${color}-400`}>{icon}</span>
        {label}
      </div>
      <div className="text-center">
        <div className={cn("text-sm font-bold", `text-${color}-700 dark:text-${color}-300`)}>
          {formatNum(scenario.monthlyProfit)}
        </div>
        <div className="text-[9px] text-muted-foreground">{t("feasibility.monthlyProfit")} <SarSymbol className="inline w-2 h-2" /></div>
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>ROI: {scenario.annualROI}%</span>
        <span>{scenario.roiMonths} {t("common.month")}</span>
      </div>
      <div className="text-[9px] text-muted-foreground/70 leading-relaxed">{scenario.assumptions}</div>
    </div>
  );
};

const RiskGroup = ({ label, items }: { label: string; items: string[] }) => {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}:</div>
      {items.map((r, i) => (
        <div key={i} className="flex gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle size={10} className="text-amber-500 shrink-0 mt-0.5" />
          {r}
        </div>
      ))}
    </div>
  );
};

export default FeasibilityStudyPanel;
