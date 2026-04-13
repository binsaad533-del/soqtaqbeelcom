import { useState, useEffect } from "react";
import {
  ShieldCheck, AlertTriangle, TrendingUp, MessageCircle,
  ChevronDown, ChevronUp, MapPin, BarChart3, Briefcase, CheckCircle2,
  FileQuestion, Target, Loader2, Activity, ShoppingCart, Store,
  RefreshCw, Clock, Package, FileText, ImageIcon, DollarSign, ArrowDownRight, ArrowUpRight, Equal, Star
} from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { UseAnalysisCacheReturn } from "@/hooks/useAnalysisCache";

interface AssetBreakdownItem {
  assetName: string;
  marketRange: string;
  sellerPrice?: string;
  verdict: string;
  source: string;
}

interface MarketComparison {
  comparablesReviewed: number;
  matchQuality: string;
  observedPriceRange: string;
  marketPosition: string;
  confidence: string;
  details: string;
  assetBreakdown: AssetBreakdownItem[];
}

interface DealCheckAnalysis {
  dealOverview: string;
  businessActivity: string;
  assetAssessment: string;
  locationAssessment: string;
  competitionSnapshot: string;
  operationalReadiness: string;
  marketComparison?: MarketComparison;
  risks: string[];
  strengths: string[];
  missingInfo: string[];
  rating: string;
  ratingColor: string;
  recommendation: string;
  negotiationGuidance: string[];
  fairnessVerdict: string;
  confidenceLevel: string;
}

interface DealCheckPanelProps {
  listing: any;
  analysisCache: UseAnalysisCacheReturn;
}

const normalizeText = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const getRatingColor = (raw: any): DealCheckAnalysis["ratingColor"] => {
  if (typeof raw?.ratingColor === "string" && raw.ratingColor in RATING_CONFIG) {
    return raw.ratingColor;
  }

  const rating = normalizeText(raw?.rating, raw?.overall_rating);
  if (["ممتاز", "جيد جداً"].includes(rating)) return "green";
  if (["جيد", "معقول"].includes(rating)) return "blue";
  if (["متوسط", "مقبول"].includes(rating)) return "yellow";
  if (["ضعيف", "سيئ"].includes(rating)) return "red";
  return "gray";
};

const getFairnessVerdict = (raw: any): DealCheckAnalysis["fairnessVerdict"] => {
  const direct = normalizeText(raw?.fairnessVerdict);
  if (direct && direct in FAIRNESS_ICONS) return direct;

  const priceAssessment = normalizeText(raw?.price_assessment, raw?.priceAssessment).toLowerCase();
  if (priceAssessment.includes("مبالغ") || priceAssessment.includes("مرتفع")) return "مبالغ فيه";
  if (priceAssessment.includes("أقل") || priceAssessment.includes("فرصة") || priceAssessment.includes("جذاب")) return "جذاب";
  if (priceAssessment.includes("مناسب") || priceAssessment.includes("عادل") || priceAssessment.includes("معقول")) return "معقول";
  return "غير واضح";
};

const getConfidenceLevel = (raw: any): DealCheckAnalysis["confidenceLevel"] => {
  const direct = normalizeText(raw?.confidenceLevel);
  if (direct) return direct;

  const successProbability = raw?.deal_prediction?.success_probability;
  if (typeof successProbability === "number") {
    if (successProbability >= 70) return "عالي";
    if (successProbability >= 45) return "متوسط";
    return "منخفض";
  }

  return "متوسط";
};

const normalizeMarketComparison = (value: unknown): MarketComparison | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  return {
    comparablesReviewed: typeof raw.comparablesReviewed === "number" ? raw.comparablesReviewed : 0,
    matchQuality: normalizeText(raw.matchQuality, "غير محدد"),
    observedPriceRange: normalizeText(raw.observedPriceRange, "غير متاح"),
    marketPosition: normalizeText(raw.marketPosition, "غير محدد"),
    confidence: normalizeText(raw.confidence, "متوسط"),
    details: normalizeText(raw.details, "لا تتوفر حالياً تفاصيل سوق إضافية."),
    assetBreakdown: Array.isArray(raw.assetBreakdown)
      ? raw.assetBreakdown.map((item) => {
          const entry = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return {
            assetName: normalizeText(entry.assetName, "أصل غير مسمى"),
            marketRange: normalizeText(entry.marketRange, "غير متاح"),
            sellerPrice: normalizeText(entry.sellerPrice),
            verdict: normalizeText(entry.verdict, "غير واضح"),
            source: normalizeText(entry.source, "بيانات الإعلان"),
          };
        })
      : [],
  };
};

const normalizeDealCheckAnalysis = (raw: any, listing: any): DealCheckAnalysis | null => {
  if (!raw || typeof raw !== "object") return null;

  const strengths = normalizeStringArray(raw.strengths);
  const risks = normalizeStringArray(raw.risks);
  const recommendations = normalizeStringArray(raw.recommendations);
  const missingInfo = normalizeStringArray(raw.missingInfo);
  const negotiationGuidance = normalizeStringArray(raw.negotiationGuidance);
  const locationLabel = [listing?.district, listing?.city].filter(Boolean).join("، ");

  return {
    dealOverview: normalizeText(
      raw.dealOverview,
      raw.summary,
      raw.executiveSummary,
      listing?.description,
      "تحليل محفوظ لهذه الصفقة بناءً على البيانات الحالية."
    ),
    businessActivity: normalizeText(
      raw.businessActivity,
      listing?.business_activity,
      listing?.category,
      "النشاط التجاري متوافق مع طبيعة الفرصة المعروضة."
    ),
    assetAssessment: normalizeText(
      raw.assetAssessment,
      strengths.find((item) => item.includes("معدات") || item.includes("أصول") || item.includes("مطبخ") || item.includes("أثاث")),
      "تمت مراجعة الأصول المذكورة ويُنصح بالتحقق الميداني من حالتها."
    ),
    locationAssessment: normalizeText(
      raw.locationAssessment,
      locationLabel ? `الموقع في ${locationLabel} ويحتاج تقييمه ميدانياً حسب كثافة الحركة والفئة المستهدفة.` : "الموقع يحتاج مراجعة ميدانية إضافية."
    ),
    competitionSnapshot: normalizeText(
      raw.competitionSnapshot,
      risks[0],
      "المنافسة تختلف حسب الحي والنشاط ويُنصح بمراجعة السوق المحلي قبل القرار النهائي."
    ),
    operationalReadiness: normalizeText(
      raw.operationalReadiness,
      strengths[0],
      "الجاهزية التشغيلية تحتاج مراجعة للعقود والموارد والأصول قبل الإتمام."
    ),
    marketComparison: normalizeMarketComparison(raw.marketComparison),
    risks,
    strengths,
    missingInfo,
    rating: normalizeText(raw.rating, raw.overall_rating, "قيد المراجعة"),
    ratingColor: getRatingColor(raw),
    recommendation: normalizeText(
      raw.recommendation,
      recommendations[0],
      "يوصى بمراجعة التفاصيل الميدانية والمالية قبل اتخاذ القرار."
    ),
    negotiationGuidance: negotiationGuidance.length > 0 ? negotiationGuidance : recommendations,
    fairnessVerdict: getFairnessVerdict(raw),
    confidenceLevel: getConfidenceLevel(raw),
  };
};

const RATING_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  green: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  yellow: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  gray: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
};

const FAIRNESS_ICONS: Record<string, string> = {
  "جذاب": "🟢",
  "معقول": "🔵",
  "مبالغ فيه": "🔴",
  "غير واضح": "⚪",
};

function formatCacheAge(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "الآن";
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

const CONFIDENCE_BADGE: Record<string, { bg: string; text: string }> = {
  "عالي": { bg: "bg-emerald-50", text: "text-emerald-700" },
  "متوسط": { bg: "bg-amber-50", text: "text-amber-700" },
  "منخفض": { bg: "bg-red-50", text: "text-red-700" },
};

const SOURCE_LABELS: Record<string, { icon: typeof ImageIcon; label: string }> = {
  image: { icon: ImageIcon, label: "من الصور" },
  file: { icon: FileText, label: "من المستندات" },
  both: { icon: Package, label: "صور + مستندات" },
};

const DealCheckPanel = ({ listing, analysisCache }: DealCheckPanelProps) => {
  const {
    cachedDealCheck, cacheAge, isStale, isRefreshing, saveDealCheck, setRefreshing,
    assetsCombined, detectedAssetsImages, detectedAssetsFiles, analysisUpdatedAt, saveDetectedAssets,
    priceAnalysis, savePriceAnalysis,
    trustScore, saveTrustScore
  } = analysisCache;

  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<DealCheckAnalysis | null>(() => normalizeDealCheckAnalysis(cachedDealCheck, listing));
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const normalized = normalizeDealCheckAnalysis(cachedDealCheck, listing);
    if (normalized) {
      setAnalysis(normalized);
      setOpen(true);
    }
  }, [cachedDealCheck, listing]);

  const getAllPhotoUrls = (): string[] => {
    if (!listing?.photos) return [];
    const photos = listing.photos as Record<string, string[]>;
    return Object.values(photos).flat().filter((u: any): u is string => typeof u === "string" && u.startsWith("http"));
  };

  const getAllFileUrls = (): string[] => {
    if (!Array.isArray(listing?.documents)) return [];
    const urls: string[] = [];
    for (const doc of listing.documents) {
      if (Array.isArray(doc?.files)) {
        for (const url of doc.files) {
          if (typeof url === "string" && url.startsWith("http")) {
            urls.push(url);
          }
        }
      }
    }
    return urls;
  };

  const detectAssets = async (): Promise<any> => {
    const photoUrls = getAllPhotoUrls();
    const fileUrls = getAllFileUrls();

    if (photoUrls.length === 0 && fileUrls.length === 0) return null;

    try {
      const { data, error: fnError } = await supabase.functions.invoke("detect-assets", {
        body: {
          photoUrls,
          fileUrls,
          businessActivity: listing.business_activity || listing.category,
          dealPrice: listing.price || null,
          listingData: listing,
        },
      });
      if (fnError || !data?.success) return null;

      const detected = data.detected;
      await saveDetectedAssets(detected.images, detected.files, detected.combined);

      // Save price analysis if returned
      if (detected.priceAnalysis) {
        await savePriceAnalysis(detected.priceAnalysis);
      }

      // Save trust score if returned
      if (detected.trustScore) {
        await saveTrustScore(detected.trustScore);
      }

      return detected.combined;
    } catch {
      return null;
    }
  };

  const runDealCheck = async (background = false) => {
    if (!background) {
      setLoading(true);
      setOpen(true);
    } else {
      setRefreshing(true);
    }
    setError("");

    try {
      // Step 1: Detect assets if not already done
      let combinedAssets = assetsCombined;
      if (!combinedAssets) {
        combinedAssets = await detectAssets();
      }

      // Step 2: Run deal check
      const listingWithAssets = {
        ...listing,
        ai_detected_assets: combinedAssets,
        ai_detected_assets_images: detectedAssetsImages,
        ai_detected_assets_files: detectedAssetsFiles,
      };
      const { invokeWithRetry } = await import("@/lib/invokeWithRetry");
      const { data, error: fnError } = await invokeWithRetry("deal-check", {
        listing: listingWithAssets, perspective: "buyer",
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "فشل التحليل");

      setAnalysis(normalizeDealCheckAnalysis(data.analysis, listing));
      await saveDealCheck(data.analysis);

      if (listing?.id) {
        await supabase
          .from("listings")
          .update({ ai_structure_validation: data.analysis as any })
          .eq("id", listing.id);
      }
    } catch (e: any) {
      if (!background) {
        setError(e.message || "حدث خطأ أثناء التحليل");
      }
    } finally {
      if (!background) setLoading(false);
      setRefreshing(false);
    }
  };

  const ratingStyle = analysis ? RATING_CONFIG[analysis.ratingColor] || RATING_CONFIG.gray : RATING_CONFIG.gray;

  // Combine assets for display from all sources
  const displayAssets = Array.isArray(assetsCombined?.assets)
    ? assetsCombined.assets
    : Array.isArray(listing?.ai_detected_assets?.assets)
      ? listing.ai_detected_assets.assets
      : [];
  const displayConfidence = assetsCombined?.confidence || listing?.ai_detected_assets?.confidence;
  const displaySummary = assetsCombined?.summary || listing?.ai_detected_assets?.summary;

  return (
    <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-accent/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
            <AiStar size={22} />
          </div>
          <div className="text-start">
            <h3 className="font-medium text-sm">فحص الصفقة والجدوى المبدئية</h3>
            <p className="text-[11px] text-muted-foreground">
              {analysis
                ? `محدّث: ${cacheAge ? new Date(cacheAge).toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" }) : ""}`
                : "تحليل ذكي شامل للصفقة"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRefreshing && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <RefreshCw size={10} className="animate-spin" />
              جاري التحديث...
            </span>
          )}
          {analysis && (
            <span className={cn("text-[11px] px-2.5 py-1 rounded-lg border", ratingStyle.bg, ratingStyle.text, ratingStyle.border)}>
              {analysis.rating}
            </span>
          )}
          {!analysis && loading && (
            <Loader2 size={16} className="animate-spin text-primary" />
          )}
          <span className="text-[11px] px-3 py-1.5 rounded-lg bg-primary/8 text-primary border border-primary/15">
            {analysis ? "استعرض الفحص" : loading ? "جاري التحليل" : "استعرض الفحص"}
          </span>
          {open ? <ChevronUp size={16} strokeWidth={1.3} className="text-muted-foreground" /> : <ChevronDown size={16} strokeWidth={1.3} className="text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5">
          {loading && (
            <div className="py-16 flex flex-col items-center gap-4">
              <div className="relative">
                <AiStar size={36} />
                <Loader2 size={52} strokeWidth={1} className="absolute -top-2 -left-2 text-primary/30 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">جاري تحليل الصفقة...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  يتم فحص جميع الصور والمستندات والبيانات
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={() => runDealCheck()} className="rounded-xl text-xs">
                إعادة المحاولة
              </Button>
            </div>
          )}

          {analysis && !loading && (
            <div className="space-y-5">
              {/* Cache Info Bar */}
              {(cacheAge || analysisUpdatedAt) && (() => {
                const updatedDate = analysisUpdatedAt || cacheAge;
                const ageMs = updatedDate ? Date.now() - new Date(updatedDate).getTime() : 0;
                const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
                const isRecent = ageDays < 1;
                return (
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock size={11} />
                      <span>آخر تحديث: {formatCacheAge(updatedDate)}</span>
                      {isRecent && <span className="text-emerald-600 dark:text-emerald-400 font-medium">• محدّث</span>}
                      {isStale && <span className="text-amber-500 font-medium">• يتم التحديث تلقائياً</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/60">يُحدّث تلقائياً عند تعديل البيانات</span>
                      {analysis.confidenceLevel && (
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium",
                          CONFIDENCE_BADGE[analysis.confidenceLevel]?.bg || "bg-muted",
                          CONFIDENCE_BADGE[analysis.confidenceLevel]?.text || "text-muted-foreground"
                        )}>
                          ثقة: {analysis.confidenceLevel}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Rating Banner */}
              <div className={cn("rounded-xl p-4 border", ratingStyle.bg, ratingStyle.border)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target size={16} strokeWidth={1.3} className={ratingStyle.text} />
                    <span className={cn("text-sm font-medium", ratingStyle.text)}>التقييم العام</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground">
                      عدالة السعر: {FAIRNESS_ICONS[analysis.fairnessVerdict]} {analysis.fairnessVerdict}
                    </span>
                  </div>
                </div>
                <p className={cn("text-lg font-medium", ratingStyle.text)}>{analysis.rating}</p>
              </div>

              {/* Trust Score Section */}
              {trustScore && (
                <TrustScoreSection trustScore={trustScore} />
              )}

              {/* Recommendation */}
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <AiStar size={14} animate={false} />
                  <span className="text-xs font-medium text-primary">التوصية</span>
                </div>
                <p className="text-sm leading-relaxed">{analysis.recommendation}</p>
              </div>

              <ListSection icon={TrendingUp} title="نقاط القوة" items={analysis.strengths} dotClass="bg-emerald-500/60" iconClass="text-emerald-600" />
              <ListSection icon={AlertTriangle} title="المخاطر" items={analysis.risks} dotClass="bg-red-500/50" iconClass="text-red-500/70" />

              {!expanded && (
                <Button variant="outline" size="sm" onClick={() => setExpanded(true)} className="w-full rounded-xl text-xs gap-1.5">
                  <ChevronDown size={14} />
                  عرض التحليل الكامل
                </Button>
              )}

              {expanded && (
                <>
                  <AnalysisSection icon={Briefcase} title="نظرة عامة على الصفقة" content={analysis.dealOverview} />
                  <AnalysisSection icon={Activity} title="النشاط التجاري" content={analysis.businessActivity} />
                  <AnalysisSection icon={CheckCircle2} title="تقييم الأصول والمعدات" content={analysis.assetAssessment} />

                  {/* Combined Detected Assets */}
                  {displayAssets.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-2.5">
                        <Package size={15} strokeWidth={1.3} className="text-primary/60" />
                        الأصول المكتشفة تلقائياً
                      </h4>
                      <div className="bg-accent/30 rounded-xl p-3 mb-2">
                        <p className="text-xs text-muted-foreground mb-2">{displaySummary}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {displayConfidence && (
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-md",
                              displayConfidence === "عالي" ? "bg-emerald-50 text-emerald-700" :
                              displayConfidence === "متوسط" ? "bg-amber-50 text-amber-700" :
                              "bg-red-50 text-red-700"
                            )}>
                              ثقة: {displayConfidence}
                            </span>
                          )}
                          {detectedAssetsImages?.assets?.length > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 flex items-center gap-1">
                              <ImageIcon size={9} />
                              {detectedAssetsImages.imagesAnalyzed} صورة
                            </span>
                          )}
                          {detectedAssetsFiles?.assets?.length > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 flex items-center gap-1">
                              <FileText size={9} />
                              مستندات
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="border border-border/50 rounded-xl overflow-hidden">
                        <div className="divide-y divide-border/30">
                          {displayAssets.map((asset: any, i: number) => {
                            const sourceKey = typeof asset?.source === "string" ? asset.source : "image";
                            const sourceInfo = SOURCE_LABELS[sourceKey] || SOURCE_LABELS.image;
                            return (
                              <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium">{asset.quantity > 1 ? `${asset.quantity}x ` : ""}{asset.name}</div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    {asset.type}{asset.details ? ` • ${asset.details}` : ""}
                                    <span className="text-muted-foreground/50 mr-1">•</span>
                                    <sourceInfo.icon size={8} />
                                    <span>{sourceInfo.label}</span>
                                  </div>
                                </div>
                                <span className={cn("text-[10px] px-2 py-0.5 rounded-md shrink-0",
                                  asset.condition === "جديد" ? "bg-emerald-50 text-emerald-700" :
                                  asset.condition === "جيد" ? "bg-blue-50 text-blue-700" :
                                  asset.condition === "مستعمل" ? "bg-amber-50 text-amber-700" :
                                  asset.condition === "تالف" ? "bg-red-50 text-red-700" :
                                  "bg-muted text-muted-foreground"
                                )}>
                                  {asset.condition}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
                        {detectedAssetsImages?.imagesAnalyzed ? `تم تحليل ${detectedAssetsImages.imagesAnalyzed} صورة` : ""}
                        {detectedAssetsFiles?.assets?.length > 0 ? ` و ${detectedAssetsFiles.assets.length} عنصر من المستندات` : ""}
                        {" — النتائج تقديرية وتحتاج تأكيد ميداني"}
                      </p>
                    </div>
                  )}

                  {/* Price Analysis Section */}
                  {priceAnalysis && (
                    <div>
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                        <DollarSign size={15} strokeWidth={1.3} className="text-primary/60" />
                        تحليل السعر
                      </h4>
                      <div className={cn("rounded-xl p-4 border mb-3",
                        priceAnalysis.decision === "فرصة ممتازة" || priceAnalysis.decision === "صفقة جيدة"
                          ? "bg-emerald-50 border-emerald-200"
                          : priceAnalysis.decision === "سعر عادل"
                          ? "bg-blue-50 border-blue-200"
                          : priceAnalysis.decision === "أعلى قليلاً"
                          ? "bg-amber-50 border-amber-200"
                          : priceAnalysis.decision === "مبالغ فيه"
                          ? "bg-red-50 border-red-200"
                          : "bg-muted border-border"
                      )}>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <div className="text-[10px] text-muted-foreground">💰 القيمة التقديرية</div>
                            <div className="text-sm font-semibold">{priceAnalysis.estimated_value?.toLocaleString()} ر.س</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">🏷️ السعر المعروض</div>
                            <div className="text-sm font-semibold">{priceAnalysis.deal_price?.toLocaleString()} ر.س</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {priceAnalysis.overpriced_percentage > 10 ? (
                              <ArrowUpRight size={16} className="text-red-500" />
                            ) : priceAnalysis.overpriced_percentage < -10 ? (
                              <ArrowDownRight size={16} className="text-emerald-500" />
                            ) : (
                              <Equal size={16} className="text-blue-500" />
                            )}
                            <span className={cn("text-sm font-medium",
                              priceAnalysis.decision === "فرصة ممتازة" || priceAnalysis.decision === "صفقة جيدة" ? "text-emerald-700" :
                              priceAnalysis.decision === "سعر عادل" ? "text-blue-700" :
                              priceAnalysis.decision === "أعلى قليلاً" ? "text-amber-700" :
                              "text-red-700"
                            )}>
                              {priceAnalysis.decision}
                            </span>
                          </div>
                          {priceAnalysis.overpriced_percentage !== 0 && (
                            <span className="text-xs text-muted-foreground">
                              {priceAnalysis.overpriced_percentage > 0 ? "+" : ""}{priceAnalysis.overpriced_percentage}%
                              {priceAnalysis.overpriced_percentage > 0 ? " أعلى" : " أقل"} من التقدير
                            </span>
                          )}
                        </div>
                      </div>
                      {priceAnalysis.items?.length > 0 && (
                        <div className="border border-border/50 rounded-xl overflow-hidden">
                          <div className="bg-muted/30 px-3 py-2 text-xs font-medium flex items-center gap-1.5">
                            <ShoppingCart size={12} strokeWidth={1.3} />
                            تفصيل تقييم الأصول
                          </div>
                          <div className="divide-y divide-border/30">
                            {priceAnalysis.items.map((item: any, i: number) => (
                              <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium">{item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {item.type} • {item.condition} ({Math.round(item.condition_multiplier * 100)}%)
                                  </div>
                                </div>
                                <div className="text-left shrink-0">
                                  <div className="text-xs font-medium">{item.total_value?.toLocaleString()} ر.س</div>
                                  {item.quantity > 1 && (
                                    <div className="text-[10px] text-muted-foreground">{item.adjusted_price?.toLocaleString()} × {item.quantity}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="bg-muted/30 px-3 py-2 flex justify-between items-center border-t border-border/30">
                            <span className="text-xs font-medium">الإجمالي التقديري</span>
                            <span className="text-sm font-semibold">{priceAnalysis.estimated_value?.toLocaleString()} ر.س</span>
                          </div>
                        </div>
                      )}
                      {priceAnalysis.market_notes && (
                        <p className="text-[10px] text-muted-foreground/60 text-center mt-2">{priceAnalysis.market_notes}</p>
                      )}
                    </div>
                  )}

                  <AnalysisSection icon={MapPin} title="تقييم الموقع" content={analysis.locationAssessment} />
                  <AnalysisSection icon={BarChart3} title="المنافسة والسوق" content={analysis.competitionSnapshot} />
                  <AnalysisSection icon={ShieldCheck} title="الجاهزية التشغيلية" content={analysis.operationalReadiness} />

                  {analysis.marketComparison && (
                    <div>
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                        <Store size={15} strokeWidth={1.3} className="text-primary/60" />
                        مقارنة السوق المستعمل
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                          <div className="text-xs text-muted-foreground">مقارنات</div>
                          <div className="text-sm font-medium">{analysis.marketComparison.comparablesReviewed}</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                          <div className="text-xs text-muted-foreground">جودة التطابق</div>
                          <div className="text-sm font-medium">{analysis.marketComparison.matchQuality}</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                          <div className="text-xs text-muted-foreground">الموقف السعري</div>
                          <div className={cn("text-sm font-medium",
                            analysis.marketComparison.marketPosition === "أقل من السوق" ? "text-emerald-600" :
                            analysis.marketComparison.marketPosition === "أعلى من السوق" ? "text-red-500" :
                            "text-foreground"
                          )}>{analysis.marketComparison.marketPosition}</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                          <div className="text-xs text-muted-foreground">مستوى الثقة</div>
                          <div className="text-sm font-medium">{analysis.marketComparison.confidence}</div>
                        </div>
                      </div>
                      {analysis.marketComparison.observedPriceRange && analysis.marketComparison.observedPriceRange !== "غير متاح" && (
                        <div className="bg-accent/30 rounded-lg p-3 mb-3">
                          <div className="text-xs text-muted-foreground mb-1">النطاق السعري المرصود</div>
                          <div className="text-sm font-medium">{analysis.marketComparison.observedPriceRange}</div>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{analysis.marketComparison.details}</p>
                      {analysis.marketComparison.assetBreakdown?.length > 0 && (
                        <div className="border border-border/50 rounded-xl overflow-hidden">
                          <div className="bg-muted/30 px-3 py-2 text-xs font-medium flex items-center gap-1.5">
                            <ShoppingCart size={12} strokeWidth={1.3} />
                            تفصيل مقارنة الأصول
                          </div>
                          <div className="divide-y divide-border/30">
                            {analysis.marketComparison.assetBreakdown.map((item, i) => (
                              <div key={i} className="px-3 py-2.5 flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">{item.assetName}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {item.marketRange} • {item.source}
                                  </div>
                                </div>
                                <span className={cn("text-[10px] px-2 py-0.5 rounded-md shrink-0",
                                  item.verdict === "معقول" ? "bg-emerald-50 text-emerald-700" :
                                  item.verdict === "مبالغ فيه" ? "bg-red-50 text-red-700" :
                                  item.verdict === "أقل من السوق" ? "bg-blue-50 text-blue-700" :
                                  "bg-muted text-muted-foreground"
                                )}>
                                  {item.verdict}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {analysis.missingInfo.length > 0 && (
                    <ListSection icon={FileQuestion} title="معلومات ناقصة / توضيحات مطلوبة" items={analysis.missingInfo} dotClass="bg-amber-500/50" iconClass="text-amber-500" />
                  )}

                  <ListSection icon={MessageCircle} title="إرشادات التفاوض" items={analysis.negotiationGuidance} dotClass="bg-blue-500/50" iconClass="text-blue-500" />

                  <Button variant="ghost" size="sm" onClick={() => setExpanded(false)} className="w-full text-xs text-muted-foreground hover:text-foreground rounded-xl gap-1.5">
                    <ChevronUp size={14} />
                    إخفاء التفاصيل
                  </Button>
                </>
              )}

              <div className="text-[10px] text-muted-foreground/60 text-center pt-2 border-t border-border/20">
                هذا التحليل استرشادي ولا يُعد تقييماً رسمياً مرخصاً. يُنصح بالتحقق الميداني والاستشارة المتخصصة قبل اتخاذ القرار النهائي.
              </div>

              <div className="flex justify-center pt-1">
                <Button variant="ghost" size="sm" onClick={() => runDealCheck()} className="text-xs text-muted-foreground hover:text-foreground rounded-xl">
                  <Loader2 size={12} strokeWidth={1.5} className="ml-1" />
                  إعادة التحليل
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TRUST_LEVEL_CONFIG: Record<string, { bg: string; text: string; border: string; barColor: string }> = {
  "ممتاز": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", barColor: "bg-emerald-500" },
  "جيد جداً": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", barColor: "bg-blue-500" },
  "جيد": { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", barColor: "bg-sky-500" },
  "متوسط": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", barColor: "bg-amber-500" },
  "ضعيف": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", barColor: "bg-red-500" },
};

const FACTOR_LABELS: Record<string, string> = {
  data_completeness: "اكتمال البيانات",
  asset_verification: "التحقق من الأصول",
  price_logic: "منطقية السعر",
  legal_clarity: "الوضوح القانوني",
  media_quality: "جودة الوسائط",
};

const FACTOR_WEIGHTS: Record<string, number> = {
  data_completeness: 20,
  asset_verification: 25,
  price_logic: 20,
  legal_clarity: 20,
  media_quality: 15,
};

const TrustScoreSection = ({ trustScore }: { trustScore: any }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const levelStyle = TRUST_LEVEL_CONFIG[trustScore.level] || TRUST_LEVEL_CONFIG["متوسط"];
  const scorePercent = Math.min(100, (trustScore.trust_score / 10) * 100);

  return (
    <div className={cn("rounded-xl p-4 border", levelStyle.bg, levelStyle.border)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star size={16} strokeWidth={1.3} className={levelStyle.text} />
          <span className={cn("text-sm font-medium", levelStyle.text)}>مؤشر موثوقية الصفقة</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-lg font-bold", levelStyle.text)}>
            {trustScore.trust_score} / 10
          </span>
          <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-medium", levelStyle.bg, levelStyle.text, levelStyle.border, "border")}>
            {trustScore.level}
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full h-2 rounded-full bg-background/60 mb-3">
        <div className={cn("h-2 rounded-full transition-all", levelStyle.barColor)} style={{ width: `${scorePercent}%` }} />
      </div>

      <p className="text-sm leading-relaxed mb-3">{trustScore.summary}</p>

      {/* Strengths / Weaknesses / Warnings */}
      {trustScore.strengths?.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-medium text-emerald-700 mb-1">نقاط القوة:</div>
          <div className="flex flex-wrap gap-1">
            {trustScore.strengths.map((s: string, i: number) => (
              <span key={i} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">✓ {s}</span>
            ))}
          </div>
        </div>
      )}
      {trustScore.weaknesses?.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-medium text-amber-700 mb-1">نقاط الضعف:</div>
          <div className="flex flex-wrap gap-1">
            {trustScore.weaknesses.map((w: string, i: number) => (
              <span key={i} className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">• {w}</span>
            ))}
          </div>
        </div>
      )}
      {trustScore.warnings?.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-medium text-red-700 mb-1">تحذيرات:</div>
          <div className="flex flex-wrap gap-1">
            {trustScore.warnings.map((w: string, i: number) => (
              <span key={i} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md">⚠ {w}</span>
            ))}
          </div>
        </div>
      )}

      {/* Factor breakdown toggle */}
      {trustScore.factors && (
        <button onClick={() => setDetailsOpen(!detailsOpen)} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 mt-2">
          {detailsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          تفصيل المعايير
        </button>
      )}
      {detailsOpen && trustScore.factors && (
        <div className="mt-2 space-y-1.5">
          {Object.entries(trustScore.factors).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-24 shrink-0">{FACTOR_LABELS[key] || key} ({FACTOR_WEIGHTS[key]}%)</span>
              <div className="flex-1 h-1.5 rounded-full bg-background/60">
                <div className={cn("h-1.5 rounded-full",
                  (value as number) >= 7 ? "bg-emerald-500" :
                  (value as number) >= 5 ? "bg-amber-500" : "bg-red-500"
                )} style={{ width: `${((value as number) / 10) * 100}%` }} />
              </div>
              <span className="text-[10px] font-medium w-6 text-left">{value as number}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AnalysisSection = ({ icon: Icon, title, content }: { icon: any; title: string; content: string }) => (
  <div>
    <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
      <Icon size={15} strokeWidth={1.3} className="text-primary/60" />
      {title}
    </h4>
    <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
  </div>
);

const ListSection = ({
  icon: Icon, title, items, dotClass, iconClass
}: { icon: any; title: string; items: string[]; dotClass: string; iconClass: string }) => (
  <div>
    <h4 className="font-medium text-sm flex items-center gap-2 mb-2.5">
      <Icon size={15} strokeWidth={1.3} className={iconClass} />
      {title}
    </h4>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 leading-relaxed">
          <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", dotClass)} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default DealCheckPanel;
