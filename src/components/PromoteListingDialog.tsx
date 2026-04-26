import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Sparkles, Clock, Crown } from "lucide-react";
import SarSymbol from "@/components/SarSymbol";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string | null;
}

const PromoteListingDialog = ({ open, onOpenChange, listingId, listingTitle }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const [selected, setSelected] = useState("7days");
  const [submitting, setSubmitting] = useState(false);

  const plans = [
    { id: "3days", label: t("promoteListing.duration.days3"), price: 49, days: 3, icon: Sparkles },
    { id: "7days", label: t("promoteListing.duration.days7"), price: 99, days: 7, icon: Clock },
    { id: "30days", label: t("promoteListing.duration.days30"), price: 299, days: 30, icon: Crown },
  ];

  const handlePromote = async () => {
    if (!user) return;
    const plan = plans.find(p => p.id === selected)!;
    setSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.days);

      const { error } = await supabase.from("promoted_listings").insert({
        listing_id: listingId,
        promoted_by: user.id,
        promotion_type: "featured",
        expires_at: expiresAt.toISOString(),
        amount_paid: plan.price,
      });

      if (error) throw error;
      toast.success(`${t("promoteListing.success")} — ${plan.label}`);
      onOpenChange(false);
    } catch (err) {
      console.error("[Promote] error", err);
      toast.error(t("promoteListing.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            {t("promoteListing.title")}
          </DialogTitle>
          <DialogDescription>
            {t("promoteListing.desc", { title: listingTitle || t("promoteListing.defaultTitle") })}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selected} onValueChange={setSelected} className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${selected === plan.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
              <RadioGroupItem value={plan.id} id={plan.id} />
              <Label htmlFor={plan.id} className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <plan.icon size={14} className="text-amber-500" />
                    <span className="text-sm font-medium">{plan.label}</span>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {plan.price} <SarSymbol size={9} />
                  </span>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
          <p>• {t("promoteListing.benefits.top")}</p>
          <p>• {t("promoteListing.benefits.badge")}</p>
          <p>• {t("promoteListing.benefits.priority")}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">{t("promoteListing.cancel")}</Button>
          <Button onClick={handlePromote} disabled={submitting} size="sm">
            {submitting ? t("promoteListing.promoting") : t("promoteListing.promoteNow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromoteListingDialog;
