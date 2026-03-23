import { COMMISSION_RATE, calculateCommission } from "@/hooks/useCommissions";
import { Info } from "lucide-react";

interface Props {
  dealAmount: number | null | undefined;
  showDetails?: boolean;
  className?: string;
}

const CommissionBanner = ({ dealAmount, showDetails = false, className = "" }: Props) => {
  const amount = dealAmount ? calculateCommission(dealAmount) : null;

  return (
    <div className={`bg-muted/30 rounded-xl p-4 border border-border/30 ${className}`}>
      <div className="flex items-start gap-2.5">
        <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-medium mb-1">عمولة المنصة: {COMMISSION_RATE * 100}% من إجمالي قيمة الصفقة</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            تُدفع من قبل البائع بعد إتمام الصفقة مباشرة إلى حساب الشركة
          </p>
          {showDetails && amount !== null && dealAmount && (
            <div className="mt-2 pt-2 border-t border-border/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">قيمة الصفقة</span>
                <span className="font-medium">{Number(dealAmount).toLocaleString("en-US")} ر.س</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted-foreground">العمولة ({COMMISSION_RATE * 100}%)</span>
                <span className="font-medium text-primary">{amount.toLocaleString("en-US")} ر.س</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommissionBanner;
