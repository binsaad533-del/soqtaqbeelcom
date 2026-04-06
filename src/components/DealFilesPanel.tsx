import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileUp, Trash2, Download, Loader2, File, Image, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};
const ALLOWED_EXTENSIONS = Object.values(ALLOWED_TYPES).flat();

interface DealFile {
  id: string;
  deal_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  uploaded_by: string;
  uploaded_at: string;
}

interface DealFilesPanelProps {
  dealId: string;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <Image size={14} className="text-blue-500" />;
  if (type.includes("pdf")) return <FileText size={14} className="text-red-500" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return <FileSpreadsheet size={14} className="text-green-500" />;
  return <File size={14} className="text-muted-foreground" />;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DealFilesPanel({ dealId }: DealFilesPanelProps) {
  const { user } = useAuthContext();
  const [files, setFiles] = useState<DealFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    const { data } = await supabase
      .from("deal_files")
      .select("*")
      .eq("deal_id", dealId)
      .order("uploaded_at", { ascending: false });
    if (data) setFiles(data as DealFile[]);
    setLoading(false);
  };

  useEffect(() => { loadFiles(); }, [dealId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length || !user) return;

    setUploading(true);
    let uploadedCount = 0;

    for (const file of Array.from(selected)) {
      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: الحد الأقصى 10 ميغابايت`);
        continue;
      }
      // Validate type
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext) && !Object.keys(ALLOWED_TYPES).includes(file.type)) {
        toast.error(`${file.name}: نوع الملف غير مدعوم`);
        continue;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${dealId}/${user.id}/${Date.now()}_${safeName}`;

      const { error: uploadErr } = await supabase.storage.from("deal-files").upload(path, file);
      if (uploadErr) {
        toast.error(`فشل رفع ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("deal-files").getPublicUrl(path);

      const { error: dbErr } = await supabase.from("deal_files").insert({
        deal_id: dealId,
        file_url: path,
        file_name: file.name,
        file_type: file.type || ext,
        file_size: file.size,
        uploaded_by: user.id,
      });

      if (dbErr) {
        toast.error(`فشل حفظ ${file.name}`);
        continue;
      }
      uploadedCount++;
    }

    if (uploadedCount > 0) {
      toast.success(`تم رفع ${uploadedCount} ملف بنجاح`);
      loadFiles();
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (file: DealFile) => {
    await supabase.storage.from("deal-files").remove([file.file_url]);
    await supabase.from("deal_files").delete().eq("id", file.id);
    setFiles(prev => prev.filter(f => f.id !== file.id));
    toast.success("تم حذف الملف");
  };

  const handleDownload = async (file: DealFile) => {
    const { data } = await supabase.storage.from("deal-files").createSignedUrl(file.file_url, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <FileUp size={14} />
          مرفقات الصفقة
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] gap-1"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={12} />}
          رفع ملفات
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
      ) : files.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-3">لا توجد مرفقات بعد</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
              {getFileIcon(file.file_type)}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium truncate text-foreground">{file.file_name}</p>
                <p className="text-[9px] text-muted-foreground">{formatSize(file.file_size)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDownload(file)} className="p-1 hover:bg-muted rounded" title="تحميل">
                  <Download size={12} className="text-muted-foreground" />
                </button>
                {file.uploaded_by === user?.id && (
                  <button onClick={() => handleDelete(file)} className="p-1 hover:bg-destructive/10 rounded" title="حذف">
                    <Trash2 size={12} className="text-destructive" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
