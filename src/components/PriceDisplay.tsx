import { useCurrency } from "@/contexts/CurrencyContext";
import SarSymbol from "@/components/SarSymbol";
import { DollarSign } from "lucide-react";

interface PriceDisplayProps {
  /** Price in SAR */
  amount: number;
  size?: number;
  className?: string;
  showSymbol?: boolean;
}

/** Renders a price with the correct currency symbol based on user preference */
const PriceDisplay = ({ amount, size = 10, className = "", showSymbol = true }: PriceDisplayProps) => {
  const { currency, formatPrice } = useCurrency();

  return (
    <span className={className}>
      {formatPrice(amount)}{" "}
      {showSymbol && (
        currency === "SAR"
          ? <SarSymbol size={size} />
          : <span className="text-muted-foreground" style={{ fontSize: size }}>$</span>
      )}
    </span>
  );
};

export default PriceDisplay;
