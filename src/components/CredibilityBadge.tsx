import { Shield, ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CredibilityCheck {
  name: string;
  score: number;
  max: number;
  details: string;
  status: "pass" | "warning" | "fail";
}

interface CredibilityData {
  score: number;
  grade: "excellent" | "good" | "moderate" | "low";
  label: string;
  checks: CredibilityCheck[];
  flags: string[];
  verified_at: string;
}

interface Props {
  data: CredibilityData | null;
  compact?: boolean;
}

const gradeConfig = {
  excellent: { color: "text-success", bg: "bg-success/10 border-success/20", icon: ShieldCheck },
  good: { color: "text-primary", bg: "bg-primary/10 border-primary/20", icon: ShieldCheck },
  moderate: { color: "text-warning", bg: "bg-warning/10 border-warning/20", icon: ShieldAlert },
  low: { color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", icon: ShieldX },
};

const CredibilityBadge = ({ data, compact = false }: Props) => {
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Shield size={14} strokeWidth={1.5} />
        <span>جاري التحقق...</span>
      </div>
    );
  }

  const config = gradeConfig[data.grade];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium", config.bg)}>
        <Icon size={14} strokeWidth={1.5} className={config.color} />
        <span className={config.color}>{data.label}</span>
        <span className="text-muted-foreground/60">{data.score}%</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-3", config.bg)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Icon size={18} strokeWidth={1.5} className={config.color} />
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium", config.color)}>{data.label}</span>
              <span className="text-xs text-muted-foreground">{data.score}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">تحقق بالذكاء الاصطناعي</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border/30 pt-3">
          {data.checks.map((check, i) => (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  check.status === "pass" ? "bg-success" : check.status === "warning" ? "bg-warning" : "bg-destructive"
                )} />
                <span className="text-foreground/80">{check.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{check.details}</span>
                <span className="text-muted-foreground/50">{check.score}/{check.max}</span>
              </div>
            </div>
          ))}

          {data.flags.length > 0 && (
            <div className="mt-2 space-y-1">
              {data.flags.map((flag, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] text-destructive">
                  <ShieldX size={10} />
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[9px] text-muted-foreground/50 mt-2">
            آخر تحقق: {new Date(data.verified_at).toLocaleDateString("ar-SA")}
          </p>
        </div>
      )}
    </div>
  );
};

export default CredibilityBadge;
