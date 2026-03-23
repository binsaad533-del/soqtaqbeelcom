import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, ChevronLeft, Zap, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useAiContext, type AiSuggestion } from "@/hooks/useAiContext";
import { usePageData } from "@/hooks/usePageData";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import muqbilImg from "@/assets/muqbil-character.png";
import muqbilWaveImg from "@/assets/muqbil-wave.png";

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
    onError("فشل الاتصال بمقبل");
  }
}

const AiAssistant = () => {
  const [open, setOpen] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const peekTimer = useRef<ReturnType<typeof setTimeout>>();
  const pendingSpeakRef = useRef<string>("");

  const { greeting, role, suggestions, proactiveMessage, dismissProactive, pathname } = useAiContext();
  const { pageData } = usePageData();

  const handleVoiceTranscript = useCallback((text: string) => {
    setChatMode(true);
    sendMessageRef.current?.(text);
  }, []);

  const {
    isListening,
    isSpeaking,
    voiceEnabled,
    supportsRecognition,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleVoice,
  } = useVoiceChat({ onTranscript: handleVoiceTranscript });

  useEffect(() => { setChatMode(false); setMessages([]); }, [pathname]);
  useEffect(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, [messages, streaming]);
  useEffect(() => { chatMode && inputRef.current?.focus(); }, [chatMode]);

  useEffect(() => {
    if (open || hasInteracted) return;
    peekTimer.current = setTimeout(() => {
      setPeeking(true);
      setTimeout(() => setPeeking(false), 5000);
    }, 6000);
    return () => { clearTimeout(peekTimer.current); setPeeking(false); };
  }, [pathname, open, hasInteracted]);

  const now = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const buildContext = useCallback(() => {
    let ctx = `الصفحة الحالية: ${pathname}\nدور المستخدم: ${role}`;
    if (pageData) ctx += `\n\n${pageData}`;
    return ctx;
  }, [pathname, role, pageData]);

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
    pendingSpeakRef.current = "";

    streamChat({
      messages: allMessages,
      context: buildContext(),
      onDelta: (chunk) => {
        assistantText += chunk;
        pendingSpeakRef.current += chunk;
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
        // Speak the full response when done
        if (pendingSpeakRef.current) {
          speak(pendingSpeakRef.current);
          pendingSpeakRef.current = "";
        }
      },
      onError: (err) => {
        setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: `⚠️ ${err}`, time: now() }]);
        setStreaming(false);
      },
    });
  }, [messages, buildContext, speak]);

  // Keep ref updated for voice callback
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

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

  const handleOpen = () => {
    setOpen(true);
    setPeeking(false);
    setHasInteracted(true);
    dismissProactive();
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      if (isSpeaking) stopSpeaking();
      startListening();
    }
  };

  return (
    <>
      {/* Proactive tooltip with مقبل peeking */}
      {(proactiveMessage || peeking) && !open && (
        <div
          className="fixed bottom-16 left-0 z-50 flex items-end gap-0 cursor-pointer animate-fade-in"
          onClick={handleOpen}
        >
          <div className="relative -ml-6 transition-transform duration-500 ease-out hover:translate-x-2">
            <img src={muqbilWaveImg} alt="مقبل" className="w-20 h-20 object-contain drop-shadow-md" width={80} height={80} />
          </div>
          {proactiveMessage && (
            <div className="max-w-60 mb-8 mr-2">
              <div className="bg-card rounded-2xl p-3 shadow-soft-lg border border-border/40 relative">
                <button
                  onClick={(e) => { e.stopPropagation(); dismissProactive(); setPeeking(false); }}
                  className="absolute top-1.5 right-1.5 text-muted-foreground/50 hover:text-foreground"
                >
                  <X size={10} />
                </button>
                <p className="text-[11px] text-foreground/80 leading-relaxed pr-3">{proactiveMessage}</p>
              </div>
              <div className="w-2.5 h-2.5 bg-card border-b border-l border-border/40 rotate-[-45deg] absolute bottom-6 left-16" />
            </div>
          )}
        </div>
      )}

      {/* مقبل character button */}
      {!open && !peeking && !proactiveMessage && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 left-0 z-50 flex items-center gap-1.5 group transition-all duration-300"
        >
          <div className="relative -ml-3 group-hover:ml-0 transition-all duration-300">
            <img src={muqbilImg} alt="مقبل" className="w-14 h-14 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300" width={56} height={56} />
          </div>
          <span className="text-[11px] font-medium text-foreground/70 bg-card/90 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-soft border border-border/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            مقبل — مساعدك الذكي
          </span>
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-4 left-4 z-50 w-[380px] max-h-[520px] bg-card rounded-2xl shadow-soft-lg border border-border/40 flex flex-col animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-border/30 bg-gradient-to-l from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {chatMode && (
                  <button onClick={() => setChatMode(false)} className="text-muted-foreground hover:text-foreground">
                    <ChevronLeft size={16} strokeWidth={1.5} />
                  </button>
                )}
                <img src={muqbilImg} alt="مقبل" className="w-10 h-10 object-contain" width={40} height={40} />
                <div>
                  <h3 className="text-sm font-medium">مقبل</h3>
                  <p className="text-[10px] text-muted-foreground">{role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Voice toggle */}
                <button
                  onClick={toggleVoice}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    voiceEnabled
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground/50 hover:text-muted-foreground"
                  )}
                  title={voiceEnabled ? "إيقاف الصوت" : "تفعيل الصوت"}
                >
                  {voiceEnabled ? <Volume2 size={14} strokeWidth={1.5} /> : <VolumeX size={14} strokeWidth={1.5} />}
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] text-success">نشط</span>
                </div>
                <button onClick={() => { setOpen(false); stopSpeaking(); stopListening(); }} className="text-muted-foreground/60 hover:text-foreground transition-colors">
                  <X size={14} strokeWidth={1.5} />
                </button>
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
                💬 اسألني أي شي...
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
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <img src={muqbilImg} alt="مقبل" className="w-5 h-5 object-contain" width={20} height={20} />
                          <span className="text-[10px] text-accent-foreground font-medium">مقبل</span>
                          {isSpeaking && (
                            <span className="flex items-center gap-0.5 mr-1">
                              <span className="w-1 h-2 bg-primary/60 rounded-full animate-pulse" />
                              <span className="w-1 h-3 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
                              <span className="w-1 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
                            </span>
                          )}
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
                      <div className="flex items-center gap-1.5 mb-1">
                        <img src={muqbilImg} alt="مقبل" className="w-5 h-5 object-contain" width={20} height={20} />
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

                {/* Listening indicator */}
                {isListening && (
                  <div className="mr-auto max-w-[85%]">
                    <div className="rounded-2xl px-3.5 py-2.5 bg-primary/8 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Mic size={14} className="text-primary animate-pulse" />
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive animate-ping" />
                        </div>
                        <span className="text-[11px] text-primary font-medium">أسمعك... تكلم 🎙️</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-border/30">
                <div className="flex items-center gap-2">
                  {/* Mic button */}
                  {supportsRecognition && voiceEnabled && (
                    <Button
                      onClick={handleMicClick}
                      size="icon"
                      variant={isListening ? "destructive" : "outline"}
                      disabled={streaming}
                      className={cn(
                        "rounded-xl h-8 w-8 shrink-0 transition-all",
                        isListening && "animate-pulse"
                      )}
                      title={isListening ? "إيقاف الاستماع" : "تحدث مع مقبل"}
                    >
                      {isListening ? <MicOff size={13} strokeWidth={1.5} /> : <Mic size={13} strokeWidth={1.5} />}
                    </Button>
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder={voiceEnabled ? "اكتب أو اضغط 🎙️ للتحدث..." : "قولي وش تبغى..."}
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
