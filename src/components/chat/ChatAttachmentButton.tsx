import { useState, useRef } from "react";
import { Paperclip, Image, FileText, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validateImageFile, validateDocFile } from "@/lib/security";
import { toast } from "sonner";

interface ChatAttachmentButtonProps {
  dealId: string;
  onFileSent: (message: string, type: string, metadata: Record<string, unknown>) => Promise<void>;
  disabled?: boolean;
}

const ACCEPT = "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function ChatAttachmentButton({ dealId, onFileSent, disabled }: ChatAttachmentButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const imageExts = ["jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "bmp", "avif"];
    const isImage = file.type.startsWith("image/") || imageExts.includes(ext);
    const validation = isImage ? validateImageFile(file) : validateDocFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "ملف غير مدعوم");
      return;
    }

    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreview({ file, url });
    } else {
      uploadAndSend(file);
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadAndSend = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${dealId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(path);

      // Since bucket is private, we'll use signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

      if (signedError) throw signedError;

      const fileUrl = signedData.signedUrl;
      const isImage = file.type.startsWith("image/");
      const messageType = isImage ? "image" : "document";
      const label = isImage ? "📷 صورة" : `📎 ${file.name}`;

      await onFileSent(label, messageType, {
        file_url: fileUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: path,
      });

      setPreview(null);
    } catch (err: any) {
      console.error("[ChatAttachment] Upload failed:", err);
      toast.error("فشل رفع الملف");
    }
    setUploading(false);
  };

  const handleSendPreview = () => {
    if (preview) uploadAndSend(preview.file);
  };

  const cancelPreview = () => {
    if (preview) {
      URL.revokeObjectURL(preview.url);
      setPreview(null);
    }
  };

  return (
    <>
      {/* Preview overlay */}
      {preview && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-card border border-border/50 rounded-xl shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
              <img src={preview.url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{preview.file.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {(preview.file.size / 1024).toFixed(0)} KB
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleSendPreview}
                  disabled={uploading}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-gradient-to-l from-primary to-primary/70 text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : null}
                  إرسال
                </button>
                <button
                  onClick={cancelPreview}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
            <button onClick={cancelPreview} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={disabled || uploading}
        className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all disabled:opacity-50"
        title="إرفاق ملف أو صورة"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} strokeWidth={1.5} />}
      </button>
    </>
  );
}
