import { cn } from "@/lib/utils";
import { Handshake, FileCheck, ArrowRightLeft, CheckCircle2 } from "lucide-react";

type DealStage = "negotiation" | "agreement" | "transfer" | "completed";

const stages: { key: DealStage; label: string; icon: React.ElementType }[] = [
  { key: "negotiation", label: "التفاوض", icon: Handshake },
  { key: "agreement", label: "اتفاق", icon: FileCheck },
  { key: "transfer", label: "نقل الملكية", icon: ArrowRightLeft },
  { key: "completed", label: "مكتملة", icon: CheckCircle2 },
];

interface DealProgressBarProps {
  currentStage: DealStage;
  className?: string;
}

export function getDealStage(deal: {
  status?: string;
  agreed_price?: number | null;
  locked?: boolean;
  escrow_status?: string;
}, hasAgreement?: boolean, bothApproved?: boolean): DealStage {
  // Completed / finalized
  if (deal.status === "completed" || deal.status === "finalized") return "completed";

  // Transfer stage: escrow_status indicates transfer started
  if (deal.escrow_status === "transferring" || deal.escrow_status === "confirmed") return "transfer";

  // Agreement stage: confirmed status or locked with agreement
  if (deal.status === "confirmed") return "agreement";
  if (hasAgreement && deal.locked) return "transfer";
  if (hasAgreement || bothApproved) return "agreement";
  if (deal.locked) return "agreement";

  // Default: negotiation
  return "negotiation";
}

const DealProgressBar = ({ currentStage, className }: DealProgressBarProps) => {
  const currentIndex = stages.findIndex(s => s.key === currentStage);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-4 right-[10%] left-[10%] h-[2px] bg-border/30 -z-0" />
        <div
          className="absolute top-4 right-[10%] h-[2px] bg-primary transition-all duration-500 -z-0"
          style={{ width: `${(currentIndex / (stages.length - 1)) * 80}%` }}
        />

        {stages.map((stage, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const Icon = stage.icon;

          return (
            <div key={stage.key} className="flex flex-col items-center gap-1.5 z-10 flex-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary/15 border-primary text-primary scale-110"
                    : "bg-muted/50 border-border/40 text-muted-foreground/50"
                )}
              >
                <Icon size={14} strokeWidth={1.5} />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isCompleted
                    ? "text-primary"
                    : isCurrent
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground/50"
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DealProgressBar;
