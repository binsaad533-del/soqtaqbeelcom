import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, X, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListings } from "@/hooks/useListings";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";
import { cn } from "@/lib/utils";

interface QuickPriceEditProps {
  listingId: string;
  currentPrice: number | null;
  onUpdated?: (newPrice: number) => void;
  className?: string;
}

const QuickPriceEdit = ({ listingId, currentPrice, onUpdated, className }: QuickPriceEditProps) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(currentPrice ? String(currentPrice) : "");
  const [saving, setSaving] = useState(false);
  const { updateListing } = useListings();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    const numPrice = Number(price);
    if (!price || isNaN(numPrice) || numPrice <= 0) {
      toast.error(t("listing.priceUpdate.invalidPrice"));
      return;
    }
    setSaving(true);
    const { error } = await updateListing(listingId, { price: numPrice } as never);
    setSaving(false);
    if (error) {
      toast.error(t("listing.priceUpdate.updateFailed"));
    } else {
      toast.success(t("listing.priceUpdate.updateSuccess"));
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      onUpdated?.(numPrice);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={cn("flex items-center gap-1 text-xs text-primary hover:underline", className)}
      >
        <Edit3 size={12} /> {t("listing.editPrice")}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <input
          type="text"
          inputMode="numeric"
          lang="en"
          dir="ltr"
          value={price}
          onChange={(e) => {
            const val = e.target.value
              .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
              .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
              .replace(/[^0-9]/g, '');
            setPrice(val);
          }}
          autoFocus
          className="w-full px-3 py-1.5 rounded-lg border border-primary/30 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
          placeholder="السعر الجديد"
        />
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground"><SarSymbol size={10} /></span>
      </div>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className="h-8 px-3 rounded-lg gradient-primary text-primary-foreground"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => { setEditing(false); setPrice(currentPrice ? String(currentPrice) : ""); }}
        className="h-8 px-2 rounded-lg"
      >
        <X size={14} />
      </Button>
    </div>
  );
};

export default QuickPriceEdit;
