import { useState } from "react";
import {
  ShieldCheck, AlertTriangle, TrendingUp, Lightbulb, MessageCircle,
  ChevronDown, ChevronUp, MapPin, BarChart3, Briefcase, CheckCircle2,
  FileQuestion, Scale, Target, Loader2, Activity, ShoppingCart, Store
} from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
}

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

const DealCheckPanel = ({ listing }: DealCheckPanelProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<DealCheckAnalysis | null>(null);
  const [error, setError] = useState("");

  const runDealCheck = async () => {
    setLoading(true);
    setError("");
    setOpen(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("deal-check", {
        body: { listing },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "فشل التحليل");

      setAnalysis(data.analysis);
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء التحليل");
    } finally {
      setLoading(false);
    }
  };

  const ratingStyle = analysis ? RATING_CONFIG[analysis.ratingColor] || RATING_CONFIG.gray : RATING_CONFIG.gray;

  return (
    <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
      {/* Header */}
      <button
        onClick={() => {
          if (!analysis && !loading) {
            runDealCheck();
          } else {
            setOpen(!open);
          }
        }}
        className="w-full flex items-center justify-between p-5 hover:bg-accent/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
            <AiStar size={22} />
          </div>
          <div className="text-start">
            <h3 className="font-medium text-sm">فحص الصفقة والجدوى المبدئية</h3>
            <p className="text-[11px] text-muted-foreground">
              {analysis ? "تم إنشاء التحليل" : "تحليل ذكي شامل للصفقة"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis && (
            <span className={cn("text-[11px] px-2.5 py-1 rounded-lg border", ratingStyle.bg, ratingStyle.text, ratingStyle.border)}>
              {analysis.rating}
            </span>
          )}
          {!analysis && !loading && (
            <span className="text-[11px] px-3 py-1.5 rounded-lg bg-primary/8 text-primary border border-primary/15">
              ابدأ الفحص
            </span>
          )}
          {open ? <ChevronUp size={16} strokeWidth={1.3} className="text-muted-foreground" /> : <ChevronDown size={16} strokeWidth={1.3} className="text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5">
          {/* Loading State */}
          {loading && (
            <div className="py-16 flex flex-col items-center gap-4">
              <div className="relative">
                <AiStar size={36} />
                <Loader2 size={52} strokeWidth={1} className="absolute -top-2 -left-2 text-primary/30 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">جاري تحليل الصفقة...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  يتم فحص البيانات والأصول والموقع والسوق
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive mb-3">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={runDealCheck}
                className="rounded-xl text-xs"
              >
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* Analysis Result */}
          {analysis && !loading && (
            <div className="space-y-5">
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
                    <span className="text-[11px] text-muted-foreground">
                      ثقة: {analysis.confidenceLevel}
                    </span>
                  </div>
                </div>
                <p className={cn("text-lg font-medium", ratingStyle.text)}>{analysis.rating}</p>
              </div>

              {/* Recommendation */}
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <AiStar size={14} animate={false} />
                  <span className="text-xs font-medium text-primary">التوصية</span>
                </div>
                <p className="text-sm leading-relaxed">{analysis.recommendation}</p>
              </div>

              {/* Deal Overview */}
              <AnalysisSection
                icon={Briefcase}
                title="نظرة عامة على الصفقة"
                content={analysis.dealOverview}
              />

              {/* Business Activity */}
              <AnalysisSection
                icon={Activity}
                title="النشاط التجاري"
                content={analysis.businessActivity}
              />

              {/* Asset Assessment */}
              <AnalysisSection
                icon={CheckCircle2}
                title="تقييم الأصول والمعدات"
                content={analysis.assetAssessment}
              />

              {/* Location */}
              <AnalysisSection
                icon={MapPin}
                title="تقييم الموقع"
                content={analysis.locationAssessment}
              />

              {/* Competition */}
              <AnalysisSection
                icon={BarChart3}
                title="المنافسة والسوق"
                content={analysis.competitionSnapshot}
              />

              {/* Operational Readiness */}
              <AnalysisSection
                icon={ShieldCheck}
                title="الجاهزية التشغيلية"
                content={analysis.operationalReadiness}
              />

              {/* Market Comparison */}
              {analysis.marketComparison && (
                <div>
                  <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                    <Store size={15} strokeWidth={1.3} className="text-primary/60" />
                    مقارنة السوق المستعمل
                  </h4>

                  {/* Summary Stats */}
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

                  {/* Price Range */}
                  {analysis.marketComparison.observedPriceRange && analysis.marketComparison.observedPriceRange !== "غير متاح" && (
                    <div className="bg-accent/30 rounded-lg p-3 mb-3">
                      <div className="text-xs text-muted-foreground mb-1">النطاق السعري المرصود</div>
                      <div className="text-sm font-medium">{analysis.marketComparison.observedPriceRange}</div>
                    </div>
                  )}

                  {/* Details */}
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{analysis.marketComparison.details}</p>

                  {/* Asset Breakdown Table */}
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

              {/* Strengths */}
              <ListSection
                icon={TrendingUp}
                title="نقاط القوة"
                items={analysis.strengths}
                dotClass="bg-emerald-500/60"
                iconClass="text-emerald-600"
              />

              {/* Risks */}
              <ListSection
                icon={AlertTriangle}
                title="المخاطر"
                items={analysis.risks}
                dotClass="bg-red-500/50"
                iconClass="text-red-500/70"
              />

              {/* Missing Info */}
              {analysis.missingInfo.length > 0 && (
                <ListSection
                  icon={FileQuestion}
                  title="معلومات ناقصة / توضيحات مطلوبة"
                  items={analysis.missingInfo}
                  dotClass="bg-amber-500/50"
                  iconClass="text-amber-500"
                />
              )}

              {/* Negotiation Guidance */}
              <ListSection
                icon={MessageCircle}
                title="إرشادات التفاوض"
                items={analysis.negotiationGuidance}
                dotClass="bg-blue-500/50"
                iconClass="text-blue-500"
              />

              {/* Disclaimer */}
              <div className="text-[10px] text-muted-foreground/60 text-center pt-2 border-t border-border/20">
                هذا التحليل استرشادي ولا يُعد تقييماً رسمياً مرخصاً. يُنصح بالتحقق الميداني والاستشارة المتخصصة قبل اتخاذ القرار النهائي.
              </div>

              {/* Re-run button */}
              <div className="flex justify-center pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={runDealCheck}
                  className="text-xs text-muted-foreground hover:text-foreground rounded-xl"
                >
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
