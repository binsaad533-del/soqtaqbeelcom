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

const REPORT_REASON_VALUES = ["misleading", "fraud", "duplicate", "inappropriate", "wrong_category", "other"] as const;

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
      toast.error(t("reportListing.toasts.loginRequired"));
      return;
    }
    if (!reason) {
      toast.error(t("reportListing.toasts.chooseReason"));
      return;
    }

    // Rate limit: max 3 reports per 30 minutes
    if (isRateLimited(`report_${user.id}`, 3, 30 * 60 * 1000)) {
      toast.error(t("reportListing.toasts.rateLimited"));
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
      toast.success(t("reportListing.toasts.success"));
      setOpen(false);
      setReason("");
      setDetails("");
    } catch {
      toast.error(t("reportListing.toasts.failed"));
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
          <DialogTitle>{t("reportListing.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("reportListing.chooseReason")}</p>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_REASON_VALUES.map((value) => (
                <button
                  key={value}
                  onClick={() => setReason(value)}
                  className={`text-xs px-3 py-2 rounded-lg border transition-colors text-right ${
                    reason === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {t(`reportListing.reasons.${value}`)}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder={t("reportListing.detailsPlaceholder")}
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
            {t("reportListing.submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportListingDialog;
