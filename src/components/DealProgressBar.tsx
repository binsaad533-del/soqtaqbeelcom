import { cn } from "@/lib/utils";
import { FileText, MessageSquare, HandshakeIcon, Shield, ScrollText } from "lucide-react";

type DealStage = "listing" | "offer" | "negotiation" | "confirmation" | "agreement";

const stages: { key: DealStage; label: string; icon: React.ElementType }[] = [
  { key: "listing", label: "الإعلان", icon: FileText },
  { key: "offer", label: "العرض", icon: HandshakeIcon },
  { key: "negotiation", label: "التفاوض", icon: MessageSquare },
  { key: "confirmation", label: "التأكيد", icon: Shield },
  { key: "agreement", label: "الاتفاقية", icon: ScrollText },
];

interface DealProgressBarProps {
  currentStage: DealStage;
  className?: string;
}

export function getDealStage(deal: {
  status?: string;
  agreed_price?: number | null;
  locked?: boolean;
}, hasAgreement?: boolean, bothApproved?: boolean): DealStage {
  if (bothApproved) return "agreement";
  if (hasAgreement) return "agreement";
  if (deal.status === "completed" || deal.status === "finalized") return "agreement";
  if (deal.locked) return "confirmation";
  if (deal.status === "negotiating" && deal.agreed_price && Number(deal.agreed_price) > 0) return "confirmation";
  if (deal.status === "negotiating") return "negotiation";
  return "offer";
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
