import { useState } from "react";
import { Activity, Eye, Heart, FileText, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface HealthReportProps {
  listingId: string;
}

interface ReportData {
  health_score: number;
  completeness_score: number;
  stats: {
    total_views: number;
    recent_views: number;
    likes: number;
    offers: number;
    engagement_rate: number;
  };
  recommendations: string[];
}

const ListingHealthReport = ({ listingId }: HealthReportProps) => {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data: result } = await supabase.functions.invoke("listing-health-report", {
        body: { listing_id: listingId },
      });
      setData(result);
    } catch { /* */ }
    setLoading(false);
  };

  const scoreColor = (score: number) =>
    score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive";

  const scoreLabel = (score: number) =>
    score >= 70 ? "ممتاز" : score >= 40 ? "يحتاج تحسين" : "ضعيف";

  if (!data && !loading) {
    return (
      <div className="rounded-xl border border-border/40 p-4 bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-medium">تقرير صحة الإعلان</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">تقييم شامل لأداء إعلانك مع توصيات للتحسين</p>
        <Button onClick={generate} size="sm" variant="outline" className="w-full text-xs">
          إنشاء التقرير
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 p-4 bg-card flex items-center justify-center gap-2 py-8">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">جاري إنشاء التقرير...</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 p-4 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-medium">تقرير صحة الإعلان</h3>
        </div>
        <button onClick={generate} className="text-muted-foreground hover:text-foreground">
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Health Score */}
      <div className="text-center py-2">
        <span className={cn("text-3xl font-bold", scoreColor(data!.health_score))}>
          {data!.health_score}%
        </span>
        <p className={cn("text-xs mt-1", scoreColor(data!.health_score))}>
          {scoreLabel(data!.health_score)}
        </p>
      </div>

      {/* Completeness */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">اكتمال البيانات</span>
          <span className="font-medium">{data!.completeness_score}%</span>
        </div>
        <Progress value={data!.completeness_score} className="h-1.5" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: <Eye size={11} />, label: "مشاهدات", value: data!.stats.total_views, sub: `${data!.stats.recent_views} هذا الأسبوع` },
          { icon: <Heart size={11} />, label: "إعجابات", value: data!.stats.likes },
          { icon: <FileText size={11} />, label: "عروض", value: data!.stats.offers },
          { icon: <Activity size={11} />, label: "تفاعل", value: `${data!.stats.engagement_rate}%` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-muted/30 p-2">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              {stat.icon}
              <span className="text-[10px]">{stat.label}</span>
            </div>
            <span className="text-sm font-semibold">{stat.value}</span>
            {stat.sub && <p className="text-[9px] text-muted-foreground">{stat.sub}</p>}
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {data!.recommendations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-primary">توصيات التحسين</p>
          {data!.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
              <AlertCircle size={10} className="text-warning shrink-0 mt-0.5" />
              <span>{rec}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListingHealthReport;
