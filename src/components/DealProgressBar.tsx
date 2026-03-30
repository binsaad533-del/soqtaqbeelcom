import { cn } from "@/lib/utils";
import { Handshake, FileCheck, ArrowRightLeft, CheckCircle2 } from "lucide-react";

export type DealStage = "negotiation" | "agreement" | "transfer" | "completed";

export interface StageTimestamps {
  negotiation?: string | null;
  agreement?: string | null;
  transfer?: string | null;
  completed?: string | null;
}

const stages: { key: DealStage; label: string; icon: React.ElementType }[] = [
  { key: "negotiation", label: "التفاوض", icon: Handshake },
  { key: "agreement", label: "اتفاق", icon: FileCheck },
  { key: "transfer", label: "نقل الملكية", icon: ArrowRightLeft },
  { key: "completed", label: "مكتملة", icon: CheckCircle2 },
];

interface DealProgressBarProps {
  currentStage: DealStage;
  timestamps?: StageTimestamps;
  className?: string;
}

export function getDealStage(deal: {
  status?: string;
  agreed_price?: number | null;
  locked?: boolean;
  escrow_status?: string;
}, hasAgreement?: boolean, bothApproved?: boolean): DealStage {
  if (deal.status === "completed" || deal.status === "finalized") return "completed";
  if (deal.escrow_status === "transferring" || deal.escrow_status === "confirmed") return "transfer";
  if (deal.status === "confirmed") return "agreement";
  if (hasAgreement && deal.locked) return "transfer";
  if (hasAgreement || bothApproved) return "agreement";
  if (deal.locked) return "agreement";
  return "negotiation";
}

/** Derive stage timestamps from deal data */
export function getStageTimestamps(deal: {
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  status?: string;
  escrow_status?: string;
}): StageTimestamps {
  const ts: StageTimestamps = {};
  // Negotiation always starts at deal creation
  ts.negotiation = deal.created_at || null;

  const stage = getDealStage(deal as any);
  const stageOrder: DealStage[] = ["negotiation", "agreement", "transfer", "completed"];
  const currentIdx = stageOrder.indexOf(stage);

  // For completed deals, use completed_at
  if (currentIdx >= 3 && deal.completed_at) {
    ts.completed = deal.completed_at;
  }

  // For stages between negotiation and current, we use updated_at as approximation
  if (currentIdx >= 1) {
    ts.agreement = deal.updated_at || null;
  }
  if (currentIdx >= 2) {
    ts.transfer = deal.updated_at || null;
  }

  return ts;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

const DealProgressBar = ({ currentStage, timestamps, className }: DealProgressBarProps) => {
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
          const ts = timestamps?.[stage.key];

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
              {ts && (isCompleted || isCurrent) && (
                <span className="text-[8px] text-muted-foreground/60 leading-none">
                  {formatTimestamp(ts)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DealProgressBar;
