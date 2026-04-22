import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Shield, FileText } from "lucide-react";
import { toast } from "sonner";

interface CategorySummary {
  legal: number;
  invoice: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: CategorySummary;
  isRequesting: boolean;
  onSubmit: (message: string) => Promise<{
    status: "auto_approved" | "pending" | "already_approved" | "already_pending";
  }>;
}

const MAX_MESSAGE = 500;

const RequestAccessDialog = ({
  open,
  onOpenChange,
  summary,
  isRequesting,
  onSubmit,
}: Props) => {
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    try {
      const res = await onSubmit(message);
      switch (res.status) {
        case "auto_approved":
          toast.success("✓ تم اعتماد طلبك تلقائياً — يمكنك الاطلاع على الوثائق الآن");
          break;
        case "already_approved":
          toast.success("لديك وصول مسموح بالفعل لهذه الوثائق");
          break;
        case "already_pending":
          toast("طلبك السابق ما زال قيد المراجعة");
          break;
        case "pending":
        default:
          toast.success("تم إرسال طلبك للبائع للمراجعة");
          break;
      }
      setMessage("");
      onOpenChange(false);
    } catch (err) {
      const e = err as Error & { code?: number };
      if (e.code === 429) {
        toast.warning("تجاوزت الحد المسموح (5 طلبات/ساعة) — حاول لاحقاً");
      } else if (e.message) {
        toast.error(e.message);
      } else {
        toast.error("تعذّر إرسال الطلب — تحقق من الاتصال وحاول مجدداً");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield size={18} className="text-primary" strokeWidth={1.5} />
            طلب الوصول للوثائق المحمية
          </DialogTitle>
          <DialogDescription>
            ستطلب موافقة البائع للاطلاع على الوثائق الحساسة الخاصة بهذا الإعلان.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1.5">
            <div className="text-xs font-medium text-foreground mb-1">الوثائق المطلوبة:</div>
            {summary.legal > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText size={12} className="text-primary" strokeWidth={1.5} />
                <span>{summary.legal} وثيقة قانونية (سجل تجاري، عقد إيجار، رخص...)</span>
              </div>
            )}
            {summary.invoice > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText size={12} className="text-primary" strokeWidth={1.5} />
                <span>{summary.invoice} فاتورة / عرض سعر</span>
              </div>
            )}
            {summary.legal === 0 && summary.invoice === 0 && (
              <div className="text-xs text-muted-foreground">جميع الوثائق المحمية في هذا الإعلان</div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="access-msg">
              رسالة للبائع <span className="text-muted-foreground">(اختياري)</span>
            </label>
            <Textarea
              id="access-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
              placeholder="مثال: أنا مهتم جدياً بالشراء، أرجو الاطلاع على الوثائق لاتخاذ القرار."
              rows={4}
              maxLength={MAX_MESSAGE}
              className="resize-none text-sm"
            />
            <div className="text-[11px] text-muted-foreground text-left">
              {message.length}/{MAX_MESSAGE}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRequesting}
          >
            إلغاء
          </Button>
          <Button onClick={handleSend} disabled={isRequesting}>
            {isRequesting ? (
              <>
                <Loader2 size={14} className="ml-2 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              "إرسال الطلب"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestAccessDialog;
