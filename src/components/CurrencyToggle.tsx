import { useCurrency } from "@/contexts/CurrencyContext";
import { DollarSign } from "lucide-react";
import SarSymbol from "@/components/SarSymbol";

const CurrencyToggle = () => {
  const { currency, setCurrency } = useCurrency();

  return (
    <button
      onClick={() => setCurrency(currency === "SAR" ? "USD" : "SAR")}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors text-xs font-medium flex items-center gap-1"
      title={currency === "SAR" ? "Switch to USD" : "التبديل للريال"}
    >
      {currency === "SAR" ? (
        <SarSymbol size={15} />
      ) : (
        <DollarSign size={15} strokeWidth={1.5} />
      )}
      <span className="hidden sm:inline">{currency === "SAR" ? "﷼" : "$"}</span>
    </button>
  );
};

export default CurrencyToggle;
