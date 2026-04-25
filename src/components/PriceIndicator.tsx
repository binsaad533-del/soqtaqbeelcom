import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { mapFairnessToKey, mapFairnessLabelToKey } from "@/lib/condition-utils";

interface PriceIndicatorProps {
  fairnessVerdict?: string | null;
  className?: string;
}

const VERDICT_VISUAL: Record<string, { icon: typeof TrendingUp; color: string; bg: string }> = {
  fairness_attractive: { icon: TrendingDown, color: "text-success", bg: "bg-success/10" },
  fairness_fair: { icon: Minus, color: "text-primary", bg: "bg-primary/10" },
  fairness_overpriced: { icon: TrendingUp, color: "text-destructive", bg: "bg-destructive/10" },
  fairness_unclear: { icon: HelpCircle, color: "text-muted-foreground", bg: "bg-muted" },
};

const PriceIndicator = ({ fairnessVerdict, className }: PriceIndicatorProps) => {
  const { t } = useTranslation();
  if (!fairnessVerdict) return null;

  const verdictKey = mapFairnessToKey(fairnessVerdict);
  const visual = VERDICT_VISUAL[verdictKey] || VERDICT_VISUAL.fairness_unclear;
  const Icon = visual.icon;
  const label = t(`dealCheck.${mapFairnessLabelToKey(verdictKey)}`);

  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg", visual.bg, className)}>
      <Icon size={14} className={visual.color} />
      <span className={cn("text-xs font-medium", visual.color)}>{label}</span>
    </div>
  );
};

export default PriceIndicator;
