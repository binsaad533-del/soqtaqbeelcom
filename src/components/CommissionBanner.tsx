import { COMMISSION_RATE, VAT_RATE, calculateCommission, calculateVat, calculateTotalWithVat, BANK_DETAILS } from "@/hooks/useCommissions";
import { Info } from "lucide-react";
import SarSymbol from "@/components/SarSymbol";

interface Props {
  dealAmount: number | null | undefined;
  showDetails?: boolean;
  className?: string;
}

const CommissionBanner = ({ dealAmount, showDetails = false, className = "" }: Props) => {
  const commissionAmount = dealAmount ? calculateCommission(dealAmount) : null;
  const vatAmount = commissionAmount ? calculateVat(commissionAmount) : null;
  const totalWithVat = commissionAmount ? calculateTotalWithVat(commissionAmount) : null;

  return (
    <div className={`bg-muted/20 rounded-xl p-4 pb-5 border border-border/20 mb-4 ${className}`}>
      <div className="flex items-start gap-2.5">
        <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium mb-1.5">عمولة المنصة: {COMMISSION_RATE * 100}% + ضريبة القيمة المضافة {VAT_RATE * 100}%</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed break-words">
            تُدفع من قبل البائع بعد إتمام الصفقة عبر التحويل البنكي لحساب شركة عين جساس
          </p>
          {showDetails && commissionAmount !== null && dealAmount && vatAmount !== null && totalWithVat !== null && (
            <div className="mt-2 pt-2 border-t border-border/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">قيمة الصفقة</span>
                <span className="font-medium">{Number(dealAmount).toLocaleString("en-US")} <SarSymbol size={10} /></span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">العمولة ({COMMISSION_RATE * 100}%)</span>
                <span className="font-medium">{commissionAmount.toLocaleString("en-US")} <SarSymbol size={10} /></span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">ضريبة القيمة المضافة ({VAT_RATE * 100}%)</span>
                <span className="font-medium">{vatAmount.toLocaleString("en-US")} <SarSymbol size={10} /></span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold pt-1.5 border-t border-border/20">
                <span className="text-primary">الإجمالي المستحق</span>
                <span className="text-primary">{totalWithVat.toLocaleString("en-US")} <SarSymbol size={10} /></span>
              </div>
              <div className="pt-1.5 mt-1.5 border-t border-border/15">
                <p className="text-[10px] text-muted-foreground">
                  المستفيد: {BANK_DETAILS.beneficiary} | {BANK_DETAILS.bank}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  IBAN: {BANK_DETAILS.iban}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommissionBanner;
