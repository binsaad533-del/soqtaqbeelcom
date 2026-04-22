import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileReviewDialog } from "@/components/FileReviewDialog";
import { useFileClassifications } from "@/hooks/useFileClassifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { FlaskConical, Upload, Trash2, Eye, RefreshCw } from "lucide-react";

const SUGGESTED_TEST_LISTING_ID = "f44d9568-2437-4f99-b842-90f2671e5073";

export default function DevTestClassifierPage() {
  const { user, role, loading } = useAuthContext();
  const [listingId, setListingId] = useState(SUGGESTED_TEST_LISTING_ID);
  const [files, setFiles] = useState<File[]>([]);
  const [classifying, setClassifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { classifications, counts, refresh, deleteAll } = useFileClassifications(listingId);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || role !== "platform_owner") {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    setFiles(list);
  };

  const uploadAndClassify = async () => {
    if (!listingId.trim()) {
      toast.error("أدخل listing_id");
      return;
    }
    if (!files.length) {
      toast.error("اختر ملفات للتصنيف");
      return;
    }

    setClassifying(true);
    setProgress(0);
    let done = 0;
    const total = files.length;

    for (const file of files) {
      setProgressLabel(`رفع ${file.name}...`);
      try {
        // Upload to storage
        const path = `dev-test/${listingId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("listing-photos")
          .upload(path, file, { upsert: true });
        if (upErr) {
          toast.error(`فشل رفع ${file.name}: ${upErr.message}`);
          done++;
          setProgress(Math.round((done / total) * 100));
          continue;
        }
        const { data: pub } = supabase.storage
          .from("listing-photos")
          .getPublicUrl(path);

        setProgressLabel(`تصنيف ${file.name}...`);
        const { error: fnErr } = await supabase.functions.invoke(
          "classify-uploaded-file",
          {
            body: {
              listing_id: listingId,
              file_url: pub.publicUrl,
              file_name: file.name,
              file_type: file.type,
            },
          },
        );
        if (fnErr) {
          toast.error(`فشل تصنيف ${file.name}: ${fnErr.message}`);
        }
      } catch (e) {
        toast.error(`خطأ: ${(e as Error).message}`);
      }

      done++;
      setProgress(Math.round((done / total) * 100));
      // 1s spacing to avoid rate limits
      if (done < total) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setClassifying(false);
    setProgressLabel("");
    setFiles([]);
    toast.success(`اكتمل تصنيف ${total} ملف`);
    refresh();
  };

  const handleDeleteAll = async () => {
    if (!confirm("حذف كل التصنيفات لهذا الإعلان؟")) return;
    await deleteAll();
  };

  return (
    <div className="container max-w-4xl py-8" dir="rtl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">صفحة اختبار المصنّف</h1>
          <Badge variant="outline" className="text-xs">DEV</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          صفحة مؤقتة لاختبار محرك تصنيف الملفات. تُحذف بعد إكمال المرحلة A.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">1. إعداد الإعلان</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="listing-id">Listing ID</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="listing-id"
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                placeholder="UUID..."
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setListingId(SUGGESTED_TEST_LISTING_ID)}
              >
                Test Listing
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-muted-foreground">التصنيفات الحالية:</span>
            <Badge variant="secondary">المجموع: {classifications.length}</Badge>
            {counts.equipment_photo > 0 && <Badge variant="outline">معدات: {counts.equipment_photo}</Badge>}
            {counts.property_photo > 0 && <Badge variant="outline">مكان: {counts.property_photo}</Badge>}
            {counts.invoice_document > 0 && <Badge variant="outline">فواتير: {counts.invoice_document}</Badge>}
            {counts.legal_document > 0 && <Badge variant="outline">قانونية: {counts.legal_document}</Badge>}
            {counts.asset_list > 0 && <Badge variant="outline">جرد: {counts.asset_list}</Badge>}
            {counts.rejected > 0 && <Badge variant="outline">مرفوضة: {counts.rejected}</Badge>}
            {counts.unclassified > 0 && <Badge variant="outline">غير مصنف: {counts.unclassified}</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">2. رفع وتصنيف ملفات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            multiple
            onChange={handleFileSelect}
            accept="image/*,application/pdf,.xlsx,.csv"
            disabled={classifying}
          />
          {files.length > 0 && (
            <p className="text-xs text-muted-foreground">
              تم اختيار {files.length} ملف
            </p>
          )}
          <Button
            onClick={uploadAndClassify}
            disabled={classifying || !files.length}
            className="gap-2 w-full"
          >
            <Upload className="w-4 h-4" />
            {classifying ? "جاري التصنيف..." : "رفع وتصنيف"}
          </Button>
          {classifying && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">{progressLabel}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. مراجعة وتنظيف</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Eye className="w-4 h-4" />
            فتح Dialog المراجعة
          </Button>
          <Button variant="outline" onClick={refresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            تحديث
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAll}
            disabled={!classifications.length}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            حذف كل التصنيفات
          </Button>
        </CardContent>
      </Card>

      <FileReviewDialog
        listingId={listingId || null}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
