import { Shield, Sparkles } from "lucide-react";
import DealStructureEngine, { type DealStructureSelection } from "@/components/DealStructureEngine";

interface Props {
  dealStructure: DealStructureSelection;
  setDealStructure: (value: DealStructureSelection) => void;
  stepDirection: "next" | "prev";
}

const CreateListingStep1 = ({ dealStructure, setDealStructure, stepDirection }: Props) => (
  <div key="step-0" className={`space-y-6 ${stepDirection === "next" ? "animate-step-slide-in-next" : "animate-step-slide-in-prev"}`}>
    <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-5 border border-primary/10 text-center">
      <Shield size={28} strokeWidth={1.5} className="text-primary mx-auto mb-3" />
      <h2 className="font-semibold text-sm mb-1">اختر هيكل الصفقة المناسب</h2>
      <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed mb-2">
        حدد نوع الصفقة وسيتم تخصيص المتطلبات تلقائياً حسب اختيارك
      </p>
      <p className="text-sm font-bold text-success animate-fade-in [animation-delay:0.4s] [animation-fill-mode:backwards]">
        ✦ الـAI يحدد كل شيء لك تلقائياً ✦
      </p>
    </div>

    <DealStructureEngine
      value={dealStructure}
      onChange={(value) => setDealStructure(value)}
    />
  </div>
);

export default CreateListingStep1;
