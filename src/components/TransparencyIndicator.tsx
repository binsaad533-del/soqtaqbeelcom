import { Shield, Eye, ChevronDown, ChevronUp, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateTransparency } from "@/lib/transparencyScore";
import { useState } from "react";

interface TransparencyIndicatorProps {
  listing: any;
  compact?: boolean;
  className?: string;
  onFieldClick?: (fieldKey: string) => void;
}

/* ── 4-tier color system ── */
const getScoreStyle = (score: number) => {
  if (score >= 80) return { bg: "bg-success/8", border: "border-success/20", text: "text-success", bar: "bg-success", ring: "ring-success/20", tier: "trusted" as const };
  if (score >= 60) return { bg: "bg-yellow-500/8", border: "border-yellow-500/20", text: "text-yellow-600 dark:text-yellow-400", bar: "bg-yellow-500", ring: "ring-yellow-500/20", tier: "yellow" as const };
  if (score >= 40) return { bg: "bg-orange-500/8", border: "border-orange-500/20", text: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500", ring: "ring-orange-500/20", tier: "orange" as const };
  return { bg: "bg-destructive/8", border: "border-destructive/20", text: "text-destructive", bar: "bg-destructive", ring: "ring-destructive/20", tier: "red" as const };
};

const TIER_INFO: Record<string, { badge: string; icon: "shield" | "eye"; hint: string }> = {
  trusted: { badge: "موثوق", icon: "shield", hint: "الإعلانات الموثوقة تحصل على تواصل أكثر بـ 3 أضعاف" },
  yellow: { badge: "يحتاج تحسين", icon: "eye", hint: "أكمل بعض الحقول للحصول على شارة \"موثوق\" وترتيب أعلى" },
  orange: { badge: "ضعيف", icon: "eye", hint: "أضف المزيد من البيانات والصور لتحسين ظهور الإعلان" },
  red: { badge: "غير مكتمل", icon: "eye", hint: "الإعلانات منخفضة الشفافية قد تُرفض أو تحصل على مشاهدات أقل" },
};

const TransparencyIndicator = ({ listing, compact = false, className, onFieldClick }: TransparencyIndicatorProps) => {
  const result = calculateTransparency(listing);
  const style = getScoreStyle(result.score);
  const tier = TIER_INFO[style.tier];
  const [expanded, setExpanded] = useState(false);
  const hasMissing = result.missingFields.length > 0;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500", style.bar)} style={{ width: `${result.score}%` }} />
        </div>
        <span className={cn("text-xs font-medium whitespace-nowrap", style.text)}>{result.score}%</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border overflow-hidden transition-colors", style.bg, style.border, className)}>
      {/* Score + bar */}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center ring-1", style.bg, style.ring)}>
              {style.tier === "trusted" ? (
                <CheckCircle2 size={16} className="text-success" />
              ) : (
                <AlertCircle size={16} className={style.text} />
              )}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground leading-none mb-0.5">اكتمال الإعلان</p>
              <p className={cn("text-xs font-semibold leading-none", style.text)}>{tier.badge}</p>
            </div>
          </div>
          <div className="text-left">
            <span className={cn("text-xl font-bold tabular-nums leading-none", style.text)}>{result.score}</span>
            <span className={cn("text-xs font-medium", style.text)}>%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-background/60 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700 ease-out", style.bar)}
            style={{ width: `${result.score}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {result.filledRequired} من {result.totalRequired} حقل مكتمل
          </p>
          {style.tier === "trusted" && (
            <span className="text-[10px] font-medium text-success flex items-center gap-0.5">
              <Shield size={9} /> شارة موثوق مفعّلة
            </span>
          )}
        </div>
      </div>

      {/* Impact hint */}
      <div className="px-3.5 pb-2.5">
        <div className="flex items-start gap-2 bg-background/40 rounded-lg p-2.5">
          <TrendingUp size={12} className={cn("shrink-0 mt-0.5", style.text)} />
          <p className="text-[10px] leading-relaxed text-muted-foreground">{tier.hint}</p>
        </div>
      </div>

      {/* Missing fields accordion */}
      {hasMissing && (
        <div className="border-t border-border/15">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-background/20 transition-colors"
          >
            <span className="text-[11px] font-medium text-muted-foreground">
              {result.missingFields.length} حقل ناقص
            </span>
            {expanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
          </button>

          {expanded && (
            <div className="px-3.5 pb-3 space-y-1">
              {result.missingFields.map((field) => (
                <div
                  key={field}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2.5 py-1.5 bg-background/50 border border-border/15",
                    onFieldClick && "cursor-pointer hover:bg-background/70 transition-colors"
                  )}
                  onClick={() => onFieldClick?.(field)}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1 h-1 rounded-full", style.bar)} />
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
