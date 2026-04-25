import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import DealStructureEngine, { type DealStructureSelection } from "@/components/DealStructureEngine";

interface Props {
  dealStructure: DealStructureSelection;
  setDealStructure: (value: DealStructureSelection) => void;
  stepDirection: "next" | "prev";
}

const CreateListingStep1 = ({ dealStructure, setDealStructure, stepDirection }: Props) => {
  const { t } = useTranslation();
  return (
    <div key="step-0" className={`space-y-6 ${stepDirection === "next" ? "animate-step-slide-in-next" : "animate-step-slide-in-prev"}`}>
      <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-5 border border-primary/10 text-center">
        <Shield size={28} strokeWidth={1.5} className="text-primary mx-auto mb-3" />
        <h2 className="font-semibold text-sm mb-1">{t("createListing.step1.header")}</h2>
        <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed mb-2">
          {t("createListing.step1.subheader")}
        </p>
        <p className="text-sm font-bold text-success animate-fade-in [animation-delay:0.4s] [animation-fill-mode:backwards]">
          {t("createListing.step1.aiBadge")}
        </p>
      </div>

      <DealStructureEngine
        value={dealStructure}
        onChange={(value) => setDealStructure(value)}
      />
    </div>
  );
};

export default CreateListingStep1;
