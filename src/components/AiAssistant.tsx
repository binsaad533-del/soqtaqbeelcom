import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, ChevronLeft, Zap } from "lucide-react";
import AiStar from "./AiStar";
import { useAiContext, type AiSuggestion } from "@/hooks/useAiContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

async function streamChat({
  messages,
  context,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  context?: string;
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
      body: JSON.stringify({ messages, context }),
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
  } catch (e) {
    onError("فشل الاتصال بالمساعد الذكي");
  }
}

const AiAssistant = () => {
  const [open, setOpen] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { greeting, role, suggestions, proactiveMessage, dismissProactive, pathname } = useAiContext();

  useEffect(() => { setChatMode(false); setMessages([]); }, [pathname]);
  useEffect(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, [messages, streaming]);
  useEffect(() => { chatMode && inputRef.current?.focus(); }, [chatMode]);

  const now = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const buildContext = useCallback(() => {
    return `الصفحة الحالية: ${pathname}\nدور المستخدم: ${role}`;
  }, [pathname, role]);

  const sendMessage = useCallback((text: string) => {
    const userMsg: ChatMsg = { id: String(Date.now()), role: "user", content: text, time: now() };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    const allMessages = [...messages, { role: "user", content: text }].map(m => ({
      role: m.role === "assistant" ? "assistant" as const : "user" as const,
      content: "content" in m ? m.content : "",
    }));

    let assistantText = "";
    const assistantId = String(Date.now() + 1);

    streamChat({
      messages: allMessages,
      context: buildContext(),
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
      onDone: () => setStreaming(false),
      onError: (err) => {
        setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: `⚠️ ${err}`, time: now() }]);
        setStreaming(false);
      },
    });
  }, [messages, buildContext]);

  const handleSend = () => {
    if (!input.trim() || streaming) return;
    const text = input;
    setInput("");
    sendMessage(text);
  };

  const handleSuggestionClick = (s: AiSuggestion) => {
    setChatMode(true);
    sendMessage(s.label);
  };

  return (
    <>
      {/* Proactive tooltip */}
      {proactiveMessage && !open && (
        <div className="fixed bottom-24 left-6 z-50 max-w-72 animate-reveal">
          <div className="bg-card rounded-2xl p-3.5 shadow-soft-lg border border-primary/10 relative">
            <button onClick={dismissProactive} className="absolute top-2 right-2 text-muted-foreground/50 hover:text-foreground">
              <X size={12} />
            </button>
            <p className="text-xs text-foreground/80 leading-relaxed pr-4">{proactiveMessage}</p>
            <button
              onClick={() => { setOpen(true); dismissProactive(); }}
              className="mt-2 text-[11px] text-primary hover:underline"
            >
              تحدث مع المساعد الذكي ←
            </button>
          </div>
          <div className="w-3 h-3 bg-card border-b border-l border-primary/10 rotate-[-45deg] absolute -bottom-1.5 left-10" />
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 left-6 z-50 flex items-center gap-2 transition-all duration-300 hover:shadow-soft-hover",
          open
            ? "w-11 h-11 rounded-full gradient-primary shadow-soft-lg justify-center scale-95"
            : "h-11 rounded-full gradient-primary shadow-soft-lg px-4 pr-3"
        )}
      >
        {open ? (
          <X size={16} className="text-primary-foreground" strokeWidth={1.5} />
        ) : (
          <>
            <div className="relative shrink-0">
              <AiStar size={20} animate className="[&>div]:!opacity-100" />
            </div>
            <span className="text-primary-foreground text-xs font-medium whitespace-nowrap">المساعد الذكي</span>
          </>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 left-6 z-50 w-[380px] max-h-[520px] bg-card rounded-2xl shadow-soft-lg border border-border/40 flex flex-col animate-reveal overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/30 bg-gradient-to-l from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {chatMode && (
                  <button onClick={() => setChatMode(false)} className="text-muted-foreground hover:text-foreground">
                    <ChevronLeft size={16} strokeWidth={1.5} />
                  </button>
                )}
                <AiStar size={22} animate={false} />
                <div>
                  <h3 className="text-sm font-medium">المساعد الذكي</h3>
                  <p className="text-[10px] text-muted-foreground">{role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] text-success">نشط</span>
              </div>
            </div>
          </div>

          {!chatMode ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{greeting}</p>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSuggestionClick(s)}
                  className="w-full text-right rounded-xl border border-border/40 hover:border-primary/20 hover:bg-primary/[0.03] p-3 transition-all group"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg mt-0.5 shrink-0">{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">{s.label}</span>
                        {s.priority === "high" && <Zap size={10} className="text-warning shrink-0" strokeWidth={2} />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
                    </div>
                    <Sparkles size={12} className="text-primary/40 group-hover:text-primary/70 shrink-0 mt-1 transition-colors" strokeWidth={1.5} />
                  </div>
                </button>
              ))}
              <button
                onClick={() => setChatMode(true)}
                className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-xs text-primary hover:bg-primary/[0.03] transition-colors"
              >
                💬 اسألني أي سؤال...
              </button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("max-w-[85%]", msg.role === "user" ? "mr-auto" : "ml-auto")}>
                    <div className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line",
                      msg.role === "user"
                        ? "bg-primary/8 border border-primary/10"
                        : "bg-accent/50 border border-accent-foreground/10"
                    )}>
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <AiStar size={12} animate={false} />
                          <span className="text-[10px] text-accent-foreground font-medium">المساعد الذكي</span>
                        </div>
                      )}
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-0.5 px-1 block">{msg.time}</span>
                  </div>
                ))}

                {streaming && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="ml-auto max-w-[85%]">
                    <div className="rounded-2xl px-3.5 py-2.5 bg-accent/50 border border-accent-foreground/10">
                      <div className="flex items-center gap-1 mb-1">
                        <AiStar size={12} />
                        <span className="text-[10px] text-accent-foreground font-medium">يفكر...</span>
                      </div>
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="اكتب سؤالك..."
                    className="flex-1 px-3 py-2 rounded-xl border border-border/50 bg-background text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
                    disabled={streaming}
                  />
                  <Button onClick={handleSend} size="icon" disabled={streaming} className="gradient-primary text-primary-foreground rounded-xl h-8 w-8 active:scale-[0.95]">
                    <Send size={13} strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default AiAssistant;
