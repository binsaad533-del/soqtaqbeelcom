import { useState } from "react";
import { Loader2, Check, X, Edit3, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useListings, type Listing } from "@/hooks/useListings";
import { toast } from "sonner";
import { isFieldRelevant } from "@/lib/transparencyScore";
import { cn } from "@/lib/utils";

interface ListingEditDialogProps {
  listing: Listing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (updated: Partial<Listing>) => void;
}

/* ── tiny helper: should this field render? ── */
const shouldShow = (dealType: string, field: string) =>
  isFieldRelevant(dealType, field) || ["business_activity", "city", "district", "price"].includes(field);

const ListingEditDialog = ({ listing, open, onOpenChange, onUpdated }: ListingEditDialogProps) => {
  const dealType = listing.primary_deal_type || listing.deal_type || "full_takeover";
  const { updateListing } = useListings();
  const [saving, setSaving] = useState(false);

  const [fields, setFields] = useState({
    business_activity: listing.business_activity || "",
    city: listing.city || "",
    district: listing.district || "",
    price: listing.price != null ? String(listing.price) : "",
    annual_rent: listing.annual_rent != null ? String(listing.annual_rent) : "",
    lease_duration: listing.lease_duration || "",
    lease_remaining: listing.lease_remaining || "",
    liabilities: listing.liabilities || "",
    overdue_salaries: listing.overdue_salaries || "",
    overdue_rent: listing.overdue_rent || "",
    municipality_license: listing.municipality_license || "",
    civil_defense_license: listing.civil_defense_license || "",
    surveillance_cameras: listing.surveillance_cameras || "",
  });

  const set = (field: keyof typeof fields, value: string) =>
    setFields((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!fields.business_activity.trim() || !fields.city.trim() || !fields.price.trim() || Number(fields.price) <= 0) {
      toast.error("يرجى إكمال الحقول المطلوبة: النشاط، المدينة، والسعر");
      return;
    }

    setSaving(true);
    const updateData: any = {
      business_activity: fields.business_activity,
      city: fields.city,
      district: fields.district,
      price: Number(fields.price) || null,
      annual_rent: fields.annual_rent ? Number(fields.annual_rent) : null,
      lease_duration: fields.lease_duration || null,
      lease_remaining: fields.lease_remaining || null,
      liabilities: fields.liabilities || null,
      overdue_salaries: fields.overdue_salaries || null,
      overdue_rent: fields.overdue_rent || null,
      municipality_license: fields.municipality_license || null,
      civil_defense_license: fields.civil_defense_license || null,
      surveillance_cameras: fields.surveillance_cameras || null,
      title: `${fields.business_activity || "مشروع"} — ${fields.district || ""}, ${fields.city || ""}`,
    };

    const { error } = await updateListing(listing.id, updateData as never);
    setSaving(false);

    if (error) {
      toast.error("فشل حفظ التعديلات");
    } else {
      toast.success("تم حفظ التعديلات بنجاح");
      onUpdated?.(updateData);
      onOpenChange(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20";
  const selectOpts = (options: string[]) => (
    <>
      <option value="">اختر...</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 size={18} className="text-primary" />
            تعديل الإعلان
          </DialogTitle>
          <DialogDescription className="text-xs">
            عدّل البيانات المطلوبة واحفظ التغييرات — يتم عرض الحقول المناسبة لنوع الصفقة فقط
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* نوع النشاط */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">نوع النشاط *</label>
            <input type="text" value={fields.business_activity} onChange={(e) => set("business_activity", e.target.value)} placeholder="مطعم وجبات سريعة" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المدينة *</label>
              <input type="text" value={fields.city} onChange={(e) => set("city", e.target.value)} placeholder="الرياض" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الحي</label>
              <input type="text" value={fields.district} onChange={(e) => set("district", e.target.value)} placeholder="حي النسيم" className={inputCls} />
            </div>
          </div>

          {/* السعر */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">السعر المطلوب *</label>
            <div className="relative">
              <input type="number" value={fields.price} onChange={(e) => set("price", e.target.value)} placeholder="180000" className={inputCls} />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ر.س</span>
            </div>
          </div>

          {/* الإيجار السنوي */}
          {shouldShow(dealType, "annual_rent") && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الإيجار السنوي</label>
              <div className="relative">
                <input type="number" value={fields.annual_rent} onChange={(e) => set("annual_rent", e.target.value)} placeholder="45000" className={inputCls} />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ر.س</span>
              </div>
            </div>
          )}

          {/* مدة العقد / المتبقي */}
          {(shouldShow(dealType, "lease_duration") || shouldShow(dealType, "lease_remaining")) && (
            <div className="grid grid-cols-2 gap-3">
              {shouldShow(dealType, "lease_duration") && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">مدة العقد</label>
                  <input type="text" value={fields.lease_duration} onChange={(e) => set("lease_duration", e.target.value)} placeholder="3 سنوات" className={inputCls} />
                </div>
              )}
              {shouldShow(dealType, "lease_remaining") && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">المتبقي من العقد</label>
                  <input type="text" value={fields.lease_remaining} onChange={(e) => set("lease_remaining", e.target.value)} placeholder="1.5 سنة" className={inputCls} />
                </div>
              )}
            </div>
          )}

          {shouldShow(dealType, "liabilities") && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الالتزامات المالية</label>
              <input type="text" value={fields.liabilities} onChange={(e) => set("liabilities", e.target.value)} placeholder="لا توجد" className={inputCls} />
            </div>
          )}

          {shouldShow(dealType, "overdue_salaries") && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">رواتب متأخرة</label>
              <input type="text" value={fields.overdue_salaries} onChange={(e) => set("overdue_salaries", e.target.value)} placeholder="لا يوجد" className={inputCls} />
            </div>
          )}

          {shouldShow(dealType, "overdue_rent") && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">إيجار متأخر</label>
              <input type="text" value={fields.overdue_rent} onChange={(e) => set("overdue_rent", e.target.value)} placeholder="لا يوجد" className={inputCls} />
            </div>
          )}

          {/* التراخيص */}
          {(shouldShow(dealType, "municipality_license") || shouldShow(dealType, "civil_defense_license")) && (
            <div className="grid grid-cols-2 gap-3">
              {shouldShow(dealType, "municipality_license") && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">رخصة البلدية</label>
                  <select value={fields.municipality_license} onChange={(e) => set("municipality_license", e.target.value)} className={inputCls}>
                    {selectOpts(["سارية", "منتهية", "غير متوفرة"])}
                  </select>
                </div>
              )}
              {shouldShow(dealType, "civil_defense_license") && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الدفاع المدني</label>
                  <select value={fields.civil_defense_license} onChange={(e) => set("civil_defense_license", e.target.value)} className={inputCls}>
                    {selectOpts(["سارية", "منتهية", "غير متوفرة"])}
                  </select>
                </div>
              )}
            </div>
          )}

          {shouldShow(dealType, "surveillance_cameras") && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">كاميرات مراقبة</label>
              <select value={fields.surveillance_cameras} onChange={(e) => set("surveillance_cameras", e.target.value)} className={inputCls}>
                {selectOpts(["متوفرة ومطابقة", "متوفرة غير مطابقة", "غير متوفرة"])}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 gradient-primary text-primary-foreground rounded-xl">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            حفظ التعديلات
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ListingEditDialog;
