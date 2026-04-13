import { Shield, TrendingUp, CheckCircle2, AlertCircle, Square, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateTransparency, type ChecklistItem } from "@/lib/transparencyScore";
import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TransparencyIndicatorProps {
  listing: any;
  compact?: boolean;
  className?: string;
  onFieldClick?: (fieldKey: string) => void;
  onListingUpdated?: (updated: any) => void;
}

/* ── 4-tier color system ── */
const getScoreStyle = (score: number) => {
  if (score >= 80) return { bg: "bg-success/8", border: "border-success/20", text: "text-success", bar: "bg-success", ring: "ring-success/20", tier: "trusted" as const };
  if (score >= 60) return { bg: "bg-yellow-500/8", border: "border-yellow-500/20", text: "text-yellow-600 dark:text-yellow-400", bar: "bg-yellow-500", ring: "ring-yellow-500/20", tier: "yellow" as const };
  if (score >= 40) return { bg: "bg-orange-500/8", border: "border-orange-500/20", text: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500", ring: "ring-orange-500/20", tier: "orange" as const };
  return { bg: "bg-destructive/8", border: "border-destructive/20", text: "text-destructive", bar: "bg-destructive", ring: "ring-destructive/20", tier: "red" as const };
};

const TIER_INFO: Record<string, { badge: string; hint: string }> = {
  trusted: { badge: "موثوق", hint: "الإعلانات الموثوقة تحصل على تواصل أكثر بـ 3 أضعاف" },
  yellow: { badge: "يحتاج تحسين", hint: "أكمل بعض الحقول للحصول على شارة \"موثوق\" وترتيب أعلى" },
  orange: { badge: "ضعيف", hint: "أضف المزيد من البيانات والصور لتحسين ظهور الإعلان" },
  red: { badge: "غير مكتمل", hint: "الإعلانات منخفضة الشفافية قد تُرفض أو تحصل على مشاهدات أقل" },
};

const TransparencyIndicator = ({ listing, compact = false, className, onFieldClick, onListingUpdated }: TransparencyIndicatorProps) => {
  const { user } = useAuthContext();
  const result = calculateTransparency(listing);
  const style = getScoreStyle(result.score);
  const tier = TIER_INFO[style.tier];

  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMissingClick = useCallback((label: string) => {
    if (label === "فواتير أو عقود صيانة") {
      setDocsDialogOpen(true);
      return;
    }
    onFieldClick?.(label);
  }, [onFieldClick]);

  const handleFilesSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) setSelectedFiles(prev => [...prev, ...files]);
    if (e.target) e.target.value = "";
  }, []);

  const handleUploadDocs = useCallback(async () => {
    if (!user || !listing?.id || selectedFiles.length === 0) return;
    setUploading(true);

    try {
      const uploadedDocs: { name: string; type: string; url: string }[] = [];

      for (const file of selectedFiles) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const safeName = file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "")
          .slice(0, 60) || "file";
        const path = `${user.id}/${listing.id}/docs/maintenance/${Date.now()}-${safeName}.${ext}`;

        const { data, error } = await supabase.storage
          .from("listings")
          .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });

        if (error) {
          console.error("[TransparencyIndicator] Upload failed:", error.message);
          toast.error(`فشل رفع ${file.name}: ${error.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage.from("listings").getPublicUrl(data.path);
        uploadedDocs.push({
          name: file.name,
          type: "فواتير أو عقود صيانة",
          url: urlData.publicUrl,
        });
      }

      if (uploadedDocs.length === 0) {
        setUploading(false);
        return;
      }

      // Merge with existing documents
      const existingDocs = Array.isArray(listing.documents) ? listing.documents : [];
      const mergedDocs = [...existingDocs, ...uploadedDocs];

      const { data: updated, error: updateError } = await supabase
        .from("listings")
        .update({ documents: mergedDocs as any })
        .eq("id", listing.id)
        .select()
        .single();

      if (updateError) {
        toast.error("فشل تحديث المستندات");
        console.error("[TransparencyIndicator] Update failed:", updateError);
      } else {
        toast.success("تم رفع المستندات بنجاح");
        setDocsDialogOpen(false);
        setSelectedFiles([]);
        onListingUpdated?.(updated);
      }
    } catch (err) {
      console.error("[TransparencyIndicator] Unexpected error:", err);
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setUploading(false);
    }
  }, [user, listing, selectedFiles, onListingUpdated]);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500", style.bar)} style={{ width: `${result.score}%` }} />
        </div>
        <span className={cn("text-xs font-medium whitespace-nowrap", style.text)}>{result.score}%</span>
      </div>
    );
  }

  // Split checklist: filled first, then missing
  const filledItems = result.checklist.filter(i => i.filled);
  const missingItems = result.checklist.filter(i => !i.filled);

  return (
    <>
      <div className={cn("rounded-xl border overflow-hidden transition-colors", style.bg, style.border, className)}>
        {/* Score + bar */}
        <div className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center ring-1", style.bg, style.ring)}>
                {style.tier === "trusted" ? (
                  <CheckCircle2 size={16} className="text-success" />
                ) : (
                  <AlertCircle size={16} className={style.text} />
                )}
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground leading-none mb-0.5">اكتمال الإعلان</p>
                <p className={cn("text-xs font-semibold leading-none", style.text)}>{tier.badge}</p>
              </div>
            </div>
            <div className="text-left">
              <span className={cn("text-xl font-bold tabular-nums leading-none", style.text)}>{result.score}</span>
              <span className={cn("text-xs font-medium", style.text)}>%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-background/60 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700 ease-out", style.bar)}
              style={{ width: `${result.score}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {result.filledRequired} من {result.totalRequired} حقل مكتمل
            </p>
            {style.tier === "trusted" && (
              <span className="text-[10px] font-medium text-success flex items-center gap-0.5">
                <Shield size={9} /> شارة موثوق مفعّلة
              </span>
            )}
          </div>
        </div>

        {/* Checklist — always visible */}
        <div className="border-t border-border/15 px-3.5 py-3 space-y-1.5">
          {filledItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-success shrink-0" />
              <span className="text-[11px] text-foreground">{item.label}</span>
            </div>
          ))}
          {missingItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Square size={14} className="text-muted-foreground/30 shrink-0" />
                <span className="text-[11px] text-muted-foreground">{item.label}</span>
              </div>
              <button
                onClick={() => handleMissingClick(item.label)}
                className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors px-2 py-0.5 rounded-md bg-primary/5 hover:bg-primary/10"
              >
                أضف الآن ←
              </button>
            </div>
          ))}
        </div>

        {/* Impact hint */}
        <div className="px-3.5 pb-3 pt-0.5">
          <div className="flex items-start gap-2 bg-background/40 rounded-lg p-2.5">
            <TrendingUp size={12} className={cn("shrink-0 mt-0.5", style.text)} />
            <p className="text-[10px] leading-relaxed text-muted-foreground">{tier.hint}</p>
          </div>
        </div>
      </div>

      {/* Maintenance docs upload dialog */}
      <Dialog open={docsDialogOpen} onOpenChange={(open) => { setDocsDialogOpen(open); if (!open) setSelectedFiles([]); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base">رفع فواتير أو عقود صيانة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*,.doc,.docx"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">اضغط لاختيار الملفات</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">PDF, صور, DOC</p>
            </button>

            {selectedFiles.length > 0 && (
              <div className="space-y-1.5">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <span className="text-xs truncate flex-1">{f.name}</span>
                    <button
                      onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-[10px] text-destructive hover:underline mr-2"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleUploadDocs}
              disabled={uploading || selectedFiles.length === 0}
              className="w-full rounded-xl"
            >
              {uploading ? <Loader2 size={16} className="animate-spin ml-2" /> : <Upload size={16} className="ml-2" />}
              {uploading ? "جاري الرفع..." : `رفع ${selectedFiles.length} ملف`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TransparencyIndicator;
