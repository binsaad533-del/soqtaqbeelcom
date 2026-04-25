import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDealSimulation } from "@/hooks/useDealSimulation";
import { Loader2, FlaskConical, ArrowRight } from "lucide-react";
import AiStar from "@/components/AiStar";
import SarSymbol from "@/components/SarSymbol";
import { cn } from "@/lib/utils";

interface Props {
  listingId: string;
}

const DealSimulationPanel = ({ listingId }: Props) => {
  const { t } = useTranslation();
  const { result, loading, simulate } = useDealSimulation();
  const [open, setOpen] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    if (!result) await simulate(listingId);
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-border/40 hover:border-primary/20 hover:bg-primary/[0.03] transition-all text-right"
      >
        <FlaskConical size={14} className="text-primary shrink-0" />
        <span className="text-[11px] font-medium text-foreground/80">{t("simulation.title")} — {t("simulation.whatIf")}</span>
        <AiStar size={12} className="mr-auto" />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/[0.02] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <AiStar size={14} />
          <span className="text-xs font-semibold">{t("simulation.title")}</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-[10px] text-muted-foreground hover:text-foreground">{t("common.close")}</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin text-primary" size={18} />
          <span className="text-[10px] text-muted-foreground mr-2">{t("simulation.simulating")}</span>
        </div>
      ) : result ? (
        <div className="space-y-2">
          <div className="text-[9px] text-muted-foreground flex items-center gap-1">
            {t("simulation.basePrice")} <SarSymbol size={7} /> <span className="font-medium text-foreground">{result.basePrice.toLocaleString("en-US")}</span>
          </div>
          
          <div className="space-y-1.5">
            {result.scenarios.map((s, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg p-2 border text-[10px]",
                  s.name === result.bestScenario
                    ? "bg-success/5 border-success/20"
                    : "bg-card border-border/20"
                )}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-foreground/90">{s.name}</span>
                  <span className={cn(
                    "text-[8px] px-1.5 py-0.5 rounded-full",
                    s.riskLevel === "low" ? "bg-success/10 text-success" :
                    s.riskLevel === "medium" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  )}>
                    {s.riskLevel === "low" ? t("common.low") : s.riskLevel === "medium" ? t("common.medium") : t("common.high")}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-0.5"><SarSymbol size={7} /> {s.adjustedPrice.toLocaleString("en-US")}</span>
                  <span>{t("simulation.commission")} {s.commission.toLocaleString("en-US")}</span>
                </div>
                <p className="text-[9px] text-foreground/60 mt-0.5">{s.recommendation}</p>
                {s.name === result.bestScenario && (
                  <div className="flex items-center gap-1 mt-1 text-success text-[9px] font-medium">
                    <ArrowRight size={8} /> {t("simulation.bestScenario")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground text-center py-4">{t("simulation.noData")}</p>
      )}
    </div>
  );
};

export default DealSimulationPanel;
