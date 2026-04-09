import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, ChevronLeft, Zap, Command, ArrowRight, AlertTriangle, Info, Bell, FileText, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAiContext, type AiSuggestion, type QuickCommand } from "@/hooks/useAiContext";
import { usePageData } from "@/hooks/usePageData";
import { useAiMemory } from "@/hooks/useAiMemory";
import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AiStar from "@/components/AiStar";
import AiRecommendations from "@/components/AiRecommendations";
import { toast } from "sonner";

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
  } catch {
    onError("فشل الاتصال بالمساعد الذكي");
  }
}

/** Copy button for AI messages */
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground/50 hover:text-foreground transition-colors" title="نسخ">
      {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
    </button>
  );
};

const AiAssistant = () => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"home" | "chat" | "commands">("home");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const navigate = useNavigate();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { greeting, role, suggestions, proactiveInsights, quickCommands, pathname } = useAiContext();
  const { pageData } = usePageData();
  const { getMemoryContext, addAiNote, memory, loaded: memoryLoaded } = useAiMemory();

  useEffect(() => { setView("home"); setMessages([]); }, [pathname]);
  useEffect(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, [messages, streaming]);
  useEffect(() => { view === "chat" && inputRef.current?.focus(); }, [view]);

  const now = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const buildContext = useCallback(() => {
    let ctx = `الصفحة الحالية: ${pathname}\nدور المستخدم: ${role}`;
    // Add page data
    if (pageData) ctx += `\n\n${pageData}`;
    // Add persistent memory
    const memCtx = getMemoryContext();
    if (memCtx) ctx += `\n\n${memCtx}`;
    return ctx;
  }, [pathname, role, pageData, getMemoryContext]);

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
      onDone: () => {
        setStreaming(false);
        // Save a note about this interaction for memory
        if (assistantText.length > 20) {
          addAiNote(`المستخدم سأل: "${text.slice(0, 50)}" في صفحة ${pathname}`);
        }
      },
      onError: (err) => {
        setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: `⚠️ ${err}`, time: now() }]);
        setStreaming(false);
      },
    });
  }, [messages, buildContext, addAiNote, pathname]);

  const handleSend = () => {
    if (!input.trim() || streaming) return;
    const text = input;
    setInput("");
    sendMessage(text);
  };

  const handleSuggestionClick = (s: AiSuggestion) => {
    setView("chat");
    sendMessage(s.label);
  };

  const handleQuickCommand = (cmd: QuickCommand) => {
    setView("chat");
    sendMessage(cmd.action);
  };

  const handleInsightAction = (path?: string) => {
    if (path) {
      setOpen(false);
      navigate(path);
    }
  };

  const hasInsights = proactiveInsights.length > 0;
  const showRecommendations = pathname === "/" || pathname === "/marketplace";

  return (
    <>
      {/* AI Float Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-[-8px] z-50 flex items-center gap-1.5 group transition-all duration-300 hover:left-2"
        >
          <div className="relative w-12 h-12 rounded-full gradient-primary flex items-center justify-center shadow-soft-lg group-hover:scale-110 transition-transform duration-300">
            <AiStar size={26} className="ai-glow-slow [&_.ai-sparkle-big]:!fill-white [&_.ai-sparkle-small]:!fill-white/80" animate={false} />
            {hasInsights && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive flex items-center justify-center text-[9px] font-bold text-destructive-foreground">
                {proactiveInsights.length}
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-foreground/70 bg-card/90 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-soft border border-border/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            مقبل - المساعد الذكي
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-4 left-4 z-50 w-[400px] max-h-[600px] bg-card rounded-2xl shadow-soft-lg border border-border/40 flex flex-col animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-border/30 bg-gradient-to-l from-primary/5 to-transparent shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {view !== "home" && (
                  <button onClick={() => setView("home")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft size={16} strokeWidth={1.5} />
                  </button>
                )}
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                  <AiStar size={22} className="ai-glow-slow [&_.ai-sparkle-big]:!fill-white [&_.ai-sparkle-small]:!fill-white/80" animate={false} />
                </div>
                <div>
                  <h3 className="text-sm font-medium">مقبل</h3>
                  <p className="text-[10px] text-muted-foreground">{role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {memoryLoaded && memory.interaction_count > 0 && (
                  <span className="text-[9px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded-full">
                    {memory.interaction_count} تفاعل
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] text-success">نشط</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-muted-foreground/60 hover:text-foreground transition-colors">
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>

          {/* ─── HOME VIEW ─── */}
          {view === "home" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">{greeting}</p>

              {/* Proactive Insights */}
              {hasInsights && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1">
                    <Bell size={11} className="text-primary" strokeWidth={2} />
                    <span className="text-[10px] font-medium text-primary">تنبيهات ذكية</span>
                  </div>
                  {proactiveInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className={cn(
                        "rounded-xl p-2.5 border text-[11px] leading-relaxed",
                        insight.type === "warning"
                          ? "bg-warning/5 border-warning/20"
                          : insight.type === "action"
                            ? "bg-primary/5 border-primary/15"
                            : "bg-muted/30 border-border/30"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {insight.type === "warning" ? (
                          <AlertTriangle size={12} className="text-warning shrink-0 mt-0.5" />
                        ) : (
                          <Info size={12} className="text-primary shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-foreground/80">{insight.message}</span>
                          {insight.actionLabel && (
                            <button
                              onClick={() => handleInsightAction(insight.actionPath)}
                              className="flex items-center gap-1 mt-1 text-primary text-[10px] font-medium hover:underline"
                            >
                              {insight.actionLabel}
                              <ArrowRight size={9} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Context Suggestions */}
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

              {/* Personalized Recommendations */}
              {showRecommendations && <AiRecommendations />}

              {/* Quick Commands */}
              <button
                onClick={() => setView("commands")}
                className="w-full py-2 rounded-xl border border-dashed border-primary/20 text-xs text-primary hover:bg-primary/[0.03] transition-colors flex items-center justify-center gap-1.5"
              >
                <Command size={12} strokeWidth={2} />
                أوامر سريعة
              </button>

              {/* Free chat */}
              <button
                onClick={() => setView("chat")}
                className="w-full py-2 rounded-xl border border-dashed border-border/30 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
              >
                💬 اسألني أي شي...
              </button>
            </div>
          )}

          {/* ─── COMMANDS VIEW ─── */}
          {view === "commands" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-[11px] text-muted-foreground mb-2">اختر أمر سريع وأنا أنفذه لك:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => handleQuickCommand(cmd)}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-border/40 hover:border-primary/20 hover:bg-primary/[0.03] transition-all text-right"
                  >
                    <span className="text-base shrink-0">{cmd.icon}</span>
                    <span className="text-[11px] text-foreground/80 font-medium leading-tight">{cmd.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── CHAT VIEW ─── */}
          {view === "chat" && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("max-w-[85%]", msg.role === "user" ? "mr-auto" : "ml-auto")}>
                    <div className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary/8 border border-primary/10"
                        : "bg-accent/50 border border-accent-foreground/10"
                    )}>
                      {msg.role === "assistant" && (
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <AiStar size={14} />
                            <span className="text-[10px] text-accent-foreground font-medium">مقبل</span>
                          </div>
                          <CopyButton text={msg.content} />
                        </div>
                      )}
                      {msg.role === "assistant" ? (
                        <div className="prose prose-xs prose-neutral dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_strong]:text-foreground">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-0.5 px-1 block">{msg.time}</span>
                  </div>
                ))}

                {streaming && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="ml-auto max-w-[85%]">
                    <div className="rounded-2xl px-3.5 py-2.5 bg-accent/50 border border-accent-foreground/10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AiStar size={14} />
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

              <div className="p-3 border-t border-border/30 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="قولي وش تبغى..."
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
