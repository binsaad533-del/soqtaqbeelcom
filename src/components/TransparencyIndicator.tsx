import { Shield, TrendingUp, CheckCircle2, AlertCircle, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateTransparency, type ChecklistItem } from "@/lib/transparencyScore";


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

const TIER_INFO: Record<string, { badge: string; hint: string }> = {
  trusted: { badge: "موثوق", hint: "الإعلانات الموثوقة تحصل على تواصل أكثر بـ 3 أضعاف" },
  yellow: { badge: "يحتاج تحسين", hint: "أكمل بعض الحقول للحصول على شارة \"موثوق\" وترتيب أعلى" },
  orange: { badge: "ضعيف", hint: "أضف المزيد من البيانات والصور لتحسين ظهور الإعلان" },
  red: { badge: "غير مكتمل", hint: "الإعلانات منخفضة الشفافية قد تُرفض أو تحصل على مشاهدات أقل" },
};

const TransparencyIndicator = ({ listing, compact = false, className, onFieldClick }: TransparencyIndicatorProps) => {
  const result = calculateTransparency(listing);
  const style = getScoreStyle(result.score);
  const tier = TIER_INFO[style.tier];
  

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

  // Split checklist: filled first, then missing
  const filledItems = result.checklist.filter(i => i.filled);
  const missingItems = result.checklist.filter(i => !i.filled);

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

      {/* Checklist — always visible */}
      <div className="border-t border-border/15 px-3.5 py-3 space-y-1.5">
        {filledItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-success shrink-0" />
            <span className="text-[11px] text-foreground">{item.label}</span>
          </div>
        ))}
        {missingItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-2",
              onFieldClick && "cursor-pointer hover:text-primary transition-colors"
            )}
            onClick={() => onFieldClick?.(item.label)}
          >
            <Square size={14} className="text-muted-foreground/30 shrink-0" />
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Impact hint */}
      <div className="px-3.5 pb-3 pt-0.5">
        <div className="flex items-start gap-2 bg-background/40 rounded-lg p-2.5">
          <TrendingUp size={12} className={cn("shrink-0 mt-0.5", style.text)} />
          <p className="text-[10px] leading-relaxed text-muted-foreground">{tier.hint}</p>
        </div>
      </div>
    </div>
  );
};

export default TransparencyIndicator;
