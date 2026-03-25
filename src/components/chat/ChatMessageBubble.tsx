import { useState } from "react";
import { FileText, Download, Maximize2 } from "lucide-react";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import type { NegotiationMessage } from "@/hooks/useDeals";

interface ChatMessageBubbleProps {
  msg: NegotiationMessage;
  isMe: boolean;
  buyerId?: string;
  sellerId?: string;
}

export default function ChatMessageBubble({ msg, isMe, buyerId, sellerId }: ChatMessageBubbleProps) {
  const [imgExpanded, setImgExpanded] = useState(false);
  const isAi = msg.sender_type === "ai" || msg.message_type === "ai_request" || msg.message_type === "ai_mediation";
  const isImage = msg.message_type === "image";
  const isDoc = msg.message_type === "document";
  const meta = (msg.metadata || {}) as Record<string, any>;

  return (
    <>
      <div className={cn(
        "max-w-[80%]",
        isMe ? "mr-auto" : isAi ? "mx-auto max-w-[90%]" : "ml-auto"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isMe ? "bg-primary/8 border border-primary/10" :
          isAi ? "bg-gradient-to-br from-accent/60 to-accent/30 border border-accent-foreground/10" :
          "bg-muted/60"
        )}>
          {isAi && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <AiStar size={14} />
              <span className="text-xs text-accent-foreground font-medium">AI — وسيط الصفقة</span>
            </div>
          )}

          {isImage && meta.file_url ? (
            <div className="space-y-1.5">
              <button
                onClick={() => setImgExpanded(true)}
                className="relative group rounded-xl overflow-hidden block max-w-[280px]"
              >
                <img
                  src={meta.file_url}
                  alt={meta.file_name || "صورة"}
                  className="w-full max-h-[240px] object-cover rounded-xl"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
              {meta.file_name && (
                <p className="text-[10px] text-muted-foreground">{meta.file_name}</p>
              )}
            </div>
          ) : isDoc && meta.file_url ? (
            <button
              type="button"
              onClick={() => {
                const a = document.createElement('a');
                a.href = meta.file_url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30 hover:bg-background/80 transition-colors w-full text-right"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{meta.file_name || "مستند"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {meta.file_size ? `${(meta.file_size / 1024).toFixed(0)} KB` : "مستند مرفق"}
                </p>
              </div>
              <Download size={14} className="text-muted-foreground shrink-0" />
            </button>
          ) : (
            <span className="whitespace-pre-line">{msg.message}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 px-1">
          <span className="text-[10px] text-muted-foreground">
            {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
          </span>
          {isMe && <span className="text-[10px] text-primary/60">أنت</span>}
        </div>
      </div>

      {/* Full-screen image viewer */}
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
