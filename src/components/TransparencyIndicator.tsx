import { Shield, TrendingUp, Eye, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateTransparency, type TransparencyResult } from "@/lib/transparencyScore";
import { useState } from "react";

interface TransparencyIndicatorProps {
  listing: any;
  compact?: boolean;
  className?: string;
  onFieldClick?: (fieldKey: string) => void;
}

const LEVEL_STYLES = {
  high: { bg: "bg-success/10", border: "border-success/30", text: "text-success", barClass: "bg-success", badgeBg: "bg-success/15" },
  medium: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", barClass: "bg-warning", badgeBg: "bg-warning/15" },
  low: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", barClass: "bg-destructive", badgeBg: "bg-destructive/15" },
};

const IMPACT_MESSAGES: Record<string, { message: string; icon: typeof TrendingUp }> = {
  high: { message: "إعلانك سيظهر بشارة \"موثوق\" — الإعلانات الموثوقة تحصل على تواصل أكثر بـ 3 أضعاف", icon: TrendingUp },
  medium: { message: "أكمل بعض الحقول لتحصل على شارة \"موثوق\" وترتيب أعلى في نتائج البحث", icon: TrendingUp },
  low: { message: "الإعلانات منخفضة الشفافية قد تُرفض أو تحصل على مشاهدات أقل بكثير", icon: TrendingUp },
};

const TransparencyIndicator = ({ listing, compact = false, className, onFieldClick }: TransparencyIndicatorProps) => {
  const result = calculateTransparency(listing);
  const style = LEVEL_STYLES[result.level];
  const impact = IMPACT_MESSAGES[result.level];
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", style.barClass)} style={{ width: `${result.score}%` }} />
        </div>
        <span className={cn("text-xs whitespace-nowrap", style.text)}>{result.label} {result.score}%</span>
      </div>
    );
  }

  const hasMissing = result.missingFields.length > 0;

  return (
    <div className={cn("rounded-xl border overflow-hidden", style.bg, style.border, className)}>
      {/* Header */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield size={14} className={style.text} />
            <span className={cn("text-xs font-semibold", style.text)}>{result.label}</span>
          </div>
          <span className={cn("text-lg font-bold tabular-nums", style.text)}>{result.score}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-background/50 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500", style.barClass)} style={{ width: `${result.score}%` }} />
        </div>

        <p className="text-[10px] text-muted-foreground">
          {result.filledRequired} من {result.totalRequired} حقل مطلوب مكتمل
        </p>
      </div>

      {/* Badge preview */}
      <div className="px-3 pb-2">
        <div className={cn("rounded-lg p-2 flex items-center gap-2", style.badgeBg)}>
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", result.level === "high" ? "bg-success/20" : result.level === "medium" ? "bg-warning/20" : "bg-destructive/20")}>
            {result.level === "high" ? (
              <Shield size={12} className="text-success" />
            ) : (
              <Eye size={12} className={style.text} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-muted-foreground">شارة إعلانك في السوق</p>
            <p className={cn("text-[11px] font-semibold", style.text)}>
              {result.level === "high" ? "✓ موثوق" : result.level === "medium" ? "⚠ يحتاج تحسين" : "✗ غير مكتمل"}
            </p>
          </div>
        </div>
      </div>

      {/* Impact message */}
      <div className="px-3 pb-2">
        <div className="flex items-start gap-1.5 bg-background/40 rounded-lg p-2">
          <impact.icon size={12} className={cn("shrink-0 mt-0.5", style.text)} />
          <p className="text-[10px] leading-relaxed text-muted-foreground">{impact.message}</p>
        </div>
      </div>

      {/* Missing fields */}
      {hasMissing && (
        <div className="border-t border-border/20">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-background/30 transition-colors"
          >
            <span className="text-[11px] font-medium text-muted-foreground">
              {result.missingFields.length} حقل ناقص — أكملها لرفع شفافيتك
            </span>
            {expanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
          </button>

          {expanded && (
            <div className="px-3 pb-3 space-y-1.5">
              {result.missingFields.map((field) => (
                <div
                  key={field}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2.5 py-1.5 bg-background/50 border border-border/20",
                    onFieldClick && "cursor-pointer hover:bg-background/80 transition-colors"
                  )}
                  onClick={() => onFieldClick?.(field)}
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={10} className="text-warning" />
                    <span className="text-[11px] text-foreground">{field}</span>
                  </div>
                  {onFieldClick && (
                    <span className="text-[10px] text-primary font-medium">أكمل ←</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransparencyIndicator;
