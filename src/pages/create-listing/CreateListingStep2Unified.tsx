import {
  Upload,
  Loader2,
  Sparkles,
  FileText,
  Camera,
  Check,
  AlertTriangle,
  MapPin,
  FolderOpen,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import GoogleMapPicker from "@/components/GoogleMapPicker";
import { FormField } from "./FormFields";
import { getRules } from "@/lib/dealTypeFieldRules";
import { toEnglishNumerals } from "@/lib/arabicNumerals";
import AiInlineStar from "@/components/AiInlineStar";
import { FileReviewDialog } from "@/components/FileReviewDialog";
import type { CreateListingSharedState } from "./sharedState";

interface Props {
  state: CreateListingSharedState;
}

const CreateListingStep2Unified = ({ state }: Props) => {
  const {
    dealStructure,
    fileStatuses,
    classifyProgress,
    classifyingFiles,
    reviewDialogOpen,
    setReviewDialogOpen,
    handleUnifiedUpload,
    handleConfirmClassifications,
    handleManualCrExtract,
    unifiedFileCount,
    unifiedUnconfirmedCount,
    crExtracting,
    crExtractionDone,
    crExtraction,
    bulkInputRef,
    locationLat,
    locationLng,
    setLocationLat,
    setLocationLng,
    setDisclosure,
    areaSqm,
    setAreaSqm,
    publishAttempted,
    locationOk,
    listingId,
    stepDirection,
  } = state;

  const showCrManualButton = unifiedFileCount > 0 && !crExtractionDone && !crExtracting;

  return (
    <div
      key="step-1-unified"
      className={`space-y-6 ${stepDirection === "next" ? "animate-step-slide-in-next" : "animate-step-slide-in-prev"}`}
    >
      {/* Header banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-5 border border-primary/10 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles size={20} strokeWidth={1.5} className="text-primary" />
          <Camera size={20} strokeWidth={1.5} className="text-primary" />
          <FileText size={20} strokeWidth={1.5} className="text-primary" />
        </div>
        <h2 className="font-semibold text-sm mb-1">
          ارفع كل ملفاتك مرة واحدة — الـAI يصنّف ويرتّب الباقي ✦
        </h2>
        <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed mb-1">
          صور المعدات والمكان + المستندات (PDF / Excel / Word) — كل شيء في منطقة رفع واحدة
        </p>
        <p className="text-sm font-semibold text-primary">
          ومقبل .. طحطوح الصفقات بيكمل الباقي
        </p>
      </div>

      {/* Unified dropzone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer bg-primary/[0.02] hover:bg-primary/[0.04]",
          classifyingFiles
            ? "border-primary/50 cursor-wait"
            : "border-primary/30 hover:border-primary/50"
        )}
        onClick={() => !classifyingFiles && bulkInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (classifyingFiles) return;
          const files = e.dataTransfer?.files;
          if (!files || files.length === 0) return;
          handleUnifiedUpload(files);
        }}
      >
        <Upload
          size={36}
          strokeWidth={1.5}
          className={cn(
            "mx-auto mb-3",
            classifyingFiles ? "text-primary animate-pulse" : "text-primary"
          )}
        />
        <h3 className="font-medium text-sm mb-1">
          اسحب أو اضغط لرفع كل ملفات الإعلان دفعة واحدة
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          صور (JPG, PNG, HEIC) + مستندات (PDF, Excel, Word) — حتى 200 صورة و 100 مستند
        </p>
        <p className="text-[10px] text-primary font-medium">
          ✦ الـAI يصنّف كل ملف تلقائياً (معدات / مكان / فاتورة / وثيقة قانونية)
        </p>
      </div>

      {/* Upload progress (file uploading) */}
      {fileStatuses.some((f) => f.status === "uploading") && (
        <div className="rounded-xl border border-border/40 bg-card p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span>
              جاري رفع الملفات (
              {fileStatuses.filter((f) => f.status === "uploaded").length}/
              {fileStatuses.length})
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-500"
              style={{
                width: `${
                  (fileStatuses.filter((f) => f.status === "uploaded").length /
                    Math.max(1, fileStatuses.length)) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Classification progress */}
      {classifyingFiles && classifyProgress.total > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Sparkles size={14} className="animate-pulse" />
            <span>
              جاري تصنيف الملفات بالـAI... ({classifyProgress.current}/
              {classifyProgress.total})
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-500"
              style={{
                width: `${(classifyProgress.current / Math.max(1, classifyProgress.total)) * 100}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            معدات / مكان / فاتورة / وثيقة قانونية — كل ملف يُصنَّف منفصلاً
          </p>
        </div>
      )}

      {/* Review files button */}
      {unifiedFileCount > 0 && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setReviewDialogOpen(true)}
            disabled={classifyingFiles}
            variant={unifiedUnconfirmedCount > 0 ? "default" : "outline"}
            className={cn(
              "flex-1 gap-2 h-11",
              unifiedUnconfirmedCount > 0
                ? "bg-warning text-warning-foreground hover:bg-warning/90"
                : "border-success/40 text-success hover:bg-success/10"
            )}
          >
            <FolderOpen size={16} strokeWidth={1.5} />
            <span>مراجعة الملفات ({unifiedFileCount})</span>
            {unifiedUnconfirmedCount > 0 && (
              <span className="text-[10px] font-bold ml-1">
                — {unifiedUnconfirmedCount} يحتاج مراجعة
              </span>
            )}
            {unifiedUnconfirmedCount === 0 && unifiedFileCount > 0 && (
              <Check size={14} className="ml-1" />
            )}
          </Button>

          {showCrManualButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualCrExtract}
              className="h-11 gap-1.5 text-xs"
              title="استخراج بيانات السجل التجاري يدوياً"
            >
              <FileText size={14} strokeWidth={1.5} />
              استخراج CR
            </Button>
          )}
        </div>
      )}

      {/* CR Extraction status */}
      {crExtracting && (
        <div className="flex flex-col items-center justify-center py-4 gap-2 animate-fade-in rounded-xl border border-primary/20 bg-primary/5">
          <Loader2 size={24} className="animate-spin text-primary" />
          <p className="text-xs font-medium text-primary">
            جاري استخراج بيانات السجل التجاري...
          </p>
        </div>
      )}

      {crExtractionDone && crExtraction && (
        <div
          className={cn(
            "rounded-xl border p-4 space-y-2 animate-fade-in",
            crExtraction.extraction_confidence === "high"
              ? "border-success/30 bg-success/5"
              : crExtraction.extraction_confidence === "medium"
                ? "border-warning/30 bg-warning/5"
                : "border-destructive/30 bg-destructive/5"
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Check size={16} className="text-success" />
            تم استخراج بيانات السجل التجاري
          </div>
          {crExtraction.entity_name && (
            <div className="text-xs">
              <span className="text-muted-foreground">اسم المنشأة:</span>{" "}
              {crExtraction.entity_name}
            </div>
          )}
          {crExtraction.cr_number && (
            <div className="text-xs">
              <span className="text-muted-foreground">رقم السجل:</span>{" "}
              {crExtraction.cr_number}
            </div>
          )}
          {crExtraction.business_activity && (
            <div className="text-xs">
              <span className="text-muted-foreground">النشاط:</span>{" "}
              {crExtraction.business_activity}
            </div>
          )}
          {crExtraction.city && (
            <div className="text-xs">
              <span className="text-muted-foreground">المدينة:</span> {crExtraction.city}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {unifiedFileCount === 0 && !classifyingFiles && (
        <div className="text-center py-2">
          <p className="text-[11px] text-muted-foreground">
            ✦ كلما زادت الصور والمستندات، كان التحليل أدق والإعلان أقوى
          </p>
        </div>
      )}

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

      {/* File Review Dialog */}
      {listingId && (
        <FileReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          listingId={listingId}
          onConfirmed={handleConfirmClassifications}
        />
      )}
    </div>
  );
};

export default CreateListingStep2Unified;
