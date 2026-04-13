import { useState, useRef, useEffect } from "react";
import { Copy, CheckCircle2, Upload, Loader2, Landmark, PartyPopper, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BANK_DETAILS,
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_COLORS,
  VAT_RATE,
  type Commission,
  type CommissionStatus,
} from "@/hooks/useCommissions";
import { useCommissions } from "@/hooks/useCommissions";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";
import { generateCommissionReceiptPdf } from "@/lib/commissionReceiptPdf";

interface Props {
  commission: Commission;
  isSeller: boolean;
  onUpdate: () => void;
}

const CommissionPaymentPanel = ({ commission, isSeller, onUpdate }: Props) => {
  const { markAsPaid, uploadReceipt } = useCommissions();
  const [uploading, setUploading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Show success message on first render if deal just completed
  useEffect(() => {
    if (commission.payment_status === "unpaid" && isSeller) {
      setShowSuccess(true);
      const t = setTimeout(() => setShowSuccess(false), 10000);
      return () => clearTimeout(t);
    }
  }, []);

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("تم النسخ");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = await uploadReceipt(commission.id, file);
    if (path) {
      const { error } = await markAsPaid(commission.id, path);
      if (!error) {
        toast.success("تم رفع الإيصال وتسجيل الدفع بنجاح");
        onUpdate();
      } else {
        toast.error("فشل تسجيل الدفع");
      }
    } else {
      toast.error("فشل رفع الإيصال");
    }
    setUploading(false);
  };

  const handleMarkPaid = async () => {
    const { error } = await markAsPaid(commission.id);
    if (!error) {
      toast.success("تم تحديث حالة الدفع — يرجى رفع إيصال التحويل لاحقاً");
      onUpdate();
    }
  };

  const status = commission.payment_status as CommissionStatus;
  const isCompleted = status === "verified";
  const isPaidOrProof = status === "paid_unverified" || status === "paid_proof_uploaded" || status === "verified";

  return (
    <div className="bg-card rounded-2xl shadow-soft border border-border/30 overflow-hidden">
      {/* Success message for seller */}
      {showSuccess && isSeller && (
        <div className="bg-primary/5 border-b border-primary/10 p-5 text-center">
          <PartyPopper size={28} className="text-primary mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">تم إتمام الصفقة بنجاح 🎉</p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            نذكركم بلطف بسداد عمولة المنصة (1%) عبر التحويل البنكي.
            <br />
            نشكر لكم أمانتكم والتزامكم 🤍
          </p>
        </div>
      )}

      <div className="p-5 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark size={16} className="text-primary" />
            <h3 className="font-medium text-sm">دفع العمولة</h3>
          </div>
          <Badge variant="outline" className={`text-[10px] ${COMMISSION_STATUS_COLORS[status]}`}>
            {COMMISSION_STATUS_LABELS[status]}
          </Badge>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Amount breakdown */}
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">عمولة المنصة ({(commission.commission_rate * 100)}%)</span>
            <span className="font-medium">{commission.commission_amount.toLocaleString("en-US")} <SarSymbol size={10} /></span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">ضريبة القيمة المضافة ({VAT_RATE * 100}%)</span>
            <span className="font-medium">{(commission.vat_amount ?? commission.commission_amount * VAT_RATE).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <SarSymbol size={10} /></span>
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t border-primary/10">
            <span className="font-semibold text-primary">الإجمالي المستحق</span>
            <span className="font-bold text-primary text-base">
              {(commission.total_with_vat ?? commission.commission_amount * (1 + VAT_RATE)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <SarSymbol size={14} />
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            ({(commission.commission_rate * 100)}% من {commission.deal_amount.toLocaleString("en-US")} <SarSymbol size={9} /> + ضريبة {VAT_RATE * 100}%)
          </p>
        </div>

        {/* Bank details - show when not fully paid */}
        {!isCompleted && (
          <div className="space-y-2.5">
            <p className="text-xs font-medium">بيانات التحويل</p>
            {[
              { label: "اسم المستفيد", value: BANK_DETAILS.beneficiary, key: "beneficiary" },
              { label: "البنك", value: BANK_DETAILS.bank, key: "bank" },
              { label: "رقم الحساب", value: BANK_DETAILS.accountNumber, key: "account" },
              { label: "رقم الآيبان", value: BANK_DETAILS.iban, key: "iban" },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-xs font-mono">{item.value}</p>
                </div>
                <button
                  onClick={() => copyText(item.value, item.key)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  {copiedField === item.key
                    ? <CheckCircle2 size={14} className="text-emerald-500" />
                    : <Copy size={14} className="text-muted-foreground" />
                  }
                </button>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground text-center">
              يرجى رفع إثبات التحويل بعد السداد
            </p>
          </div>
        )}

        {/* Trust message */}
        <div className="bg-muted/20 rounded-xl px-4 py-3 border border-border/20">
          <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
            هذه المنصة قائمة على الثقة والمسؤولية، والتزامك بسداد العمولة يدعم استمرارية الخدمة للجميع.
          </p>
        </div>

        {/* Actions for seller */}
        {isSeller && !isPaidOrProof && (
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleUploadReceipt}
              className="hidden"
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-xl gap-2"
            >
              {uploading
                ? <><Loader2 size={14} className="animate-spin" />جاري الرفع...</>
                : <><Upload size={14} />رفع إيصال التحويل</>
              }
            </Button>
            <Button
              onClick={handleMarkPaid}
              variant="outline"
              className="w-full rounded-xl text-xs"
            >
              تم سداد العمولة (بدون إيصال)
            </Button>
          </div>
        )}

      {isPaidOrProof && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-center text-xs">
              <CheckCircle2 size={14} className={COMMISSION_STATUS_COLORS[status]} />
              <span className={COMMISSION_STATUS_COLORS[status]}>
                {COMMISSION_STATUS_LABELS[status]}
                {commission.marked_paid_at && ` — ${new Date(commission.marked_paid_at).toLocaleDateString("en-US")}`}
              </span>
            </div>
            {isCompleted && isSeller && (
              <Button
                variant="outline"
                className="w-full rounded-xl text-xs gap-1.5"
                onClick={async () => {
                  try {
                    const year = new Date(commission.paid_at || commission.marked_paid_at || commission.created_at).getFullYear();
                    await generateCommissionReceiptPdf({
                      receiptNumber: `RCT-${year}-${commission.id.slice(0, 6).toUpperCase()}`,
                      paidAt: commission.paid_at || commission.marked_paid_at || commission.created_at,
                      dealTitle: `صفقة #${commission.deal_id.slice(0, 8)}`,
                      agreementNumber: `AGR-${year}-${commission.deal_id.slice(0, 6).toUpperCase()}`,
                      dealAmount: commission.deal_amount,
                      commissionRate: commission.commission_rate,
                      commissionAmount: commission.commission_amount,
                      vatAmount: commission.vat_amount ?? commission.commission_amount * VAT_RATE,
                      totalWithVat: commission.total_with_vat ?? commission.commission_amount * (1 + VAT_RATE),
                      sellerName: "—",
                      sellerPhone: "—",
                    });
                  } catch { toast.error("فشل تحميل الإيصال"); }
                }}
              >
                <Download size={13} /> تحميل إيصال السداد
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommissionPaymentPanel;
