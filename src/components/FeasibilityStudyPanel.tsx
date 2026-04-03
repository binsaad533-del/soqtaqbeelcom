import { useState, useRef } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Users, MapPin, Shield,
  ChevronDown, ChevronUp, Loader2, BarChart3, Target, AlertTriangle,
  CheckCircle2, Building2, Clock, Lightbulb, Download, FileText,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import SarSymbol from "@/components/SarSymbol";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  _meta?: { activityType: string; hasRealCompetitorData: boolean; generatedAt: string };
}

interface FeasibilityStudyPanelProps {
  listing: any;
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

const FeasibilityStudyPanel = ({ listing }: FeasibilityStudyPanelProps) => {
  const [study, setStudy] = useState<FeasibilityStudy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    investment: true,
    costs: false,
    revenue: true,
    competitors: true,
    risks: false,
    recommendations: true,
  });
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const runStudy = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("feasibility-study", {
        body: { listing },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "فشل في إنشاء الدراسة");
      setStudy(data.study);
      setExpandedSections({ summary: true, investment: true, costs: true, revenue: true, competitors: true, risks: true, recommendations: true });
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft > 0) {
        position -= pdf.internal.pageSize.getHeight();
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      const fileName = `feasibility-study-${listing.title?.replace(/\s+/g, "-") || listing.id || "report"}.pdf`;
      pdf.save(fileName);
    } catch {
      console.error("PDF generation failed");
    } finally {
      setPdfLoading(false);
    }
  };

  if (!study) {
    return (
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AiStar size={18} />
          <h3 className="text-base font-semibold">دراسة الجدوى الاقتصادية</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          تحليل شامل يتضمن: العائد على الاستثمار، التكاليف التشغيلية، تحليل المنافسين القريبين عبر خرائط قوقل، وسيناريوهات الربحية
        </p>
        {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        <Button onClick={runStudy} disabled={loading} className="w-full gap-2" size="lg">
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              جاري إعداد الدراسة... (قد تستغرق 30 ثانية)
            </>
          ) : (
            <>
              <BarChart3 size={16} />
              إعداد دراسة الجدوى
              <AiStar size={14} />
            </>
          )}
        </Button>
      </div>
    );
  }

  const v = VERDICT_COLORS[study.verdictColor] || VERDICT_COLORS.blue;
  const rs = study.revenueProjections.realistic;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AiStar size={18} />
          <h3 className="text-base font-semibold">دراسة الجدوى الاقتصادية</h3>
          {study._meta?.hasRealCompetitorData && (
            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">بيانات Google Maps</span>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={downloadPDF} disabled={pdfLoading} className="gap-1.5 text-xs">
            {pdfLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={runStudy} disabled={loading} className="gap-1.5 text-xs">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            تحديث
          </Button>
        </div>
      </div>

      {/* Verdict Badge */}
      <div className={cn("rounded-xl border p-4 flex items-center justify-between", v.bg, v.border)}>
        <div>
          <div className={cn("text-lg font-bold", v.text)}>{study.verdict}</div>
          <div className="text-xs text-muted-foreground">مستوى الثقة: {study.confidenceLevel}</div>
        </div>
        <div className="text-left">
          <div className="text-xs text-muted-foreground">فترة الاسترداد (واقعي)</div>
          <div className={cn("text-xl font-bold", v.text)}>{rs.roiMonths} <span className="text-sm font-normal">شهر</span></div>
        </div>
      </div>

      {/* Report body */}
      <div ref={reportRef} className="space-y-2.5 bg-background">
        {/* Executive Summary */}
        <CollapsibleSection
          title="الملخص التنفيذي"
          icon={<Target size={14} />}
          isOpen={expandedSections.summary}
          onToggle={() => toggleSection("summary")}
        >
          <p className="text-sm leading-relaxed text-muted-foreground">{study.executiveSummary}</p>
        </CollapsibleSection>

        {/* Investment Overview */}
        <CollapsibleSection
          title="هيكل الاستثمار"
          icon={<DollarSign size={14} />}
          isOpen={expandedSections.investment}
          onToggle={() => toggleSection("investment")}
          badge={<span className="text-xs font-mono">{formatNum(study.investmentOverview.totalInvestment)} <SarSymbol className="inline w-2.5 h-2.5" /></span>}
        >
          <div className="space-y-1.5">
            {study.investmentOverview.breakdownItems.map((item, i) => (
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
          title="التكاليف التشغيلية الشهرية"
          icon={<TrendingDown size={14} />}
          isOpen={expandedSections.costs}
          onToggle={() => toggleSection("costs")}
          badge={<span className="text-xs font-mono">{formatNum(study.operationalCosts.monthlyTotal)} <SarSymbol className="inline w-2.5 h-2.5" />/شهر</span>}
        >
          <div className="space-y-1.5">
            {study.operationalCosts.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-mono">{formatNum(item.monthlyCost)} <SarSymbol className="inline w-2.5 h-2.5 opacity-50" /></span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Revenue Projections */}
        <CollapsibleSection
          title="سيناريوهات الربحية"
          icon={<TrendingUp size={14} />}
          isOpen={expandedSections.revenue}
          onToggle={() => toggleSection("revenue")}
        >
          <div className="grid grid-cols-3 gap-2">
            <ScenarioCard label="متفائل" scenario={study.revenueProjections.optimistic} color="emerald" icon={<ArrowUpRight size={12} />} />
            <ScenarioCard label="واقعي" scenario={study.revenueProjections.realistic} color="blue" icon={<Minus size={12} />} />
            <ScenarioCard label="متحفظ" scenario={study.revenueProjections.conservative} color="amber" icon={<ArrowDownRight size={12} />} />
          </div>
        </CollapsibleSection>

        {/* Competitor Analysis */}
        <CollapsibleSection
          title="تحليل المنافسين"
          icon={<Users size={14} />}
          isOpen={expandedSections.competitors}
          onToggle={() => toggleSection("competitors")}
          badge={
            <span className={cn("text-xs font-semibold", DENSITY_COLORS[study.competitorAnalysis.competitiveDensity] || "")}>
              {study.competitorAnalysis.competitiveDensity}
            </span>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{study.competitorAnalysis.summary}</p>

            {/* Radius counts */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                <div className="text-lg font-bold">{study.competitorAnalysis.nearbyCount}</div>
                <div className="text-[10px] text-muted-foreground">500م (الشارع)</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                <div className="text-lg font-bold">{study.competitorAnalysis.neighborhoodCount}</div>
                <div className="text-[10px] text-muted-foreground">2كم (الحي)</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                <div className="text-lg font-bold">{study.competitorAnalysis.areaCount}</div>
                <div className="text-[10px] text-muted-foreground">10كم (المنطقة)</div>
              </div>
            </div>

            {/* Top competitors */}
            {study.competitorAnalysis.topCompetitors && study.competitorAnalysis.topCompetitors.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">أبرز المنافسين:</div>
                {study.competitorAnalysis.topCompetitors.slice(0, 5).map((c, i) => (
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
            {study.competitorAnalysis.opportunities && study.competitorAnalysis.opportunities.length > 0 && (
              <div>
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">فرص التميّز:</div>
                {study.competitorAnalysis.opportunities.map((o, i) => (
                  <div key={i} className="flex gap-1.5 text-xs text-muted-foreground"><CheckCircle2 size={10} className="text-emerald-500 shrink-0 mt-0.5" />{o}</div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Risk Assessment */}
        <CollapsibleSection
          title="تقييم المخاطر"
          icon={<Shield size={14} />}
          isOpen={expandedSections.risks}
          onToggle={() => toggleSection("risks")}
          badge={<span className={cn("text-xs font-semibold", RISK_COLORS[study.riskAssessment.overallRisk] || "")}>{study.riskAssessment.overallRisk}</span>}
        >
          <div className="space-y-2">
            <RiskGroup label="مخاطر مالية" items={study.riskAssessment.financialRisks} />
            <RiskGroup label="مخاطر تشغيلية" items={study.riskAssessment.operationalRisks} />
            <RiskGroup label="مخاطر سوقية" items={study.riskAssessment.marketRisks} />
            {study.riskAssessment.regulatoryRisks && study.riskAssessment.regulatoryRisks.length > 0 && (
              <RiskGroup label="مخاطر تنظيمية" items={study.riskAssessment.regulatoryRisks} />
            )}
            {study.riskAssessment.mitigationStrategies && study.riskAssessment.mitigationStrategies.length > 0 && (
              <div>
                <div className="text-xs font-medium text-primary mb-1">استراتيجيات التخفيف:</div>
                {study.riskAssessment.mitigationStrategies.map((s, i) => (
                  <div key={i} className="flex gap-1.5 text-xs text-muted-foreground"><Lightbulb size={10} className="text-primary shrink-0 mt-0.5" />{s}</div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Recommendations */}
        <CollapsibleSection
          title="التوصيات"
          icon={<Lightbulb size={14} />}
          isOpen={expandedSections.recommendations}
          onToggle={() => toggleSection("recommendations")}
        >
          <div className="space-y-1.5">
            {study.recommendations.map((r, i) => (
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
          {study.disclaimer}
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

const ScenarioCard = ({ label, scenario, color, icon }: { label: string; scenario: Scenario; color: string; icon: React.ReactNode }) => (
  <div className={cn("rounded-lg border p-2.5 space-y-1.5", `border-${color}-500/20 bg-${color}-500/5`)}>
    <div className="flex items-center gap-1 text-xs font-medium">
      <span className={`text-${color}-600 dark:text-${color}-400`}>{icon}</span>
      {label}
    </div>
    <div className="text-center">
      <div className={cn("text-sm font-bold", `text-${color}-700 dark:text-${color}-300`)}>
        {formatNum(scenario.monthlyProfit)}
      </div>
      <div className="text-[9px] text-muted-foreground">ربح شهري <SarSymbol className="inline w-2 h-2" /></div>
    </div>
    <div className="flex justify-between text-[9px] text-muted-foreground">
      <span>ROI: {scenario.annualROI}%</span>
      <span>{scenario.roiMonths} شهر</span>
    </div>
    <div className="text-[9px] text-muted-foreground/70 leading-relaxed">{scenario.assumptions}</div>
  </div>
);

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
