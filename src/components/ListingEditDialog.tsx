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

  const Field = ({ label, field, placeholder, suffix, type = "text" }: { label: string; field: keyof typeof fields; placeholder: string; suffix?: string; type?: string }) => {
    if (!isFieldRelevant(dealType, field) && !["business_activity", "city", "district", "price"].includes(field)) {
      return null;
    }
    return (
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
        <div className="relative">
          <input
            type={type}
            value={fields[field]}
            onChange={(e) => setFields((prev) => ({ ...prev, [field]: e.target.value }))}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
          />
          {suffix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
        </div>
      </div>
    );
  };

  const SelectField = ({ label, field, options }: { label: string; field: keyof typeof fields; options: string[] }) => {
    if (!isFieldRelevant(dealType, field)) return null;
    return (
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
        <select
          value={fields[field]}
          onChange={(e) => setFields((prev) => ({ ...prev, [field]: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
        >
          <option value="">اختر...</option>
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  };

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
          <Field label="نوع النشاط *" field="business_activity" placeholder="مطعم وجبات سريعة" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="المدينة *" field="city" placeholder="الرياض" />
            <Field label="الحي" field="district" placeholder="حي النسيم" />
          </div>
          <Field label="السعر المطلوب *" field="price" placeholder="180000" suffix="ر.س" type="number" />
          <Field label="الإيجار السنوي" field="annual_rent" placeholder="45000" suffix="ر.س" type="number" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="مدة العقد" field="lease_duration" placeholder="3 سنوات" />
            <Field label="المتبقي من العقد" field="lease_remaining" placeholder="1.5 سنة" />
          </div>
          <Field label="الالتزامات المالية" field="liabilities" placeholder="لا توجد" />
          <Field label="رواتب متأخرة" field="overdue_salaries" placeholder="لا يوجد" />
          <Field label="إيجار متأخر" field="overdue_rent" placeholder="لا يوجد" />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="رخصة البلدية" field="municipality_license" options={["سارية", "منتهية", "غير متوفرة"]} />
            <SelectField label="الدفاع المدني" field="civil_defense_license" options={["سارية", "منتهية", "غير متوفرة"]} />
          </div>
          <SelectField label="كاميرات مراقبة" field="surveillance_cameras" options={["متوفرة ومطابقة", "متوفرة غير مطابقة", "غير متوفرة"]} />
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
