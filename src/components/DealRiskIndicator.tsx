import { AlertTriangle, CheckCircle, ShieldAlert, XOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DealRiskIndicatorProps {
  riskScore: number | null;
  riskFactors?: string[];
  compact?: boolean;
  className?: string;
}

const getRiskLevel = (score: number) => {
  if (score <= 25) return { label: "آمن", color: "text-success", bg: "bg-success/10", Icon: CheckCircle };
  if (score <= 50) return { label: "خطر متوسط", color: "text-warning", bg: "bg-warning/10", Icon: AlertTriangle };
  if (score <= 75) return { label: "خطر مرتفع", color: "text-orange-500", bg: "bg-orange-500/10", Icon: ShieldAlert };
  return { label: "خطر حرج", color: "text-destructive", bg: "bg-destructive/10", Icon: XOctagon };
};

const DealRiskIndicator = ({ riskScore, riskFactors = [], compact = false, className }: DealRiskIndicatorProps) => {
  if (riskScore === null || riskScore === undefined) return null;

  const risk = getRiskLevel(riskScore);

  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg", risk.bg, className)}>
        <risk.Icon size={12} className={risk.color} strokeWidth={1.5} />
        <span className={cn("text-[10px] font-medium", risk.color)}>{risk.label}</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-4", risk.bg, "border-current/10", className)}>
      <div className="flex items-center gap-2 mb-2">
        <risk.Icon size={16} className={risk.color} strokeWidth={1.5} />
        <span className={cn("text-sm font-medium", risk.color)}>{risk.label}</span>
        <span className="text-xs text-muted-foreground mr-auto">({riskScore}/100)</span>
      </div>
      {riskFactors.length > 0 && (
        <ul className="space-y-1">
          {riskFactors.map((factor, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={cn("w-1 h-1 rounded-full", risk.color.replace("text-", "bg-"))} />
              {factor}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DealRiskIndicator;
