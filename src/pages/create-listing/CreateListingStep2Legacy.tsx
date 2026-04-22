import {
  Camera,
  FileText,
  Upload,
  Loader2,
  Sparkles,
  Trash2,
  AlertTriangle,
  Check,
  MapPin,
  DoorOpen,
  Building2,
  Tag,
  Wrench,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AiInlineStar from "@/components/AiInlineStar";
import GoogleMapPicker from "@/components/GoogleMapPicker";
import { FormField } from "./FormFields";
import { getRules } from "@/lib/dealTypeFieldRules";
import { toEnglishNumerals } from "@/lib/arabicNumerals";
import type { CreateListingSharedState } from "./sharedState";

interface Props {
  state: CreateListingSharedState;
}

const CreateListingStep2Legacy = ({ state }: Props) => {
  const {
    dealStructure,
    photos,
    setPhotos,
    localPreviews,
    setLocalPreviews,
    uploadingGroup,
    uploadProgress,
    uploadedDocs,
    docConfidence,
    setActivePhotoGroup,
    setActiveDocType,
    fileInputRef,
    docInputRef,
    bulkInputRef,
    draggingGroup,
    setDraggingGroup,
    fileStatuses,
    setFileStatuses,
    isCrOnly,
    crExtracting,
    crExtractionDone,
    crExtraction,
    stepDirection,
    totalPhotos,
    photoGroups,
    getGroupDisplayUrls,
    handleDrop,
    dynamicDocTypes,
    saving,
    listingId,
    updateListing,
    locationLat,
    locationLng,
    setLocationLat,
    setLocationLng,
    setDisclosure,
    areaSqm,
    setAreaSqm,
    publishAttempted,
    locationOk,
  } = state;

  const iconMap: Record<string, typeof Camera> = { Camera, DoorOpen, Building2, MapPin, Tag, Wrench, FileText };
  const bulkPhotoCount = (localPreviews["all"] || photos["all"] || []).length;

  return (
    <div key="step-1" className={`space-y-6 ${stepDirection === "next" ? "animate-step-slide-in-next" : "animate-step-slide-in-prev"}`}>
      <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-5 border border-primary/10 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles size={20} strokeWidth={1.5} className="text-primary" />
          {isCrOnly ? <FileText size={20} strokeWidth={1.5} className="text-primary" /> : <Camera size={20} strokeWidth={1.5} className="text-primary" />}
        </div>
        <h2 className="font-semibold text-sm mb-1">
          {isCrOnly ? "ارفع صورة السجل التجاري — الـAI يستخرج البيانات تلقائياً!" : "فقط ارفع الصور والمستندات — الـAI يتولى الباقي!"}
        </h2>
        <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed mb-1">
          {isCrOnly ? "الذكاء الاصطناعي يقرأ السجل التجاري ويعبّئ البيانات نيابة عنك" : "الذكاء الاصطناعي يستخرج قائمة الأصول ويحلل حالتها تلقائياً"}
        </p>
        <p className="text-sm font-semibold text-primary animate-fade-in [animation-delay:0.4s] [animation-fill-mode:backwards]">
          ✦ بدون أي إدخال يدوي منك ✦
        </p>
      </div>

      {/* CR Extraction Status */}
      {isCrOnly && crExtracting && (
        <div className="flex flex-col items-center justify-center py-4 gap-3 animate-fade-in">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-sm font-medium text-primary">جاري استخراج بيانات السجل التجاري...</p>
          <p className="text-xs text-muted-foreground">لا تحتاج تعمل شيء — الـAI يقرأ المستند</p>
        </div>
      )}

      {isCrOnly && crExtractionDone && crExtraction && (
        <div className={cn(
          "rounded-xl border p-4 space-y-3 animate-fade-in",
          crExtraction.extraction_confidence === "high" ? "border-success/30 bg-success/5" :
          crExtraction.extraction_confidence === "medium" ? "border-warning/30 bg-warning/5" :
          "border-destructive/30 bg-destructive/5"
        )}>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Check size={16} className="text-success" />
            تم استخراج بيانات السجل التجاري
          </div>
          {crExtraction.entity_name && <div className="text-xs"><span className="text-muted-foreground">اسم المنشأة:</span> {crExtraction.entity_name}</div>}
          {crExtraction.cr_number && <div className="text-xs"><span className="text-muted-foreground">رقم السجل:</span> {crExtraction.cr_number}</div>}
          {crExtraction.business_activity && <div className="text-xs"><span className="text-muted-foreground">النشاط:</span> {crExtraction.business_activity}</div>}
          {crExtraction.city && <div className="text-xs"><span className="text-muted-foreground">المدينة:</span> {crExtraction.city}</div>}
        </div>
      )}

      {/* Bulk upload area */}
      <div
        className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center hover:border-primary/50 transition-all cursor-pointer bg-primary/[0.02] hover:bg-primary/[0.04]"
        onClick={() => bulkInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const files = e.dataTransfer?.files;
          if (!files || files.length === 0) return;
          state.handleBulkDrop(files);
        }}
      >
        <Upload size={32} strokeWidth={1.5} className="text-primary mx-auto mb-3" />
        <h3 className="font-medium text-sm mb-1">اسحب أو اضغط لرفع الصور والمستندات دفعة واحدة</h3>
        <p className="text-xs text-muted-foreground mb-2">صور (JPG, PNG, HEIC) + مستندات (PDF, Excel, Word) — حتى 200 صورة و 100 مستند دفعة واحدة</p>
        <p className="text-[10px] text-primary font-medium">الـAI يصنّف كل ملف تلقائياً ✦</p>
      </div>

      {/* File upload statuses */}
      {fileStatuses.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Upload size={14} />
            الملفات ({fileStatuses.filter(f => f.status === "uploaded").length}/{fileStatuses.length})
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-border/30 p-2">
            {fileStatuses.map((file) => (
              <div key={file.id} className="flex items-center gap-2 text-[11px] py-1 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                {file.type === "image" ? <Camera size={12} className="text-primary shrink-0" /> : <FileText size={12} className="text-primary shrink-0" />}
                <span className="truncate flex-1 min-w-0">{file.name}</span>
                <span className="text-[9px] text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                {file.status === "uploading" && <Loader2 size={12} className="animate-spin text-primary shrink-0" />}
                {file.status === "uploaded" && <Check size={12} className="text-success shrink-0" />}
                {file.status === "failed" && (
                  <span className="text-[9px] text-destructive shrink-0 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    {file.error || "فشل"}
                  </span>
                )}
                {file.status === "uploaded" && (
                  <button
                    onClick={() => {
                      setFileStatuses(prev => prev.filter(f => f.id !== file.id));
                      if (file.type === "image" && file.url) {
                        setPhotos(prev => {
                          const updated = { ...prev };
                          for (const group in updated) {
                            updated[group] = updated[group].filter(u => u !== file.url);
                          }
                          if (listingId) updateListing(listingId, { photos: updated } as never).catch(() => {});
                          return updated;
                        });
                        if (file.previewUrl) {
                          setLocalPreviews(prev => {
                            const updated = { ...prev };
                            for (const group in updated) {
                              updated[group] = updated[group].filter(u => u !== file.previewUrl);
                            }
                            return updated;
                          });
                        }
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="حذف الملف"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk uploaded previews */}
      {bulkPhotoCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Camera size={14} strokeWidth={1.5} className="text-primary" />
            <span className="text-xs font-medium">الصور المرفوعة ({bulkPhotoCount})</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(localPreviews["all"] || photos["all"] || []).map((url, i) => (
              <div key={`all-${i}`} className="relative shrink-0 w-14 h-14 rounded-lg border border-border/30 overflow-hidden bg-muted/40 group/thumb">
                <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetUrl = (photos["all"] || [])[i];
                    if (targetUrl) {
                      setPhotos(prev => {
                        const updated = { ...prev, all: (prev.all || []).filter((_, idx) => idx !== i) };
                        if (listingId) updateListing(listingId, { photos: updated } as never).catch(() => {});
                        return updated;
                      });
                    }
                    setLocalPreviews(prev => ({ ...prev, all: (prev.all || []).filter((_, idx) => idx !== i) }));
                    setFileStatuses(prev => prev.filter(f => f.url !== targetUrl && f.previewUrl !== url));
                  }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                >
                  <Trash2 size={8} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk uploaded docs */}
      {(uploadedDocs["general"] || []).length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText size={14} strokeWidth={1.5} className="text-primary" />
            <span className="text-xs font-medium">المستندات المرفوعة ({uploadedDocs["general"].length})</span>
            <span className="text-[10px] text-success">✓</span>
          </div>
        </div>
      )}

      {/* Photos by group (optional manual upload) */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Camera size={14} strokeWidth={1.5} />
          <span>الطريقة التفصيلية — رفع كل نوع على حدة</span>
          <span className="text-[10px]">صور داخلية، واجهة، معدات... كل فئة منفصلة</span>
        </summary>
        <div className="mt-3 space-y-4">
          <div className="flex items-center gap-2">
            <Camera size={16} strokeWidth={1.5} className="text-primary" />
            <h3 className="font-medium text-sm">الصور</h3>
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${Math.min(100, (totalPhotos / 12) * 100)}%` }} />
            </div>
            <span className="text-xs font-medium text-primary">{totalPhotos} صورة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {photoGroups.map((group) => {
              const displayUrls = getGroupDisplayUrls(group.id);
              const count = displayUrls.length;
              const done = count >= group.min;
              const Icon = iconMap[group.icon] || Camera;

              return (
                <div
                  key={group.id}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all",
                    done ? "border-success/30 bg-success/5" : "border-border/50 bg-card hover:border-primary/30",
                    draggingGroup === group.id && "border-primary border-dashed bg-primary/5 scale-[1.01]"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDraggingGroup(group.id); }}
                  onDragLeave={() => setDraggingGroup(null)}
                  onDrop={(e) => handleDrop(e, group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon size={18} strokeWidth={1.5} className="text-primary" />
                      <div>
                        <div className="text-xs font-medium">{group.label}</div>
                        <div className="text-[10px] text-muted-foreground">{group.min} صور على الأقل</div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setActivePhotoGroup(group.id); fileInputRef.current?.click(); }}
                      disabled={uploadingGroup === group.id}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-[0.97]",
                        uploadingGroup === group.id ? "bg-primary/20 text-primary cursor-wait" : done ? "bg-success/10 text-success" : "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      {uploadingGroup === group.id ? (
                        <><Loader2 size={12} className="animate-spin" />{uploadProgress.current}/{uploadProgress.total}</>
                      ) : (
                        <><Upload size={12} strokeWidth={1.5} />{count > 0 ? `${count} ✓` : "رفع"}</>
                      )}
                    </button>
                  </div>

                  {uploadingGroup === group.id && uploadProgress.total > 0 && (
                    <div className="mt-2.5 space-y-1.5 animate-fade-in">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full gradient-primary transition-all duration-500 ease-out" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
                      </div>
                      <p className="text-[10px] text-primary text-center">جاري تجهيز ورفع الصور بطريقة ذكية ولطيفة...</p>
                    </div>
                  )}

                  {displayUrls.length > 0 && (
                    <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-1">
                      {displayUrls.map((url, i) => (
                        <div key={`${group.id}-${i}`} className="relative shrink-0 w-12 h-12 rounded-lg border border-border/30 overflow-hidden bg-muted/40">
                          <img src={url} alt={`معاينة ${group.label}`} loading="lazy" className="w-full h-full object-cover" onError={(e) => { const target = e.currentTarget; target.style.display = "none"; const fallback = target.nextElementSibling as HTMLDivElement | null; if (fallback) fallback.style.display = "flex"; }} />
                          <div className="hidden absolute inset-0 items-center justify-center text-primary bg-primary/5"><ImageIcon size={16} /></div>
                          {uploadingGroup === group.id && i === displayUrls.length - 1 && (
                            <div className="absolute inset-0 bg-background/55 flex items-center justify-center"><Loader2 size={14} className="animate-spin text-primary" /></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2 pb-1 space-y-2">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/10">
              <Sparkles size={16} strokeWidth={1.5} className="text-primary" />
              <p className="text-sm font-medium text-foreground">كلما زادت الصور، كان التحليل أدق والإعلان أقوى</p>
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Upload size={10} strokeWidth={1.5} />
              يمكنك سحب الصور وإفلاتها مباشرة على أي مجموعة
            </p>
          </div>
        </div>
      </details>

      {/* Documents */}
      <div className="border-t border-border/50 pt-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileText size={16} strokeWidth={1.5} className="text-primary" />
          <h3 className="font-medium text-sm">المستندات</h3>
          <span className="text-[10px] text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/15">اختياري — تظهر للمشتري كمستندات موثقة</span>
        </div>
        <div className="space-y-2">
          {dynamicDocTypes.map((doc) => {
            const docUrls = uploadedDocs[doc] || [];
            const mediumCount = docUrls.filter((u) => docConfidence[u] === "medium").length;
            const highCount = docUrls.filter((u) => docConfidence[u] === "high").length;
            return (
              <div key={doc} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-all">
                <div className="flex items-center gap-2.5">
                  <FileText size={14} strokeWidth={1.3} className="text-muted-foreground" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs">{doc}</span>
                    {docUrls.length > 0 && <span className="text-[10px] text-success mr-2">✓ {docUrls.length} ملف</span>}
                    {highCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-success/10 text-success border border-success/20">
                        ✓ واضح {highCount > 1 ? `(${highCount})` : ""}
                      </span>
                    )}
                    {mediumCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-warning/10 text-warning border border-warning/30">
                        ⚠ قد تحتاج معاينة {mediumCount > 1 ? `(${mediumCount})` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => { setActiveDocType(doc); setTimeout(() => docInputRef.current?.click(), 50); }} className="flex items-center gap-1 text-xs text-primary hover:underline active:scale-[0.97]">
                  <Upload size={12} strokeWidth={1.3} /> رفع
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Location Map Picker */}
      <div className="border-t border-border/50 pt-5 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin size={16} strokeWidth={1.5} className="text-primary" />
          <h3 className="font-medium text-sm">موقع المشروع على الخريطة</h3>
          <span className="text-[10px] text-destructive font-medium">(مطلوب)</span>
        </div>
        <GoogleMapPicker
          lat={locationLat}
          lng={locationLng}
          onLocationChange={(lat, lng, _address, placeDetails) => {
            if (lat === 0 && lng === 0) {
              setLocationLat(null);
              setLocationLng(null);
            } else {
              setLocationLat(lat);
              setLocationLng(lng);
            }
            if (placeDetails) {
              setDisclosure((prev) => ({
                ...prev,
                ...(placeDetails.city ? { city: placeDetails.city } : {}),
                ...(placeDetails.district ? { district: placeDetails.district } : {}),
              }));
            }
          }}
        />

        {getRules(dealStructure.primaryType || "full_takeover").areaRequired && (
          <div className="mt-3">
            <FormField
              label="مساحة الموقع (م²)"
              placeholder="مثال: 120"
              value={areaSqm}
              onChange={(v) => setAreaSqm(toEnglishNumerals(v))}
            />
            {areaSqm && (
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                {Number(areaSqm) > 0 && <AiInlineStar />}
                {Number(areaSqm) > 0 ? "تم استخراج المساحة تلقائياً — يمكنك تعديلها" : ""}
              </p>
            )}
          </div>
        )}

        {publishAttempted && !locationOk && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-destructive shrink-0" />
            <p className="text-xs text-destructive">يجب تحديد الموقع على الخريطة</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateListingStep2Legacy;
