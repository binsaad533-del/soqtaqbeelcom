import { Shield, AlertTriangle, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateTransparency, type TransparencyResult } from "@/lib/transparencyScore";

interface TransparencyIndicatorProps {
  listing: any;
  compact?: boolean;
  className?: string;
}

const LEVEL_STYLES = {
  high: { bg: "bg-success/10", border: "border-success/30", text: "text-success", barClass: "bg-success" },
  medium: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", barClass: "bg-warning" },
  low: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", barClass: "bg-destructive" },
};

const TransparencyIndicator = ({ listing, compact = false, className }: TransparencyIndicatorProps) => {
  const result = calculateTransparency(listing);
  const style = LEVEL_STYLES[result.level];

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

  return (
    <div className={cn("rounded-xl p-3 space-y-2", style.bg, style.border, "border", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield size={14} className={style.text} />
          <span className={cn("text-xs font-medium", style.text)}>{result.label}</span>
        </div>
        <span className={cn("text-xs font-medium", style.text)}>{result.score}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-background/50 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", style.barClass)} style={{ width: `${result.score}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {result.filledRequired} من {result.totalRequired} حقل مطلوب لنوع الصفقة مكتمل
      </p>
      {result.missingFields.length > 0 && result.missingFields.length <= 4 && (
        <div className="flex flex-wrap gap-1">
          {result.missingFields.map((f) => (
            <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-background/50 text-muted-foreground">
              ⚠ {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransparencyIndicator;
