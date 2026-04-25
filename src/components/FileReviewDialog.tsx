import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Camera,
  Building2,
  Receipt,
  FileText,
  Table as TableIcon,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowRightLeft,
  Eye,
  CheckCircle2,
  ImageOff,
  Lock,
  Globe,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CATEGORY_LABELS,
  PROPERTY_SUBCATEGORIES,
  LEGAL_SUBCATEGORIES,
  type FileCategory,
  type FileClassification,
  useFileClassifications,
} from "@/hooks/useFileClassifications";
import { cn } from "@/lib/utils";


interface FileReviewDialogProps {
  listingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed?: () => void;
}

const CATEGORY_ORDER: FileCategory[] = [
  "equipment_photo",
  "property_photo",
  "invoice_document",
  "legal_document",
  "asset_list",
  "rejected",
  "unclassified",
];

const CATEGORY_ICONS: Record<FileCategory, React.ComponentType<{ className?: string }>> = {
  equipment_photo: Camera,
  property_photo: Building2,
  invoice_document: Receipt,
  legal_document: FileText,
  asset_list: TableIcon,
  rejected: XCircle,
  unclassified: HelpCircle,
};

const CATEGORY_COLORS: Record<FileCategory, string> = {
  equipment_photo: "text-primary",
  property_photo: "text-primary",
  invoice_document: "text-primary",
  legal_document: "text-primary",
  asset_list: "text-primary",
  rejected: "text-destructive",
  unclassified: "text-muted-foreground",
};

function isImage(type: string | null) {
  return !!type && type.startsWith("image/");
}

interface FilePreviewProps {
  file: FileClassification;
  selected: boolean;
  onToggleSelect: () => void;
  onMove: (cat: FileCategory) => void;
  onUpdateSubcategory: (sub: string) => void;
  onDelete: () => void;
  onPreview: () => void;
  onToggleProtection: () => void;
}

const PROTECTABLE_CATEGORIES: FileCategory[] = ["legal_document", "invoice_document"];

function FileCard({
  file,
  selected,
  onToggleSelect,
  onMove,
  onUpdateSubcategory,
  onDelete,
  onPreview,
  onToggleProtection,
}: FilePreviewProps) {
  const { t } = useTranslation();
  const isImg = isImage(file.file_type);
  const [imgError, setImgError] = useState(false);
  const showProtectionBadge = PROTECTABLE_CATEGORIES.includes(
    file.final_category as FileCategory,
  );
  const subOptions =
    file.final_category === "property_photo"
      ? PROPERTY_SUBCATEGORIES
      : file.final_category === "legal_document"
      ? LEGAL_SUBCATEGORIES
      : null;

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card p-3 transition-all",
        selected && "ring-2 ring-primary border-primary",
      )}
    >
      <div className="absolute top-2 right-2 z-10">
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
      </div>

      {/* Preview */}
      <div
        onClick={onPreview}
        className="aspect-square w-full bg-muted rounded-md mb-2 overflow-hidden cursor-pointer flex items-center justify-center"
      >
        {isImg && !imgError ? (
          <img
            src={file.file_url}
            alt={file.file_name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : isImg && imgError ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-2">
            <ImageOff className="w-8 h-8 mb-2" />
            <span className="text-xs text-center">{t("createListing.fileReview.previewError")}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <FileText className="w-8 h-8" />
            <span className="text-xs">{file.file_type || t("createListing.fileReview.fileGeneric")}</span>
          </div>
        )}
      </div>

      {/* Filename + confidence */}
      <div className="space-y-1 mb-2">
        <p className="text-xs font-medium truncate" title={file.file_name}>
          {file.file_name}
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          <Badge
            variant={
              file.ai_confidence === "high"
                ? "default"
                : file.ai_confidence === "medium"
                ? "secondary"
                : "outline"
            }
            className="text-[10px] py-0 px-1.5"
          >
            {file.ai_confidence === "high"
              ? t("createListing.fileReview.confidenceHigh")
              : file.ai_confidence === "medium"
              ? t("createListing.fileReview.confidenceMedium")
              : t("createListing.fileReview.confidenceLow")}
          </Badge>
          {file.is_confirmed && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" /> {t("createListing.fileReview.confirmedBadge")}
            </Badge>
          )}
          {showProtectionBadge && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onToggleProtection}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                      file.is_protected
                        ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                    aria-label={
                      file.is_protected
                        ? t("createListing.fileReview.switchToPublic")
                        : t("createListing.fileReview.switchToProtected")
                    }
                  >
                    {file.is_protected ? (
                      <Lock className="w-2.5 h-2.5" />
                    ) : (
                      <Globe className="w-2.5 h-2.5" />
                    )}
                    <span>{file.is_protected ? t("createListing.fileReview.protectedLabel") : t("createListing.fileReview.publicLabel")}</span>
                    <ArrowRightLeft className="w-2.5 h-2.5 opacity-70" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  {file.is_protected
                    ? t("createListing.fileReview.protectedTooltip")
                    : t("createListing.fileReview.publicTooltip")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {file.ai_reasoning && (
          <p className="text-[10px] text-muted-foreground line-clamp-2" title={file.ai_reasoning}>
            {file.ai_reasoning}
          </p>
        )}
      </div>

      {/* Subcategory */}
      {subOptions && (
        <Select
          value={file.final_subcategory || ""}
          onValueChange={onUpdateSubcategory}
        >
          <SelectTrigger className="h-7 text-xs mb-2">
            <SelectValue placeholder={t("createListing.fileReview.subPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {subOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Select
          value={file.final_category}
          onValueChange={(v) => onMove(v as FileCategory)}
        >
          <SelectTrigger className="h-7 text-xs flex-1">
            <ArrowRightLeft className="w-3 h-3 ml-1 inline" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ORDER.map(cat => (
              <SelectItem key={cat} value={cat} className="text-xs">
                {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={onPreview}
        >
          <Eye className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function FileReviewDialog({
  listingId,
  open,
  onOpenChange,
  onConfirmed,
}: FileReviewDialogProps) {
  const { t } = useTranslation();
  const {
    classifications,
    grouped,
    counts,
    unconfirmedCount,
    isLoading,
    updateCategory,
    bulkMove,
    confirmAll,
    deleteFile,
    toggleProtection,
  } = useFileClassifications(listingId);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openSections, setOpenSections] = useState<Set<FileCategory>>(
    new Set(CATEGORY_ORDER),
  );
  const [previewFile, setPreviewFile] = useState<FileClassification | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const totalFiles = classifications.length;

  const toggleSection = (cat: FileCategory) => {
    const next = new Set(openSections);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setOpenSections(next);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkMove = async (cat: FileCategory) => {
    const ids = Array.from(selectedIds);
    const ok = await bulkMove(ids, cat);
    if (ok) clearSelection();
  };

  const handleConfirm = async () => {
    setConfirming(true);
    const ok = await confirmAll();
    setConfirming(false);
    if (ok) {
      onConfirmed?.();
      onOpenChange(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteFile(id);
    if (ok) {
      setDeleteConfirmId(null);
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0"
          dir="rtl"
        >
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {t("createListing.fileReview.title", { count: totalFiles })}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("createListing.fileReview.subtitle")}
            </p>
          </DialogHeader>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="px-6 py-3 bg-primary/5 border-b flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">
                {t("createListing.fileReview.selected", { count: selectedIds.size })}
              </span>
              <Select onValueChange={(v) => handleBulkMove(v as FileCategory)}>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue placeholder={t("createListing.fileReview.moveToCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                {t("createListing.fileReview.clearSelection")}
              </Button>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                {t("createListing.fileReview.loading")}
              </div>
            )}

            {!isLoading && totalFiles === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>{t("createListing.fileReview.empty")}</p>
              </div>
            )}

            {!isLoading &&
              CATEGORY_ORDER.map(cat => {
                const files = grouped[cat];
                const count = counts[cat];
                if (count === 0) return null;
                const Icon = CATEGORY_ICONS[cat];
                const isOpen = openSections.has(cat);

                return (
                  <Collapsible
                    key={cat}
                    open={isOpen}
                    onOpenChange={() => toggleSection(cat)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", CATEGORY_COLORS[cat])} />
                          <span className="font-medium text-sm">
                            {CATEGORY_LABELS[cat]}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 border-t bg-muted/20">
                          {PROTECTABLE_CATEGORIES.includes(cat) && (
                            <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>
                                {t("createListing.fileReview.protectedNotice")}
                              </span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {files.map(file => (
                              <FileCard
                                key={file.id}
                                file={file}
                                selected={selectedIds.has(file.id)}
                                onToggleSelect={() => toggleSelect(file.id)}
                                onMove={(c) => updateCategory(file.id, c, null)}
                                onUpdateSubcategory={(s) =>
                                  updateCategory(file.id, file.final_category as FileCategory, s)
                                }
                                onDelete={() => setDeleteConfirmId(file.id)}
                                onPreview={() => setPreviewFile(file)}
                                onToggleProtection={() =>
                                  toggleProtection(file.id, !file.is_protected)
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 flex-row items-center justify-between sm:justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {unconfirmedCount > 0
                ? t("createListing.fileReview.pendingConfirmation", { count: unconfirmedCount })
                : t("createListing.fileReview.allConfirmed")}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("createListing.fileReview.close")}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={confirming || totalFiles === 0}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {confirming ? t("createListing.fileReview.confirmingSave") : t("createListing.fileReview.confirmAndSave")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview modal */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base truncate">
              {previewFile?.file_name}
            </DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="w-full">
              {isImage(previewFile.file_type) ? (
                <img
                  src={previewFile.file_url}
                  alt={previewFile.file_name}
                  className="w-full max-h-[70vh] object-contain rounded"
                />
              ) : (
                <div className="space-y-3">
                  <iframe
                    src={previewFile.file_url}
                    title={previewFile.file_name}
                    className="w-full h-[60vh] rounded border"
                  />
                  <Button
                    variant="outline"
                    onClick={() => window.open(previewFile.file_url, "_blank")}
                  >
                    {t("createListing.fileReview.openInNewTab")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("createListing.fileReview.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("createListing.fileReview.deleteMessage")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t("createListing.fileReview.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              {t("createListing.fileReview.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
