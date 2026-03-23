import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, ChevronLeft, Zap } from "lucide-react";
import AiStar from "./AiStar";
import { useAiContext, type AiSuggestion } from "@/hooks/useAiContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatMsg {
  id: string;
  role: "user" | "ai";
  text: string;
  time: string;
}

const AiAssistant = () => {
  const [open, setOpen] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { greeting, role, suggestions, proactiveMessage, dismissProactive, pathname } = useAiContext();

  // Reset on page change
  useEffect(() => {
    setChatMode(false);
    setMessages([]);
  }, [pathname]);

  // Scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  // Focus input
  useEffect(() => {
    if (chatMode && inputRef.current) inputRef.current.focus();
  }, [chatMode]);

  const now = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const simulateAiResponse = (userText: string) => {
    setTyping(true);
    setTimeout(() => {
      const responses: Record<string, string> = {
        default: "أنا هنا لمساعدتك. اسألني عن أي شيء يخص الصفقة أو المنصة وسأجيبك فوراً.",
      };

      let response = responses.default;

      if (userText.includes("سعر") || userText.includes("تقييم")) {
        response = "بناءً على تحليل الأصول المعلنة والإيرادات المقدّرة، يبدو السعر المطلوب ضمن النطاق المعقول مع وجود هامش تفاوض يتراوح بين 10% إلى 15%. أنصح بالتركيز على تفاصيل عقد الإيجار والالتزامات المالية القائمة قبل تقديم عرض.";
      } else if (userText.includes("تفاوض") || userText.includes("عرض")) {
        response = "أقترح البدء بعرض يعكس قيمة الأصول المؤكّدة مع خصم لأي مخاطر تشغيلية. يمكنني صياغة عرض احترافي نيابة عنك يتضمن شروط حماية وفترة انتقالية.";
      } else if (userText.includes("مخاطر") || userText.includes("خطر")) {
        response = "أبرز المخاطر المحتملة:\n• عدم وضوح الالتزامات المالية القائمة\n• حالة بعض المعدات تحتاج تحقق ميداني\n• مدة الإيجار المتبقية قد تؤثر على العائد\n• غياب بعض المستندات الداعمة\n\nأنصح بطلب كشف حساب بنكي لآخر 6 أشهر ومراجعة عقد الإيجار بالتفصيل.";
      } else if (userText.includes("مستند") || userText.includes("ملف") || userText.includes("رفع")) {
        response = "يمكنك رفع المستندات وسأقوم باستخراج البيانات تلقائياً وتوزيعها على الحقول المناسبة. أدعم: عقود الإيجار، السجلات التجارية، الفواتير، رخص البلدية والدفاع المدني، وأي مستندات داعمة أخرى.";
      } else if (userText.includes("صور") || userText.includes("صورة")) {
        response = "ارفع صور المشروع وسأقوم بـ:\n• تحليل الأصول المرئية وتصنيفها\n• تقدير حالة المعدات\n• اكتشاف الزوايا الناقصة\n• تحسين جودة الصور للعرض\n• إنشاء جرد أولي تلقائي";
      }

      setMessages(prev => [...prev, { id: String(Date.now()), role: "ai", text: response, time: now() }]);
      setTyping(false);
    }, 1200);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMsg = { id: String(Date.now()), role: "user", text: input, time: now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    simulateAiResponse(input);
  };

  const handleSuggestionClick = (s: AiSuggestion) => {
    setChatMode(true);
    const userMsg: ChatMsg = { id: String(Date.now()), role: "user", text: s.label, time: now() };
    setMessages([userMsg]);
    simulateAiResponse(s.label);
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
          "fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full gradient-primary shadow-soft-lg flex items-center justify-center transition-all duration-300 hover:shadow-soft-hover group",
          open && "rotate-0 scale-95"
        )}
      >
        {open ? (
          <X size={20} className="text-primary-foreground" strokeWidth={1.5} />
        ) : (
          <div className="relative">
            <AiStar size={26} animate className="[&>div]:!opacity-100" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping bg-primary/20 pointer-events-none" style={{ animationDuration: "2.5s" }} />
          </div>
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
            /* Suggestions View */
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
                        {s.priority === "high" && (
                          <Zap size={10} className="text-warning shrink-0" strokeWidth={2} />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
                    </div>
                    <Sparkles size={12} className="text-primary/40 group-hover:text-primary/70 shrink-0 mt-1 transition-colors" strokeWidth={1.5} />
                  </div>
                </button>
              ))}

              {/* Quick chat entry */}
              <button
                onClick={() => setChatMode(true)}
                className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-xs text-primary hover:bg-primary/[0.03] transition-colors"
              >
                💬 اسألني أي سؤال...
              </button>
            </div>
          ) : (
            /* Chat View */
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
                      {msg.role === "ai" && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <AiStar size={12} animate={false} />
                          <span className="text-[10px] text-accent-foreground font-medium">المساعد الذكي</span>
                        </div>
                      )}
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-0.5 px-1 block">{msg.time}</span>
                  </div>
                ))}

                {typing && (
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
                  />
                  <Button onClick={handleSend} size="icon" className="gradient-primary text-primary-foreground rounded-xl h-8 w-8 active:scale-[0.95]">
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
