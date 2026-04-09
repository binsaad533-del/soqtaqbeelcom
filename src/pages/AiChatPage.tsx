import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Zap, Command, ArrowRight, AlertTriangle, Info, Bell, Paperclip, Copy, Check, ChevronRight, FileText, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAiContext, type AiSuggestion, type QuickCommand } from "@/hooks/useAiContext";
import { usePageData } from "@/hooks/usePageData";
import { useAiMemory } from "@/hooks/useAiMemory";

import { useMarketAlerts } from "@/hooks/useMarketAlerts";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import MoqbilAvatar from "@/components/MoqbilAvatar";
import AiRecommendations from "@/components/AiRecommendations";
import SmartMatchPanel from "@/components/SmartMatchPanel";
import { toast } from "sonner";


interface PendingFile {
  name: string;
  type: string;
  size: number;
  dataUrl?: string;       // base64 data URI (for small images only)
  storageUrl?: string;     // signed URL from storage (for large files)
  isImage: boolean;
  textContent?: string;    // extracted text for text-based files
  uploaded: boolean;       // whether file was uploaded to storage
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  images?: string[];
  files?: { name: string; type: string; size: number; isImage: boolean }[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

async function streamChat({
  messages,
  context,
  role,
  user_id,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string | any[] }[];
  context?: string;
  role?: string;
  user_id?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, context, role, user_id }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "خطأ غير معروف" }));
      onError(err.error || "حدث خطأ");
      return;
    }

    if (!resp.body) { onError("لا يوجد استجابة"); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(json);
          const c = parsed.choices?.[0]?.delta?.content;
          if (c) onDelta(c);
        } catch { /* partial */ }
      }
    }
    onDone();
  } catch {
    onError("فشل الاتصال بالمساعد الذكي");
  }
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground/50 hover:text-foreground transition-colors" title="نسخ">
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  );
};


function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "csv", "json", "xml", "html", "css", "js", "ts", "tsx", "jsx",
  "yaml", "yml", "toml", "ini", "cfg", "log", "sql", "py", "rb", "java", "c",
  "cpp", "h", "swift", "kt", "go", "rs", "php", "env", "sh", "bash",
]);

function isTextFile(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  if (file.type === "application/json" || file.type === "application/xml") return true;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return TEXT_EXTENSIONS.has(ext);
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AiChatPage = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();
  const _location = useLocation();
  const { user, role: authRole } = useAuthContext();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { greeting, role, suggestions, proactiveInsights, quickCommands, pathname } = useAiContext();
  const { pageData } = usePageData();
  const { getMemoryContext, addAiNote, memory, loaded: memoryLoaded } = useAiMemory();
  const { alerts: marketAlerts, markRead: markAlertRead, dismissAlert } = useMarketAlerts();


  useEffect(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, [messages, streaming]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const now = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const buildContext = useCallback(() => {
    let ctx = `الصفحة الحالية: ${pathname}\nدور المستخدم: ${role}`;
    if (pageData) ctx += `\n\n${pageData}`;
    const memCtx = getMemoryContext();
    if (memCtx) ctx += `\n\n${memCtx}`;
    return ctx;
  }, [pathname, role, pageData, getMemoryContext]);

  const MAX_BASE64_SIZE = 4 * 1024 * 1024; // 4MB — keep base64 for small images only

  const uploadToStorage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `ai-chat/${user?.id || "anon"}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data: signedData, error: signedError } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signedError) throw signedError;
    return signedData.signedUrl;
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoadingFiles(true);
    const newFiles: PendingFile[] = [];

    for (const file of Array.from(files)) {
      try {
        const image = isImageFile(file);
        let dataUrl: string | undefined;
        let storageUrl: string | undefined;
        let textContent: string | undefined;
        let uploaded = false;

        // Text-based files: extract text content directly
        if (isTextFile(file)) {
          try {
            textContent = await fileToText(file);
            if (textContent.length > 50000) {
              textContent = textContent.slice(0, 50000) + "\n\n... [تم اختصار الملف - الحجم الأصلي: " + formatFileSize(file.size) + "]";
            }
          } catch { /* fallback */ }
          // Small text files don't need storage upload
          uploaded = false;
        }

        // Small images: base64 for direct vision AI
        if (image && file.size <= MAX_BASE64_SIZE) {
          dataUrl = await fileToBase64(file);
        }
        // Large images: upload to storage, send URL
        else if (image && file.size > MAX_BASE64_SIZE) {
          try {
            storageUrl = await uploadToStorage(file);
            uploaded = true;
            toast.success(`تم رفع ${file.name}`);
          } catch (err) {
            console.error("Upload failed:", err);
            toast.error(`فشل رفع ${file.name}`);
            continue;
          }
        }
        // Binary documents (PDF, DOCX, XLSX, etc): upload to storage
        else if (!isTextFile(file) && !image) {
          try {
            storageUrl = await uploadToStorage(file);
            uploaded = true;
            toast.success(`تم رفع ${file.name}`);
          } catch (err) {
            console.error("Upload failed:", err);
            toast.error(`فشل رفع ${file.name}`);
            continue;
          }
        }

        newFiles.push({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
          storageUrl,
          isImage: image,
          textContent,
          uploaded,
        });
      } catch {
        toast.error(`فشل قراءة الملف: ${file.name}`);
      }
    }

    if (newFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...newFiles]);
    }
    setLoadingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [user?.id]);

  const removePendingFile = (index: number) => setPendingFiles(prev => prev.filter((_, i) => i !== index));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dt = e.dataTransfer;
    if (!dt.files || dt.files.length === 0) return;
    // Reuse the same handler by creating a synthetic event
    const fakeEvent = { target: { files: dt.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileUpload(fakeEvent);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const sendMessage = useCallback((text: string, files?: PendingFile[]) => {
    const imageUrls = files?.filter(f => f.isImage).map(f => f.dataUrl || f.storageUrl).filter(Boolean) as string[];
    const fileMeta = files?.map(f => ({ name: f.name, type: f.type, size: f.size, isImage: f.isImage }));

    const userMsg: ChatMsg = {
      id: String(Date.now()),
      role: "user",
      content: text,
      time: now(),
      images: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
      files: fileMeta && fileMeta.length > 0 ? fileMeta : undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    // Build multimodal content for the current message
    const buildContent = (msg: ChatMsg, msgFiles?: PendingFile[]): string | any[] => {
      if (msgFiles && msgFiles.length > 0) {
        const parts: any[] = [];
        let combinedText = msg.content || "";

        // Add text file contents
        const textFiles = msgFiles.filter(f => f.textContent);
        if (textFiles.length > 0) {
          combinedText += "\n\n";
          for (const tf of textFiles) {
            combinedText += `\n📄 محتوى ملف "${tf.name}":\n\`\`\`\n${tf.textContent}\n\`\`\`\n`;
          }
        }

        // Add uploaded binary doc descriptions with URLs
        const uploadedDocs = msgFiles.filter(f => !f.isImage && !f.textContent && f.storageUrl);
        if (uploadedDocs.length > 0) {
          combinedText += "\n\n";
          for (const doc of uploadedDocs) {
            combinedText += `\n📎 ملف مرفق: "${doc.name}" (${doc.type}, ${formatFileSize(doc.size)}) — رابط: ${doc.storageUrl}`;
          }
        }

        // Add non-uploaded non-image files
        const otherFiles = msgFiles.filter(f => !f.isImage && !f.textContent && !f.storageUrl);
        if (otherFiles.length > 0) {
          combinedText += "\n\n";
          for (const of_ of otherFiles) {
            combinedText += `\n📎 ملف مرفق: "${of_.name}" (${of_.type}, ${formatFileSize(of_.size)})`;
          }
        }

        if (combinedText.trim()) {
          parts.push({ type: "text", text: combinedText.trim() });
        }

        // Add images — use dataUrl (base64) or storageUrl
        const imageFiles = msgFiles.filter(f => f.isImage);
        for (const img of imageFiles) {
          const url = img.dataUrl || img.storageUrl;
          if (url) {
            parts.push({ type: "image_url", image_url: { url } });
          }
        }

        return parts.length > 0 ? parts : msg.content;
      }

      // For historical messages with images
      if (msg.images && msg.images.length > 0) {
        const parts: any[] = [];
        if (msg.content) parts.push({ type: "text", text: msg.content });
        for (const img of msg.images) parts.push({ type: "image_url", image_url: { url: img } });
        return parts;
      }
      return msg.content;
    };

    const allMessages = [...messages, userMsg].map((m, i, arr) => ({
      role: m.role === "assistant" ? "assistant" as const : "user" as const,
      content: i === arr.length - 1 && m.role === "user" ? buildContent(m, files) : buildContent(m),
    }));

    let assistantText = "";
    const assistantId = String(Date.now() + 1);

    streamChat({
      messages: allMessages,
      context: buildContext(),
      role: authRole || "customer",
      user_id: user?.id,
      onDelta: (chunk) => {
        assistantText += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id === assistantId) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
          }
          return [...prev, { id: assistantId, role: "assistant", content: assistantText, time: now() }];
        });
      },
      onDone: () => {
        setStreaming(false);
        if (assistantText.length > 20) addAiNote(`المستخدم سأل: "${text.slice(0, 50)}" في صفحة ${pathname}`);
      },
      onError: (err) => {
        setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: `⚠️ ${err}`, time: now() }]);
        setStreaming(false);
      },
    });
  }, [messages, buildContext, addAiNote, pathname]);

  const handleSend = () => {
    const hasText = input.trim().length > 0;
    const hasFiles = pendingFiles.length > 0;
    if ((!hasText && !hasFiles) || streaming) return;

    const hasImages = pendingFiles.some(f => f.isImage);
    const hasDocuments = pendingFiles.some(f => !f.isImage);

    let text = hasText ? input : "";
    if (!hasText && hasFiles) {
      if (hasImages && hasDocuments) text = "حلل هذه الملفات والصور";
      else if (hasImages) text = "حلل هذه الصور";
      else text = "حلل هذه الملفات";
    }

    const files = hasFiles ? [...pendingFiles] : undefined;
    setInput("");
    setPendingFiles([]);
    sendMessage(text, files);
  };

  const hasInsights = proactiveInsights.length > 0 || marketAlerts.length > 0;

  return (
    <div className="flex h-[calc(100vh-60px)] overflow-hidden" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary/40 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-card/90 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg text-center">
            <Paperclip size={32} className="text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">أفلت الملفات هنا</p>
            <p className="text-xs text-muted-foreground">أي نوع وأي حجم</p>
          </div>
        </div>
      )}
      {/* Hidden file input - accept all */}
      <input ref={fileInputRef} type="file" accept="*/*" multiple className="hidden" onChange={handleFileUpload} />

      {/* Sidebar */}
      <div className={cn(
        "border-l border-border/30 bg-card/50 transition-all duration-300 flex flex-col shrink-0 overflow-hidden",
        showSidebar ? "w-[320px]" : "w-0"
      )}>
        {showSidebar && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-border/30">
              <div className="w-11 h-11 rounded-full overflow-hidden">
                <MoqbilAvatar size={44} />
              </div>
              <div>
                <h2 className="text-sm font-semibold">مقبل مرشدك الذكي طحطوح الصفقات</h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] text-success">نشط</span>
                  {memoryLoaded && memory.interaction_count > 0 && (
                    <span className="text-[9px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded-full mr-1">
                      {memory.interaction_count} تفاعل
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{greeting}</p>

            {/* Proactive Insights */}
            {hasInsights && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1">
                  <Bell size={11} className="text-primary" strokeWidth={2} />
                  <span className="text-[10px] font-medium text-primary">تنبيهات ذكية</span>
                </div>
                {proactiveInsights.map((insight) => (
                  <div key={insight.id} className={cn(
                    "rounded-xl p-2.5 border text-[11px] leading-relaxed",
                    insight.type === "warning" ? "bg-warning/5 border-warning/20" : insight.type === "action" ? "bg-primary/5 border-primary/15" : "bg-muted/30 border-border/30"
                  )}>
                    <div className="flex items-start gap-2">
                      {insight.type === "warning" ? <AlertTriangle size={12} className="text-warning shrink-0 mt-0.5" /> : <Info size={12} className="text-primary shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground/80">{insight.message}</span>
                        {insight.actionLabel && (
                          <button onClick={() => insight.actionPath && navigate(insight.actionPath)} className="flex items-center gap-1 mt-1 text-primary text-[10px] font-medium hover:underline">
                            {insight.actionLabel} <ArrowRight size={9} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Market Alerts */}
            {marketAlerts.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1">
                  <Zap size={11} className="text-warning" strokeWidth={2} />
                  <span className="text-[10px] font-medium text-warning">رادار السوق</span>
                </div>
                {marketAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className={cn(
                    "rounded-xl p-2.5 border text-[11px] leading-relaxed",
                    alert.priority === "high" ? "bg-warning/5 border-warning/20" : alert.priority === "critical" ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/15"
                  )}>
                    <div className="flex items-start gap-2">
                      <span className="text-sm shrink-0 mt-0.5">{alert.alert_type === "gold_opportunity" ? "💎" : alert.alert_type === "price_drop" ? "📉" : "🔔"}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground block text-[11px]">{alert.title}</span>
                        <span className="text-foreground/70 text-[10px]">{alert.message}</span>
                        <div className="flex items-center gap-2 mt-1">
                          {alert.reference_id && (
                            <button onClick={() => { markAlertRead(alert.id); navigate(`/listing/${alert.reference_id}`); }} className="text-primary text-[10px] font-medium hover:underline flex items-center gap-0.5">
                              عرض الفرصة <ArrowRight size={8} />
                            </button>
                          )}
                          <button onClick={() => dismissAlert(alert.id)} className="text-muted-foreground text-[9px] hover:text-foreground mr-auto">تجاهل</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {suggestions.map((s) => (
              <button key={s.id} onClick={() => sendMessage(s.label)} className="w-full text-right rounded-xl border border-border/40 hover:border-primary/20 hover:bg-primary/[0.03] p-3 transition-all group">
                <div className="flex items-start gap-2.5">
                  <span className="text-lg mt-0.5 shrink-0">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium text-foreground">{s.label}</span>
                      {s.priority === "high" && <Zap size={10} className="text-warning shrink-0" strokeWidth={2} />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              </button>
            ))}

            <AiRecommendations />
            <SmartMatchPanel />

            {/* Quick Commands */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1">
                <Command size={11} className="text-primary" strokeWidth={2} />
                <span className="text-[10px] font-medium text-primary">أوامر سريعة</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {quickCommands.map((cmd) => (
                  <button key={cmd.id} onClick={() => sendMessage(cmd.action)} className="flex items-center gap-2 p-2 rounded-xl border border-border/40 hover:border-primary/20 hover:bg-primary/[0.03] transition-all text-right">
                    <span className="text-sm shrink-0">{cmd.icon}</span>
                    <span className="text-[10px] text-foreground/80 font-medium leading-tight">{cmd.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* File upload */}
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 rounded-xl border border-dashed border-primary/25 text-xs text-primary hover:bg-primary/[0.03] transition-colors flex items-center justify-center gap-2">
              <Paperclip size={14} strokeWidth={1.5} />
              ارفع ملفات أو صور وأحللها لك
            </button>
          </div>
        )}
      </div>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="absolute top-1/2 -translate-y-1/2 z-10 w-5 h-10 rounded-l-lg bg-card border border-border/40 border-r-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        style={{ right: showSidebar ? "320px" : "0px" }}
      >
        <ChevronRight size={12} className={cn("transition-transform", showSidebar ? "" : "rotate-180")} />
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {/* Chat header */}
        <div className="px-6 py-3 border-b border-border/30 bg-gradient-to-l from-primary/5 to-transparent flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden">
            <MoqbilAvatar size={36} />
          </div>
          <div>
            <h1 className="text-sm font-semibold">محادثة مقبل</h1>
            <p className="text-[10px] text-muted-foreground">{role}</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden opacity-80">
                <MoqbilAvatar size={64} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground/70">مرحباً، أنا مقبل مرشدك الذكي طحطوح الصفقات</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">مساعدك الذكي في سوق تقبيل. اسألني أي سؤال عن الصفقات أو الفرص أو تحليل السوق، أو ارفع صور وملفات وأحللها لك.</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn("max-w-[70%] break-words overflow-hidden", msg.role === "user" ? "mr-auto" : "ml-auto")}>
              <div className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary/8 border border-primary/10"
                  : "bg-accent/50 border border-accent-foreground/10"
              )}>
                {msg.role === "assistant" && (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <MoqbilAvatar size={16} />
                      <span className="text-[11px] text-accent-foreground font-medium">مقبل</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyButton text={msg.content} />
                    </div>
                  </div>
                )}
                {/* Show images */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.images.map((img, i) => (
                      <img key={i} src={img} alt={`صورة ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-border/30" />
                    ))}
                  </div>
                )}
                {/* Show non-image files */}
                {msg.files && msg.files.filter(f => !f.isImage).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.files.filter(f => !f.isImage).map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/30">
                        <FileText size={13} className="text-primary shrink-0" />
                        <span className="text-[10px] text-foreground/80 max-w-[120px] truncate">{f.name}</span>
                        <span className="text-[9px] text-muted-foreground">{formatFileSize(f.size)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:text-foreground">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1 block">{msg.time}</span>
            </div>
          ))}

          {streaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="ml-auto max-w-[70%]">
              <div className="rounded-2xl px-4 py-3 bg-accent/50 border border-accent-foreground/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <MoqbilAvatar size={16} />
                  <span className="text-[11px] text-accent-foreground font-medium">يفكر...</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-border/30 shrink-0 bg-card/30">
          {/* Pending files preview */}
          {pendingFiles.length > 0 && (
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
              {pendingFiles.map((pf, i) => (
                <div key={i} className="relative shrink-0">
                  {pf.isImage ? (
                    <img src={pf.dataUrl || pf.storageUrl} alt="" className="w-14 h-14 object-cover rounded-lg border border-primary/20" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg border border-primary/20 bg-muted/30 flex flex-col items-center justify-center gap-0.5 p-1">
                      <FileText size={16} className="text-primary/60" />
                      <span className="text-[7px] text-muted-foreground text-center leading-tight truncate w-full">{pf.name.split(".").pop()?.toUpperCase()}</span>
                    </div>
                  )}
                  {pf.uploaded && (
                    <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-success text-success-foreground flex items-center justify-center text-[8px]">✓</span>
                  )}
                  <button onClick={() => removePendingFile(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[8px]">✕</button>
                </div>
              ))}
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {pendingFiles.length} {pendingFiles.every(f => f.isImage) ? "صورة" : pendingFiles.every(f => !f.isImage) ? "ملف" : "ملف/صورة"} جاهزة
              </span>
            </div>
          )}

          {loadingFiles && (
            <div className="flex items-center justify-center gap-2 mb-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span className="text-xs text-primary font-medium">جاري تجهيز الملفات...</span>
            </div>
          )}

          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <button onClick={() => fileInputRef.current?.click()} disabled={streaming || loadingFiles} className="rounded-xl h-10 w-10 flex items-center justify-center transition-all shrink-0 text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 border border-border/30" title="ارفع ملف أو صورة">
              <Paperclip size={16} strokeWidth={1.5} />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder={pendingFiles.length > 0 ? "أضف وصف أو أرسل مباشرة..." : "اسأل مقبل أي شي أو ارفع ملف..."}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border/50 bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
              disabled={streaming}
            />
            <Button onClick={handleSend} size="icon" disabled={(streaming && pendingFiles.length === 0) || loadingFiles} className="gradient-primary text-primary-foreground rounded-xl h-10 w-10 active:scale-[0.95]">
              <Send size={16} strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiChatPage;
