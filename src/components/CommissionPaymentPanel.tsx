import { useState, useRef } from "react";
import { Copy, CheckCircle2, Upload, Loader2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BANK_DETAILS, type Commission } from "@/hooks/useCommissions";
import { useCommissions } from "@/hooks/useCommissions";
import { toast } from "sonner";

interface Props {
  commission: Commission;
  isSeller: boolean;
  onUpdate: () => void;
}

const CommissionPaymentPanel = ({ commission, isSeller, onUpdate }: Props) => {
  const { markAsPaid, uploadReceipt } = useCommissions();
  const [uploading, setUploading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
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
        toast.success("تم تسجيل الدفع بنجاح");
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
      toast.success("تم تحديث حالة الدفع");
      onUpdate();
    }
  };

  const isPaid = commission.payment_status === "paid";

  return (
    <div className="bg-card rounded-2xl shadow-soft border border-border/30 overflow-hidden">
      <div className="p-5 border-b border-border/20">
        <div className="flex items-center gap-2 mb-1">
          <Landmark size={16} className="text-primary" />
          <h3 className="font-medium text-sm">دفع العمولة</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          عمولة المنصة مستحقة بعد إتمام الصفقة
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Amount */}
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 text-center">
          <p className="text-[11px] text-muted-foreground mb-1">المبلغ المستحق</p>
          <p className="text-xl font-semibold text-primary">
            {commission.commission_amount.toLocaleString("en-US")} ر.س
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            ({(commission.commission_rate * 100)}% من {commission.deal_amount.toLocaleString("en-US")} ر.س)
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">حالة الدفع</span>
          <span className={isPaid ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
            {isPaid ? "✓ تم الدفع" : "غير مدفوع"}
          </span>
        </div>

        {/* Bank details */}
        {!isPaid && (
          <div className="space-y-2.5">
            <p className="text-xs font-medium">تفاصيل الحساب البنكي</p>
            {[
              { label: "المستفيد", value: BANK_DETAILS.beneficiary, key: "beneficiary" },
              { label: "البنك", value: BANK_DETAILS.bank, key: "bank" },
              { label: "الآيبان", value: BANK_DETAILS.iban, key: "iban" },
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
          </div>
        )}

        {/* Trust message */}
        <div className="bg-muted/20 rounded-xl px-4 py-3 border border-border/20">
          <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
            هذه المنصة قائمة على الثقة والمسؤولية، والتزامك بسداد العمولة يدعم استمرارية الخدمة للجميع.
          </p>
        </div>

        {/* Actions for seller */}
        {isSeller && !isPaid && (
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
              variant="outline"
            >
              {uploading
                ? <><Loader2 size={14} className="animate-spin" />جاري الرفع...</>
                : <><Upload size={14} />رفع إيصال التحويل</>
              }
            </Button>
            <Button
              onClick={handleMarkPaid}
              variant="ghost"
              className="w-full rounded-xl text-xs text-muted-foreground"
            >
              تأكيد الدفع بدون إيصال
            </Button>
          </div>
        )}

        {isPaid && commission.marked_paid_at && (
          <div className="flex items-center gap-2 justify-center text-xs text-emerald-600">
            <CheckCircle2 size={14} />
            <span>تم تأكيد الدفع في {new Date(commission.marked_paid_at).toLocaleDateString("ar-SA")}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommissionPaymentPanel;
