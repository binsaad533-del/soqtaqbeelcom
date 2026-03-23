import { Shield, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgeProps {
  score: number;
  verificationLevel?: string;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  className?: string;
}

const getTrustLevel = (score: number) => {
  if (score >= 75) return { label: "موثوق", color: "text-success", bg: "bg-success/10", Icon: ShieldCheck };
  if (score >= 50) return { label: "متوسط", color: "text-warning", bg: "bg-warning/10", Icon: Shield };
  if (score >= 25) return { label: "منخفض", color: "text-orange-500", bg: "bg-orange-500/10", Icon: ShieldAlert };
  return { label: "مريب", color: "text-destructive", bg: "bg-destructive/10", Icon: ShieldX };
};

const getVerificationLabel = (level: string) => {
  switch (level) {
    case "full": return "موثق بالكامل";
    case "basic": return "توثيق أساسي";
    case "phone": return "رقم موثق";
    default: return "غير موثق";
  }
};

const sizeMap = {
  sm: { icon: 12, text: "text-[10px]", px: "px-1.5 py-0.5", gap: "gap-1" },
  md: { icon: 14, text: "text-xs", px: "px-2 py-1", gap: "gap-1.5" },
  lg: { icon: 16, text: "text-sm", px: "px-3 py-1.5", gap: "gap-2" },
};

const TrustBadge = ({ score, verificationLevel = "none", size = "sm", showScore = false, className }: TrustBadgeProps) => {
  const trust = getTrustLevel(score);
  const s = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center rounded-lg", s.gap, s.px, trust.bg, className)}>
      <trust.Icon size={s.icon} className={trust.color} strokeWidth={1.5} />
      <span className={cn(s.text, trust.color, "font-medium")}>{trust.label}</span>
      {showScore && <span className={cn(s.text, "text-muted-foreground")}>({score})</span>}
      {verificationLevel !== "none" && (
        <span className={cn(s.text, "text-muted-foreground border-r border-border/50 pr-1.5 mr-0.5")}>
          {getVerificationLabel(verificationLevel)}
        </span>
      )}
    </div>
  );
};

export default TrustBadge;
