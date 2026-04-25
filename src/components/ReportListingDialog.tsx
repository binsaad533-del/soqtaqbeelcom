import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sanitizeInput, isRateLimited } from "@/lib/security";
import { useTranslation } from "react-i18next";

const REPORT_REASONS = [
  { value: "misleading", label: "معلومات مضللة" },
  { value: "fraud", label: "احتيال أو نصب" },
  { value: "duplicate", label: "إعلان مكرر" },
  { value: "inappropriate", label: "محتوى غير لائق" },
  { value: "wrong_category", label: "تصنيف خاطئ" },
  { value: "other", label: "سبب آخر" },
];

interface ReportListingDialogProps {
  listingId: string;
  className?: string;
}

const ReportListingDialog = ({ listingId, className }: ReportListingDialogProps) => {
  const { user } = useAuthContext();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }
    if (!reason) {
      toast.error("يرجى اختيار سبب البلاغ");
      return;
    }

    // Rate limit: max 3 reports per 30 minutes
    if (isRateLimited(`report_${user.id}`, 3, 30 * 60 * 1000)) {
      toast.error("تم تجاوز الحد المسموح من البلاغات. يرجى الانتظار");
      return;
    }

    setSubmitting(true);
    try {
      const safeDetails = sanitizeInput(details, 1000);
      const { error } = await supabase.from("listing_reports" as any).insert({
        listing_id: listingId,
        reporter_id: user.id,
        reason,
        details: safeDetails || null,
      } as any);
      if (error) throw error;
      toast.success("تم إرسال البلاغ بنجاح، شكراً لمساهمتك");
      setOpen(false);
      setReason("");
      setDetails("");
    } catch {
      toast.error("حدث خطأ أثناء إرسال البلاغ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={`gap-1.5 text-muted-foreground hover:text-destructive ${className}`}>
          <Flag size={14} />
          {t("listing.report")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>الإبلاغ عن إعلان مخالف</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">اختر سبب البلاغ:</p>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`text-xs px-3 py-2 rounded-lg border transition-colors text-right ${
                    reason === r.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder="تفاصيل إضافية (اختياري)..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <Button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="w-full gap-1.5"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
            إرسال البلاغ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportListingDialog;
