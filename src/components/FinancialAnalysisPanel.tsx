import { useState, useCallback } from "react";
import { Calculator, TrendingUp, Clock, DollarSign, Loader2 } from "lucide-react";
import AiStar from "@/components/AiStar";
import SarSymbol from "@/components/SarSymbol";

interface FinancialAnalysis {
  investmentCost: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  roi: number;
  breakEvenMonths: number;
  paybackMonths: number;
  cashFlow12: { month: number; revenue: number; expenses: number; profit: number; cumulative: number }[];
}

interface Props {
  price: number;
  annualRent?: number;
  monthlyRevenue?: number;
  monthlyExpenses?: number;
}

const FinancialAnalysisPanel = ({ price, annualRent = 0, monthlyRevenue, monthlyExpenses }: Props) => {
  const [open, setOpen] = useState(false);

  // Estimate if not provided
  const estRevenue = monthlyRevenue || price * 0.08 / 12; // ~8% annual return estimate
  const estExpenses = monthlyExpenses || (annualRent / 12) + (estRevenue * 0.3); // rent + 30% of revenue

  const monthlyProfit = estRevenue - estExpenses;
  const roi = price > 0 ? ((monthlyProfit * 12) / price) * 100 : 0;
  const breakEvenMonths = monthlyProfit > 0 ? Math.ceil(price / monthlyProfit) : -1;
  const paybackMonths = breakEvenMonths;

  // 12-month cash flow
  const cashFlow = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const cumulative = monthlyProfit * month - price;
    return {
      month,
      revenue: Math.round(estRevenue),
      expenses: Math.round(estExpenses),
      profit: Math.round(monthlyProfit),
      cumulative: Math.round(cumulative),
    };
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-border/40 hover:border-primary/20 hover:bg-primary/[0.03] transition-all text-right"
      >
        <Calculator size={14} className="text-primary shrink-0" />
        <span className="text-[11px] font-medium text-foreground/80">تحليل مالي سريع</span>
        <AiStar size={12} className="mr-auto" />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/[0.02] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <AiStar size={14} />
          <span className="text-xs font-semibold">التحليل المالي</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-[10px] text-muted-foreground hover:text-foreground">إغلاق</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-card p-2 border border-border/30">
          <div className="text-[9px] text-muted-foreground">العائد السنوي (ROI)</div>
          <div className={`text-sm font-bold ${roi > 0 ? "text-success" : "text-destructive"}`}>
            {roi.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg bg-card p-2 border border-border/30">
          <div className="text-[9px] text-muted-foreground">فترة الاسترداد</div>
          <div className="text-sm font-bold text-foreground">
            {breakEvenMonths > 0 ? `${breakEvenMonths} شهر` : "غير محدد"}
          </div>
        </div>
        <div className="rounded-lg bg-card p-2 border border-border/30">
          <div className="text-[9px] text-muted-foreground flex items-center gap-0.5">ربح شهري <SarSymbol size={7} /></div>
          <div className={`text-sm font-bold ${monthlyProfit > 0 ? "text-success" : "text-destructive"}`}>
            {monthlyProfit.toLocaleString("en-US")}
          </div>
        </div>
        <div className="rounded-lg bg-card p-2 border border-border/30">
          <div className="text-[9px] text-muted-foreground">نقطة التعادل</div>
          <div className="text-sm font-bold text-foreground">
            {breakEvenMonths > 0 ? `شهر ${breakEvenMonths}` : "—"}
          </div>
        </div>
      </div>

      {/* Cash Flow Table */}
      <div className="text-[9px]">
        <div className="font-medium text-foreground/80 mb-1">التدفق النقدي (12 شهر)</div>
        <div className="max-h-32 overflow-y-auto rounded-lg border border-border/20">
          <table className="w-full text-center">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground">
                <th className="py-1 px-1.5">الشهر</th>
                <th className="py-1 px-1.5">إيرادات</th>
                <th className="py-1 px-1.5">مصاريف</th>
                <th className="py-1 px-1.5">صافي تراكمي</th>
              </tr>
            </thead>
            <tbody>
              {cashFlow.map(row => (
                <tr key={row.month} className="border-t border-border/10">
                  <td className="py-0.5">{row.month}</td>
                  <td className="py-0.5 text-success">{(row.revenue / 1000).toFixed(0)}K</td>
                  <td className="py-0.5 text-destructive">{(row.expenses / 1000).toFixed(0)}K</td>
                  <td className={`py-0.5 font-medium ${row.cumulative >= 0 ? "text-success" : "text-destructive"}`}>
                    {(row.cumulative / 1000).toFixed(0)}K
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[8px] text-muted-foreground/60 leading-relaxed">
        * تقديرات استرشادية بناءً على البيانات المتوفرة. لا تُعد نصيحة مالية رسمية.
      </p>
    </div>
  );
};

export default FinancialAnalysisPanel;
