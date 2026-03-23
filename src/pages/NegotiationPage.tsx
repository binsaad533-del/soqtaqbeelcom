import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Send, ArrowRight, Zap, Shield, Bot } from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "buyer" | "seller" | "ai";
  text: string;
  time: string;
  type?: "offer" | "clarification" | "condition" | "suggestion" | "auto-negotiate";
}

const mockMessages: Message[] = [
  { id: "1", sender: "buyer", text: "السلام عليكم، مهتم بالمطعم. هل ممكن أعرف سبب البيع؟", time: "10:23", type: "clarification" },
  { id: "2", sender: "seller", text: "وعليكم السلام، السبب ظروف سفر خارج المملكة. المطعم شغال ومربح والحمد لله.", time: "10:31" },
  { id: "3", sender: "ai", text: "💡 اقتراح: اسأل عن متوسط المبيعات الشهرية وعدد العمالة الحالية وتكاليف التشغيل لفهم الصورة المالية بشكل أوضح.", time: "10:32", type: "suggestion" },
  { id: "4", sender: "buyer", text: "كم متوسط المبيعات الشهرية تقريباً؟ وكم عدد العمال حالياً؟", time: "10:40", type: "clarification" },
  { id: "5", sender: "seller", text: "المبيعات تتراوح بين 35,000 و 50,000 ريال شهرياً. العمالة 4 أشخاص. التكاليف التشغيلية حوالي 18,000 ريال.", time: "10:52" },
  { id: "6", sender: "buyer", text: "أقترح مبلغ 150,000 ريال بدل 180,000 ريال مع فترة انتقالية شهر.", time: "11:05", type: "offer" },
  { id: "7", sender: "ai", text: "💡 العرض أقل بنسبة 17% من السعر المطلوب. بناءً على الأصول المؤكّدة والإيرادات المعلنة، نقطة وسط معقولة قد تكون بين 160,000 و 170,000 ريال.", time: "11:06", type: "suggestion" },
];

const agreedPoints = [
  "السعر النهائي: يتم التفاوض",
  "فترة انتقالية: شهر واحد مع تدريب",
  "جميع المعدات مشمولة حسب الجرد المؤكّد",
  "السجل التجاري والاسم التجاري مشمولان",
  "المخزون الغذائي غير مشمول",
];

const NegotiationPage = () => {
  const { id } = useParams();
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState("");
  const [aiNegotiating, setAiNegotiating] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, {
      id: String(messages.length + 1),
      sender: "buyer",
      text: input,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    }]);
    setInput("");
  };

  const handleAiNegotiate = () => {
    setAiNegotiating(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: String(prev.length + 1),
        sender: "ai",
        text: "🤝 أتولى التفاوض نيابة عنك...\n\nبناءً على تحليل الصفقة:\n• الأصول المؤكّدة تدعم سعر بين 155,000 - 170,000 ريال\n• الإيرادات الشهرية (35,000 - 50,000) تعطي فترة استرداد 4-5 أشهر\n• مدة الإيجار المتبقية تُعد ميزة إضافية\n\n📨 أرسلت عرضاً مهيكلاً للبائع:\n\"نقدّر الفرصة ونقترح 165,000 ريال شاملة جميع المعدات المؤكّدة مع فترة انتقالية شهر وتدريب العمالة. العرض يعكس تقييم عادل للأصول والإيرادات.\"\n\n⏳ في انتظار رد البائع...",
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        type: "auto-negotiate",
      }]);
      setAiNegotiating(false);
    }, 2000);
  };

  const handleAiAnalyze = () => {
    setMessages(prev => [...prev, {
      id: String(prev.length + 1),
      sender: "ai",
      text: "📊 تحليل سريع للمفاوضة:\n\n✅ نقاط القوة:\n• البائع متعاون وشفاف في الردود\n• الأرقام المالية متسقة\n• سبب البيع منطقي (سفر)\n\n⚠️ نقاط تحتاج انتباه:\n• لم يتم تأكيد حالة عقد الإيجار\n• لا يوجد كشف حساب بنكي مرفق\n• حالة المعدات تحتاج معاينة ميدانية\n\n💡 التوصية:\nالصفقة واعدة بسعر بين 160,000 - 170,000 ريال. أنصح بطلب كشف حساب بنكي وصورة من عقد الإيجار قبل الموافقة النهائية.",
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      type: "suggestion",
    }]);
  };

  return (
    <div className="py-8">
      <div className="container max-w-4xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to={`/listing/${id}`} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowRight size={14} strokeWidth={1.3} />
            العودة للإعلان
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chat */}
          <div className="lg:col-span-2 bg-card rounded-2xl shadow-soft flex flex-col" style={{ height: "70vh" }}>
            <div className="p-4 border-b border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-sm">التفاوض — مطعم شاورما مجهّز بالكامل</h2>
                  <p className="text-xs text-muted-foreground">180,000 ر.س — حي النسيم، الرياض</p>
                </div>
                {/* AI Agent controls */}
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={handleAiAnalyze}
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-[11px] text-accent-foreground hover:bg-accent/50 rounded-lg"
                  >
                    <Zap size={12} strokeWidth={1.5} />
                    تحليل
                  </Button>
                  <Button
                    onClick={handleAiNegotiate}
                    disabled={aiNegotiating}
                    size="sm"
                    className="h-7 gap-1 text-[11px] gradient-primary text-primary-foreground rounded-lg"
                  >
                    {aiNegotiating ? (
                      <>
                        <AiStar size={12} />
                        <span>يتفاوض...</span>
                      </>
                    ) : (
                      <>
                        <Bot size={12} strokeWidth={1.5} />
                        <span>تفاوض بالنيابة</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "max-w-[80%]",
                  msg.sender === "buyer" ? "mr-auto" : msg.sender === "seller" ? "ml-auto" : "mx-auto max-w-[90%]"
                )}>
                  <div className={cn(
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.sender === "buyer" ? "bg-primary/8 border border-primary/10" :
                    msg.sender === "seller" ? "bg-muted/60" :
                    msg.type === "auto-negotiate" ? "bg-primary/5 border border-primary/20" :
                    "bg-accent/50 border border-accent-foreground/10"
                  )}>
                    {msg.sender === "ai" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <AiStar size={14} animate={msg.type === "auto-negotiate"} />
                        <span className="text-xs text-accent-foreground font-medium">
                          {msg.type === "auto-negotiate" ? "المفاوض الذكي" : "المساعد الذكي"}
                        </span>
                        {msg.type === "auto-negotiate" && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">تفاوض آلي</span>
                        )}
                      </div>
                    )}
                    <span className="whitespace-pre-line">{msg.text}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                    {msg.type === "offer" && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">عرض</span>}
                    {msg.type === "clarification" && <span className="text-[10px] text-accent-foreground bg-accent/60 px-1.5 py-0.5 rounded">استفسار</span>}
                    {msg.type === "auto-negotiate" && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">تفاوض آلي</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border/50 bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
                />
                <Button onClick={handleSend} size="icon" className="gradient-primary text-primary-foreground rounded-xl active:scale-[0.95]">
                  <Send size={16} strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* AI Negotiation Status */}
            <div className="bg-gradient-to-b from-primary/5 to-card rounded-2xl p-5 shadow-soft border border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <AiStar size={18} animate={false} />
                <h3 className="font-medium text-sm">حالة التفاوض الذكي</h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">مرحلة التفاوض</span>
                  <span className="text-primary font-medium">تبادل العروض</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">فجوة السعر</span>
                  <span className="text-warning font-medium">17%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">احتمال الإغلاق</span>
                  <span className="text-success font-medium">72%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">السعر المقترح</span>
                  <span className="font-medium">165,000 ر.س</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-soft">
              <h3 className="font-medium text-sm mb-3">النقاط المتفق عليها</h3>
              <ul className="space-y-2">
                {agreedPoints.map((p, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-success/60 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Final Approval */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} strokeWidth={1.5} className="text-success" />
                <h3 className="font-medium text-sm">الموافقة النهائية</h3>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                الذكاء الاصطناعي يمكنه التفاوض والتحليل نيابة عنك، لكن الموافقة النهائية على الصفقة تبقى بيدك فقط.
              </p>
              <Button asChild variant="outline" className="w-full rounded-xl active:scale-[0.98] text-xs">
                <Link to={`/agreement/${id}`}>
                  عرض ملخص الاتفاق للموافقة
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NegotiationPage;
