import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceIndicatorProps {
  fairnessVerdict?: string | null;
  className?: string;
}

const VERDICT_CONFIG: Record<string, { label: string; icon: typeof TrendingUp; color: string; bg: string }> = {
  "جذاب": { label: "السعر جذاب", icon: TrendingDown, color: "text-success", bg: "bg-success/10" },
  "معقول": { label: "السعر معقول", icon: Minus, color: "text-primary", bg: "bg-primary/10" },
  "مبالغ فيه": { label: "السعر مبالغ فيه", icon: TrendingUp, color: "text-destructive", bg: "bg-destructive/10" },
  "غير واضح": { label: "السعر غير محدد", icon: HelpCircle, color: "text-muted-foreground", bg: "bg-muted" },
};

const PriceIndicator = ({ fairnessVerdict, className }: PriceIndicatorProps) => {
  if (!fairnessVerdict) return null;

  const config = VERDICT_CONFIG[fairnessVerdict] || VERDICT_CONFIG["غير واضح"];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg", config.bg, className)}>
      <Icon size={14} className={config.color} />
      <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
    </div>
  );
};

export default PriceIndicator;
