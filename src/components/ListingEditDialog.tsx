import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, Edit3, Camera, MapPin, Package, FileText, Plus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListings, type Listing } from "@/hooks/useListings";
import { useResilientUpdate } from "@/hooks/useResilientUpdate";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";
import { isFieldRelevant } from "@/lib/transparencyScore";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import GoogleMapPicker, { type PlaceDetails } from "@/components/GoogleMapPicker";
import ListingEditErrorBoundary from "@/components/ListingEditErrorBoundary";

interface ListingEditDialogProps {
  listing: Listing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (updated: Partial<Listing>) => void;
  onDeleted?: () => void;
}

const shouldShow = (dealType: string, field: string) =>
  isFieldRelevant(dealType, field) || ["business_activity", "city", "district", "price"].includes(field);

const ListingEditDialogInner = ({ listing, open, onOpenChange, onUpdated, onDeleted }: ListingEditDialogProps) => {
  const dealType = listing.primary_deal_type || listing.deal_type || "full_takeover";
  const { updateListing, uploadFile, softDeleteListing } = useListings();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoGroup, setActivePhotoGroup] = useState<string | null>(null);

  // Resilient update with debounce + rate limit + retry
  const updateFn = useCallback(
    (payload: { id: string; data: Partial<Listing> }) => updateListing(payload.id, payload.data),
    [updateListing],
  );
  const { immediateMutate } = useResilientUpdate(updateFn);

  // ── Basic fields ──
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

  // ── Photos ──
  const [photos, setPhotos] = useState<Record<string, string[]>>(listing.photos || {});

  // ── Location ──
  const [locationLat, setLocationLat] = useState(listing.location_lat ?? null);
  const [locationLng, setLocationLng] = useState(listing.location_lng ?? null);

  // ── Inventory ──
  const [inventory, setInventory] = useState<any[]>(listing.inventory || []);

  // Reset state when listing changes or dialog reopens
  useEffect(() => {
    if (open) {
      setFields({
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
      setPhotos(listing.photos || {});
      setLocationLat(listing.location_lat ?? null);
      setLocationLng(listing.location_lng ?? null);
      setInventory(listing.inventory || []);
    }
  }, [open, listing]);

  const set = (field: keyof typeof fields, value: string) =>
    setFields((prev) => ({ ...prev, [field]: value }));

  const photoGroups = [
    { id: "interior", label: "داخلي" },
    { id: "exterior", label: "خارجي" },
    { id: "signage", label: "اللوحة" },
    { id: "equipment", label: "معدات" },
    { id: "other", label: "أخرى" },
  ];

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activePhotoGroup) return;
    setUploading(true);
    const group = activePhotoGroup;
    const uploadedUrls: string[] = [];

    for (const file of Array.from(e.target.files)) {
      try {
        const result = await uploadFile(listing.id, file, `photos/${group}`);
        if (result.url) uploadedUrls.push(result.url);
      } catch {
        toast.error(`فشل رفع ${file.name}`);
      }
    }

    if (uploadedUrls.length > 0) {
      setPhotos(prev => ({
        ...prev,
        [group]: [...(prev[group] || []), ...uploadedUrls],
      }));
      toast.success(`تم رفع ${uploadedUrls.length} صورة`);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (group: string, index: number) => {
    setPhotos(prev => ({
      ...prev,
      [group]: (prev[group] || []).filter((_, i) => i !== index),
    }));
  };

  const updateInventoryItem = (index: number, field: string, value: string) => {
    setInventory(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: field === "quantity" || field === "unit_price" ? Number(value) || 0 : value } : item
    ));
  };

  const addInventoryItem = () => {
    setInventory(prev => [...prev, { name: "", quantity: 1, unit_price: 0, condition: "جيد" }]);
  };

  const removeInventoryItem = (index: number) => {
    setInventory(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!fields.business_activity.trim() || !fields.city.trim() || !fields.price.trim() || Number(fields.price) <= 0) {
      toast.error("يرجى إكمال الحقول المطلوبة: النشاط، المدينة، والسعر");
      return;
    }

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
      photos,
      inventory,
      location_lat: locationLat,
      location_lng: locationLng,
    };

    // ── Optimistic update: update cache immediately ──
    const previousData = queryClient.getQueryData<Listing>(["listing", listing.id]);
    queryClient.setQueryData(["listing", listing.id], (old: any) =>
      old ? { ...old, ...updateData } : old,
    );
    onUpdated?.(updateData);

    setSaving(true);

    // ── Rate-limited + auto-retry mutation ──
    const { error } = await immediateMutate({ id: listing.id, data: updateData as never });

    setSaving(false);

    if (error) {
      // Revert optimistic update
      if (previousData) {
        queryClient.setQueryData(["listing", listing.id], previousData);
      }
      // Toast already shown by useResilientUpdate
    } else {
      await queryClient.invalidateQueries({ queryKey: ["listing", listing.id] });
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success("تم حفظ التعديلات بنجاح");
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

  const totalPhotos = Object.values(photos).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 size={18} className="text-primary" />
            تعديل الإعلان
          </DialogTitle>
          <DialogDescription className="text-xs">
            عدّل البيانات واحفظ — يتم عرض الحقول المناسبة لنوع الصفقة
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" dir="rtl" className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="basic" className="text-xs gap-1">
              <FileText size={14} />
              بيانات
            </TabsTrigger>
            <TabsTrigger value="photos" className="text-xs gap-1">
              <Camera size={14} />
              صور
              {totalPhotos > 0 && <span className="text-[10px] bg-primary/20 text-primary rounded-full px-1.5">{totalPhotos}</span>}
            </TabsTrigger>
            <TabsTrigger value="location" className="text-xs gap-1">
              <MapPin size={14} />
              موقع
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs gap-1">
              <Package size={14} />
              مخزون
              {inventory.length > 0 && <span className="text-[10px] bg-primary/20 text-primary rounded-full px-1.5">{inventory.length}</span>}
            </TabsTrigger>
          </TabsList>

          {/* ══════ TAB: بيانات أساسية ══════ */}
          <TabsContent value="basic" className="space-y-3 mt-3">
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

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">السعر المطلوب *</label>
              <div className="relative">
                <input type="number" value={fields.price} onChange={(e) => set("price", e.target.value)} placeholder="180000" className={inputCls} />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"><SarSymbol size={12} /></span>
              </div>
            </div>

            {shouldShow(dealType, "annual_rent") && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الإيجار السنوي</label>
                <div className="relative">
                  <input type="number" value={fields.annual_rent} onChange={(e) => set("annual_rent", e.target.value)} placeholder="45000" className={inputCls} />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"><SarSymbol size={12} /></span>
                </div>
              </div>
            )}

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
          </TabsContent>

          {/* ══════ TAB: الصور ══════ */}
          <TabsContent value="photos" className="space-y-4 mt-3">
            <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={handlePhotoUpload} />

            {photoGroups.map(group => {
              const groupPhotos = photos[group.id] || [];
              return (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{group.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={uploading}
                      onClick={() => {
                        setActivePhotoGroup(group.id);
                        fileInputRef.current?.click();
                      }}
                      className="text-xs gap-1 h-7"
                    >
                      {uploading && activePhotoGroup === group.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      إضافة صور
                    </Button>
                  </div>
                  {groupPhotos.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {groupPhotos.map((url, i) => (
                        <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border/30">
                          <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removePhoto(group.id, i)}
                            className="absolute top-1 left-1 bg-destructive/80 text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground/60 py-2 text-center border border-dashed border-border/30 rounded-lg">
                      لا توجد صور
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* ══════ TAB: الموقع ══════ */}
          <TabsContent value="location" className="space-y-4 mt-3">
            <GoogleMapPicker
              lat={locationLat}
              lng={locationLng}
              onLocationChange={(lat, lng, _address, details) => {
                setLocationLat(lat || null);
                setLocationLng(lng || null);
                if (details?.city) set("city", details.city);
                if (details?.district) set("district", details.district);
              }}
            />
            <p className="text-[11px] text-muted-foreground/60">
              ابحث عن الموقع أو اضغط على الخريطة أو اسحب الدبوس لتحديد الموقع الدقيق
            </p>
          </TabsContent>

          {/* ══════ TAB: المخزون ══════ */}
          <TabsContent value="inventory" className="space-y-3 mt-3">
            {inventory.length === 0 && (
              <div className="text-center text-sm text-muted-foreground/60 py-6 border border-dashed border-border/30 rounded-xl">
                لا توجد عناصر في المخزون
              </div>
            )}

            {inventory.map((item, i) => (
              <div key={i} className="flex gap-2 items-start p-3 bg-muted/30 rounded-xl border border-border/20">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">الاسم</label>
                    <input type="text" value={item.name || ""} onChange={(e) => updateInventoryItem(i, "name", e.target.value)} className={cn(inputCls, "text-xs py-1.5")} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">العدد</label>
                    <input type="number" value={item.quantity || ""} onChange={(e) => updateInventoryItem(i, "quantity", e.target.value)} className={cn(inputCls, "text-xs py-1.5")} dir="ltr" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">السعر</label>
                    <input type="number" value={item.unit_price || ""} onChange={(e) => updateInventoryItem(i, "unit_price", e.target.value)} className={cn(inputCls, "text-xs py-1.5")} dir="ltr" />
                  </div>
                </div>
                <button onClick={() => removeInventoryItem(i)} className="mt-4 text-destructive/60 hover:text-destructive transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addInventoryItem} className="w-full gap-1 rounded-xl text-xs">
              <Plus size={14} />
              إضافة عنصر
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 mt-4">
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm("هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.")) return;
              setDeleting(true);
              const { error } = await softDeleteListing(listing.id);
              setDeleting(false);
              if (error) { toast.error("فشل حذف الإعلان"); return; }
              await queryClient.invalidateQueries({ queryKey: ["listings"] });
              toast.success("تم حذف الإعلان بنجاح");
              onOpenChange(false);
              onDeleted?.();
            }}
            disabled={deleting || saving}
            className="rounded-xl gap-1"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            حذف
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl px-6">
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading} className="gradient-primary text-primary-foreground rounded-xl px-6">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            حفظ التعديلات
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ListingEditDialog = (props: ListingEditDialogProps) => (
  <ListingEditErrorBoundary>
    <ListingEditDialogInner {...props} />
  </ListingEditErrorBoundary>
);

export default ListingEditDialog;
