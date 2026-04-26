import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, Edit3, Camera, MapPin, Package, FileText, Plus, X, Trash2, Upload } from "lucide-react";
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
import { invokeWithRetry } from "@/lib/invokeWithRetry";
import { buildTitle } from "@/lib/title-utils";

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
  const { t } = useTranslation();
  const dealType = listing.primary_deal_type || listing.deal_type || "full_takeover";
  const { updateListing, uploadFile, softDeleteListing } = useListings();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoGroup, setActivePhotoGroup] = useState<string | null>(null);

  // Resilient update with debounce + rate limit + retry
  const updateFn = useCallback(
    (payload: { id: string; data: Partial<Listing> }) => updateListing(payload.id, payload.data),
    [updateListing],
  );
  const { immediateMutate } = useResilientUpdate(updateFn);

  // ── Basic fields ──
  const [fields, setFields] = useState({
    title: listing.title || "",
    description: listing.description || "",
    business_activity: listing.business_activity || "",
    city: listing.city || "",
    district: listing.district || "",
    price: listing.price != null ? String(listing.price) : "",
    annual_rent: listing.annual_rent != null ? String(listing.annual_rent) : "",
    lease_duration: listing.lease_duration || "",
    lease_remaining: listing.lease_remaining || "",
    lease_paid_period: listing.lease_paid_period || "",
    liabilities: listing.liabilities || "",
    overdue_salaries: listing.overdue_salaries || "",
    overdue_rent: listing.overdue_rent || "",
    municipality_license: listing.municipality_license || "",
    civil_defense_license: listing.civil_defense_license || "",
    surveillance_cameras: listing.surveillance_cameras || "",
    area_sqm: listing.area_sqm != null ? String(listing.area_sqm) : "",
  });

  // ── Photos ──
  const [photos, setPhotos] = useState<Record<string, string[]>>(listing.photos || {});

  // ── Documents ──
  const [documents, setDocuments] = useState<any[]>(listing.documents || []);

  // ── Location ──
  const [locationLat, setLocationLat] = useState(listing.location_lat ?? null);
  const [locationLng, setLocationLng] = useState(listing.location_lng ?? null);

  // ── Inventory ──
  const [inventory, setInventory] = useState<any[]>(listing.inventory || []);

  // Reset state when listing changes or dialog reopens
  useEffect(() => {
    if (open) {
      setFields({
        title: listing.title || "",
        description: listing.description || "",
        business_activity: listing.business_activity || "",
        city: listing.city || "",
        district: listing.district || "",
        price: listing.price != null ? String(listing.price) : "",
        annual_rent: listing.annual_rent != null ? String(listing.annual_rent) : "",
        lease_duration: listing.lease_duration || "",
        lease_remaining: listing.lease_remaining || "",
        lease_paid_period: listing.lease_paid_period || "",
        liabilities: listing.liabilities || "",
        overdue_salaries: listing.overdue_salaries || "",
        overdue_rent: listing.overdue_rent || "",
        municipality_license: listing.municipality_license || "",
        civil_defense_license: listing.civil_defense_license || "",
        surveillance_cameras: listing.surveillance_cameras || "",
        area_sqm: listing.area_sqm != null ? String(listing.area_sqm) : "",
      });
      setPhotos(listing.photos || {});
      setDocuments(listing.documents || []);
      setLocationLat(listing.location_lat ?? null);
      setLocationLng(listing.location_lng ?? null);
      setInventory(listing.inventory || []);
    }
  }, [open, listing]);

  const set = (field: keyof typeof fields, value: string) =>
    setFields((prev) => ({ ...prev, [field]: value }));

  const photoGroups = [
    { id: "interior", label: t("editListing.photos.groups.interior") },
    { id: "exterior", label: t("editListing.photos.groups.exterior") },
    { id: "signage", label: t("editListing.photos.groups.signage") },
    { id: "equipment", label: t("editListing.photos.groups.equipment") },
    { id: "other", label: t("editListing.photos.groups.other") },
  ];

  // ── Photo upload (click + drag) ──
  const handlePhotoFiles = async (files: File[], group: string) => {
    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      try {
        const result = await uploadFile(listing.id, file, `photos/${group}`);
        if (result.url) uploadedUrls.push(result.url);
      } catch {
        toast.error(t("editListing.toasts.uploadFailed", { name: file.name }));
      }
    }

    if (uploadedUrls.length > 0) {
      setPhotos(prev => ({
        ...prev,
        [group]: [...(prev[group] || []), ...uploadedUrls],
      }));
      toast.success(t("editListing.toasts.photosUploaded", { count: uploadedUrls.length }));
    }
    setUploading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activePhotoGroup) return;
    await handlePhotoFiles(Array.from(e.target.files), activePhotoGroup);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePhotoDrop = async (e: React.DragEvent<HTMLDivElement>, groupId: string) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (imageFiles.length > 0) await handlePhotoFiles(imageFiles, groupId);
  };

  const removePhoto = (group: string, index: number) => {
    setPhotos(prev => ({
      ...prev,
      [group]: (prev[group] || []).filter((_, i) => i !== index),
    }));
  };

  // ── Document upload ──
  const handleDocFiles = async (files: File[]) => {
    setUploadingDocs(true);
    const newDocs: any[] = [];

    for (const file of files) {
      try {
        const result = await uploadFile(listing.id, file, "documents");
        if (result.url) {
          newDocs.push({
            name: file.name,
            type: file.name.split(".").pop()?.toUpperCase() || "FILE",
            files: [result.url],
            status: "uploaded",
          });
        }
      } catch {
        toast.error(t("editListing.toasts.uploadFailed", { name: file.name }));
      }
    }

    if (newDocs.length > 0) {
      setDocuments(prev => [...prev, ...newDocs]);
      toast.success(t("editListing.toasts.docsUploaded", { count: newDocs.length }));
    }
    setUploadingDocs(false);
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    await handleDocFiles(Array.from(e.target.files));
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const handleDocDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    await handleDocFiles(Array.from(files));
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // ── Inventory ──
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

  // ── Save + auto re-analyze ──
  const handleSave = async () => {
    if (!fields.business_activity.trim() || !fields.city.trim() || !fields.price.trim() || Number(fields.price) <= 0) {
      toast.error(t("editListing.toasts.requiredFields"));
      return;
    }

    const generatedTitle = fields.title.trim()
      ? fields.title
      : buildTitle([
          fields.business_activity || t("editListing.inventory.defaultProject"),
          fields.district,
          fields.city,
        ]);

    const updateData: any = {
      title: generatedTitle,
      description: fields.description || null,
      business_activity: fields.business_activity,
      city: fields.city,
      district: fields.district,
      price: Number(fields.price) || null,
      annual_rent: fields.annual_rent ? Number(fields.annual_rent) : null,
      lease_duration: fields.lease_duration || null,
      lease_remaining: fields.lease_remaining || null,
      lease_paid_period: fields.lease_paid_period || null,
      liabilities: fields.liabilities || null,
      overdue_salaries: fields.overdue_salaries || null,
      overdue_rent: fields.overdue_rent || null,
      municipality_license: fields.municipality_license || null,
      civil_defense_license: fields.civil_defense_license || null,
      surveillance_cameras: fields.surveillance_cameras || null,
      area_sqm: fields.area_sqm ? Number(fields.area_sqm) : null,
      photos,
      documents,
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
      if (previousData) {
        queryClient.setQueryData(["listing", listing.id], previousData);
      }
    } else {
      await queryClient.invalidateQueries({ queryKey: ["listing", listing.id] });
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success(t("editListing.toasts.saved"));
      onOpenChange(false);

      // ── Auto re-analyze in background ──
      if (listing.status === "published") {
        triggerReAnalysis(listing.id);
      }
    }
  };

  const triggerReAnalysis = async (listingId: string) => {
    try {
      toast(t("editListing.toasts.reanalyzing"), { duration: 4000 });
      await invokeWithRetry("auto-analyze-listing", { listingId });
      // Refresh listing data to pick up new analysis
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      }, 5000);
      toast.success(t("editListing.toasts.reanalyzed"));
    } catch (e) {
      console.error("Re-analysis failed:", e);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20";
  const selectOpts = (options: { value: string; label: string }[]) => (
    <>
      <option value="">{t("editListing.selectPlaceholder")}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </>
  );

  // DB enum values stay Arabic for backward compat; only labels are translated
  const licenseOptions = [
    { value: "سارية", label: t("editListing.licenseStatus.active") },
    { value: "منتهية", label: t("editListing.licenseStatus.expired") },
    { value: "غير متوفرة", label: t("editListing.licenseStatus.unavailable") },
  ];
  const cameraOptions = [
    { value: "متوفرة ومطابقة", label: t("editListing.cameraStatus.availableCompliant") },
    { value: "متوفرة غير مطابقة", label: t("editListing.cameraStatus.availableNonCompliant") },
    { value: "غير متوفرة", label: t("editListing.cameraStatus.unavailable") },
  ];

  const totalPhotos = Object.values(photos).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  const totalDocs = documents.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 size={18} className="text-primary" />
            {t("editListing.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("editListing.desc")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" dir="rtl" className="mt-2">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="basic" className="text-xs gap-1">
              <FileText size={14} />
              {t("editListing.tabs.basic")}
            </TabsTrigger>
            <TabsTrigger value="photos" className="text-xs gap-1">
              <Camera size={14} />
              {t("editListing.tabs.photos")}
              {totalPhotos > 0 && <span className="text-[10px] bg-primary/20 text-primary rounded-full px-1.5">{totalPhotos}</span>}
            </TabsTrigger>
            <TabsTrigger value="docs" className="text-xs gap-1">
              <Upload size={14} />
              {t("editListing.tabs.docs")}
              {totalDocs > 0 && <span className="text-[10px] bg-primary/20 text-primary rounded-full px-1.5">{totalDocs}</span>}
            </TabsTrigger>
            <TabsTrigger value="location" className="text-xs gap-1">
              <MapPin size={14} />
              {t("editListing.tabs.location")}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs gap-1">
              <Package size={14} />
              {t("editListing.tabs.inventory")}
              {inventory.length > 0 && <span className="text-[10px] bg-primary/20 text-primary rounded-full px-1.5">{inventory.length}</span>}
            </TabsTrigger>
          </TabsList>

          {/* ══════ TAB: Basic data ══════ */}
          <TabsContent value="basic" className="space-y-3 mt-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.listingTitle")}</label>
              <input type="text" value={fields.title} onChange={(e) => set("title", e.target.value)} placeholder={t("editListing.fields.titlePlaceholder")} className={inputCls} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.description")}</label>
              <textarea
                value={fields.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder={t("editListing.fields.descriptionPlaceholder")}
                rows={3}
                className={cn(inputCls, "resize-none")}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.businessActivity")}</label>
              <input type="text" value={fields.business_activity} onChange={(e) => set("business_activity", e.target.value)} placeholder={t("editListing.fields.businessActivityPlaceholder")} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.city")}</label>
                <input type="text" value={fields.city} onChange={(e) => set("city", e.target.value)} placeholder={t("editListing.fields.cityPlaceholder")} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.areaSqm")}</label>
                <input type="number" value={fields.area_sqm} onChange={(e) => set("area_sqm", e.target.value)} placeholder={t("editListing.fields.areaPlaceholder")} className={inputCls} dir="ltr" />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.price")}</label>
              <div className="relative">
                <input type="number" value={fields.price} onChange={(e) => set("price", e.target.value)} placeholder={t("editListing.fields.pricePlaceholder")} className={inputCls} />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"><SarSymbol size={12} /></span>
              </div>
            </div>

            {shouldShow(dealType, "annual_rent") && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.annualRent")}</label>
                <div className="relative">
                  <input type="number" value={fields.annual_rent} onChange={(e) => set("annual_rent", e.target.value)} placeholder={t("editListing.fields.annualRentPlaceholder")} className={inputCls} />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"><SarSymbol size={12} /></span>
                </div>
              </div>
            )}

            {(shouldShow(dealType, "lease_duration") || shouldShow(dealType, "lease_remaining")) && (
              <div className="grid grid-cols-2 gap-3">
                {shouldShow(dealType, "lease_duration") && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.leaseDuration")}</label>
                    <input type="text" value={fields.lease_duration} onChange={(e) => set("lease_duration", e.target.value)} placeholder={t("editListing.fields.leaseDurationPlaceholder")} className={inputCls} />
                  </div>
                )}
                {shouldShow(dealType, "lease_remaining") && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.leaseRemaining")}</label>
                    <input type="text" value={fields.lease_remaining} onChange={(e) => set("lease_remaining", e.target.value)} placeholder={t("editListing.fields.leaseRemainingPlaceholder")} className={inputCls} />
                  </div>
                )}
              </div>
            )}

            {shouldShow(dealType, "liabilities") && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.liabilities")}</label>
                <input type="text" value={fields.liabilities} onChange={(e) => set("liabilities", e.target.value)} placeholder={t("editListing.fields.liabilitiesPlaceholder")} className={inputCls} />
              </div>
            )}

            {shouldShow(dealType, "overdue_salaries") && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.overdueSalaries")}</label>
                <input type="text" value={fields.overdue_salaries} onChange={(e) => set("overdue_salaries", e.target.value)} placeholder={t("editListing.fields.overdueSalariesPlaceholder")} className={inputCls} />
              </div>
            )}

            {shouldShow(dealType, "overdue_rent") && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.overdueRent")}</label>
                <input type="text" value={fields.overdue_rent} onChange={(e) => set("overdue_rent", e.target.value)} placeholder={t("editListing.fields.overdueRentPlaceholder")} className={inputCls} />
              </div>
            )}

            {(shouldShow(dealType, "municipality_license") || shouldShow(dealType, "civil_defense_license")) && (
              <div className="grid grid-cols-2 gap-3">
                {shouldShow(dealType, "municipality_license") && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.municipalityLicense")}</label>
                    <select value={fields.municipality_license} onChange={(e) => set("municipality_license", e.target.value)} className={inputCls}>
                      {selectOpts(licenseOptions)}
                    </select>
                  </div>
                )}
                {shouldShow(dealType, "civil_defense_license") && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.civilDefenseLicense")}</label>
                    <select value={fields.civil_defense_license} onChange={(e) => set("civil_defense_license", e.target.value)} className={inputCls}>
                      {selectOpts(licenseOptions)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {shouldShow(dealType, "surveillance_cameras") && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("editListing.fields.surveillanceCameras")}</label>
                <select value={fields.surveillance_cameras} onChange={(e) => set("surveillance_cameras", e.target.value)} className={inputCls}>
                  {selectOpts(cameraOptions)}
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
                <div
                  key={group.id}
                  className="space-y-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handlePhotoDrop(e, group.id)}
                >
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
                    <div className="text-xs text-muted-foreground/60 py-4 text-center border border-dashed border-border/30 rounded-lg">
                      اسحب الصور هنا أو اضغط "إضافة صور"
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* ══════ TAB: المستندات ══════ */}
          <TabsContent value="docs" className="space-y-4 mt-3">
            <input ref={docInputRef} type="file" multiple className="hidden" onChange={handleDocUpload} />

            <div
              className="border-2 border-dashed border-border/40 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDocDrop}
              onClick={() => docInputRef.current?.click()}
            >
              {uploadingDocs ? (
                <Loader2 size={24} className="animate-spin mx-auto text-primary" />
              ) : (
                <>
                  <Upload size={24} className="mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">اسحب المستندات هنا أو اضغط للاختيار</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">PDF, Excel, صور، وغيرها</p>
                </>
              )}
            </div>

            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.map((doc, i) => {
                  const docName = doc?.name || doc?.label || doc?.type || `مستند ${i + 1}`;
                  const docFiles = Array.isArray(doc?.files) ? doc.files : (doc?.url ? [doc.url] : []);
                  return (
                    <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border/20">
                      <FileText size={14} className="text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{docName}</p>
                        <p className="text-[10px] text-muted-foreground">{docFiles.length} ملف</p>
                      </div>
                      <button onClick={() => removeDocument(i)} className="text-destructive/60 hover:text-destructive transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
          <Button onClick={handleSave} disabled={saving || uploading || uploadingDocs} className="gradient-primary text-primary-foreground rounded-xl px-6">
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
