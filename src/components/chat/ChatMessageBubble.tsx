import { useState } from "react";
import { FileText, Download, Maximize2, Loader2, Flag, X } from "lucide-react";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import type { NegotiationMessage } from "@/hooks/useDeals";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const REPORT_REASONS = [
  "محتوى مسيء أو غير لائق",
  "محاولة تواصل خارج المنصة",
  "معلومات مضللة أو كاذبة",
  "تهديد أو ابتزاز",
  "احتيال أو نصب",
  "أخرى",
];

interface ChatMessageBubbleProps {
  msg: NegotiationMessage;
  isMe: boolean;
  buyerId?: string;
  sellerId?: string;
}

export default function ChatMessageBubble({ msg, isMe, buyerId, sellerId }: ChatMessageBubbleProps) {
  const { user } = useAuthContext();
  const [imgExpanded, setImgExpanded] = useState(false);
  const [openingDoc, setOpeningDoc] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reported, setReported] = useState(false);

  const isAi = msg.sender_type === "ai" || msg.message_type === "ai_request" || msg.message_type === "ai_mediation";
  const isImage = msg.message_type === "image";
  const isDoc = msg.message_type === "document";
  const meta = (msg.metadata || {}) as Record<string, any>;

  const openDocument = async () => {
    if (!meta.file_url || openingDoc) return;
    try {
      setOpeningDoc(true);
      const response = await fetch(meta.file_url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = meta.file_name || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      console.error("[ChatMessageBubble] Failed to open document:", error);
      toast.error("تعذر فتح الملف أو تحميله");
    } finally {
      setOpeningDoc(false);
    }
  };

  const handleReport = async () => {
    if (!user || !reportReason) return;
    setSubmitting(true);
    try {
      const dealId = (msg as any).deal_id;
      const { error } = await supabase.from("message_reports" as any).insert({
        message_id: msg.id,
        deal_id: dealId,
        reporter_id: user.id,
        reason: reportReason,
        details: reportDetails.trim() || null,
      });
      if (error) throw error;
      toast.success("تم إرسال البلاغ بنجاح، سيتم مراجعته من فريقنا");
      setReported(true);
      setShowReport(false);
    } catch {
      toast.error("فشل إرسال البلاغ، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={cn(
        "max-w-[80%] group",
        isMe ? "mr-auto" : isAi ? "mx-auto max-w-[90%]" : "ml-auto"
      )}>
        <div className={cn(
          "rounded-xl px-3 py-2 text-xs leading-relaxed relative",
          isMe ? "bg-primary/8 border border-primary/10" :
          isAi ? "bg-gradient-to-br from-accent/60 to-accent/30 border border-accent-foreground/10" :
          "bg-muted/60"
        )}>
          {isAi && (
            <div className="flex items-center gap-1 mb-1">
              <AiStar size={12} />
              <span className="text-[10px] text-accent-foreground font-medium">AI — وسيط الصفقة</span>
            </div>
          )}

          {isImage && meta.file_url ? (
            <div className="space-y-1.5">
              <button
                onClick={() => setImgExpanded(true)}
                className="relative group/img rounded-xl overflow-hidden block max-w-[280px]"
              >
                <img
                  src={meta.file_url}
                  alt={meta.file_name || "صورة"}
                  className="w-full max-h-[240px] object-cover rounded-xl"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                  <Maximize2 size={20} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                </div>
              </button>
              {meta.file_name && (
                <p className="text-[9px] text-muted-foreground">{meta.file_name}</p>
              )}
            </div>
          ) : isDoc && meta.file_url ? (
            <button
              type="button"
              onClick={openDocument}
              disabled={openingDoc}
              className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30 hover:bg-background/80 transition-colors w-full text-right disabled:opacity-70"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {openingDoc ? <Loader2 size={18} className="text-primary animate-spin" /> : <FileText size={18} className="text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{meta.file_name || "مستند"}</p>
                <p className="text-[9px] text-muted-foreground">
                  {openingDoc
                    ? "جاري فتح الملف..."
                    : meta.file_size
                      ? `${(meta.file_size / 1024).toFixed(0)} KB`
                      : "مستند مرفق"}
                </p>
              </div>
              <Download size={13} className="text-muted-foreground shrink-0" />
            </button>
          ) : (
            <span className="whitespace-pre-line">{msg.message}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1 px-1">
          <span className="text-[9px] text-muted-foreground">
            {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
          </span>
          {isMe && <span className="text-[9px] text-primary/60">أنت</span>}

          {!isMe && !isAi && !reported && (
            <button
              onClick={() => setShowReport(true)}
              title="إبلاغ عن هذه الرسالة"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-destructive"
            >
              <Flag size={10} />
            </button>
          )}
          {reported && (
            <span className="text-[8px] text-destructive/60">تم الإبلاغ</span>
          )}
        </div>
      </div>

      {/* Report dialog */}
      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowReport(false)}>
          <div
            onClick={e => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl"
            dir="rtl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag size={14} className="text-destructive" />
                <h3 className="text-sm font-semibold">إبلاغ عن رسالة</h3>
              </div>
              <button onClick={() => setShowReport(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {/* Reported message preview */}
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/20">
              <p className="text-xs text-muted-foreground line-clamp-2">{msg.message}</p>
            </div>

            {/* Reason selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">سبب الإبلاغ</label>
              <div className="grid grid-cols-2 gap-1.5">
                {REPORT_REASONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setReportReason(r)}
                    className={cn(
                      "text-[10px] px-2.5 py-2 rounded-lg border transition-all text-right",
                      reportReason === r
                        ? "border-destructive bg-destructive/10 text-destructive font-medium"
                        : "border-border/40 bg-background hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional details */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">تفاصيل إضافية (اختياري)</label>
              <textarea
                value={reportDetails}
                onChange={e => setReportDetails(e.target.value)}
                maxLength={500}
                placeholder="أضف تفاصيل إضافية..."
                className="w-full px-3 py-2 rounded-xl border border-border/40 bg-background text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:border-destructive/30 focus:ring-1 focus:ring-destructive/20 resize-none h-16"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleReport}
                disabled={!reportReason || submitting}
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-9"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : "إرسال البلاغ"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReport(false)}
                className="text-xs h-9"
              >
                إلغاء
              </Button>
            </div>

            <p className="text-[9px] text-muted-foreground text-center">
              سيتم مراجعة البلاغ من فريق المنصة واتخاذ الإجراء المناسب.
            </p>
          </div>
        </div>
      )}

      {imgExpanded && meta.file_url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setImgExpanded(false)}
        >
          <img
            src={meta.file_url}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <button
            onClick={() => setImgExpanded(false)}
            className="absolute top-4 left-4 text-white/80 hover:text-white text-lg bg-black/40 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
