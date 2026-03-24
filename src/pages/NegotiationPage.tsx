import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Send, ArrowRight, Zap, Loader2, Shield, Scale, Sparkles, MessageSquare, Target, RefreshCw, ChevronDown, Info, FileCheck, CheckCircle2 } from "lucide-react";
import ChatAttachmentButton from "@/components/chat/ChatAttachmentButton";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble";
import AiStar from "@/components/AiStar";
import TrustBadge from "@/components/TrustBadge";

import LegalConfirmationPanel from "@/components/LegalConfirmationPanel";
import SellerReviewForm from "@/components/SellerReviewForm";
import CommissionPaymentPanel from "@/components/CommissionPaymentPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDeals, type NegotiationMessage } from "@/hooks/useDeals";
import { useListings, type Listing } from "@/hooks/useListings";
import { useFraudEngine } from "@/hooks/useFraudEngine";
import { useProfiles } from "@/hooks/useProfiles";
import { useCommissions, type Commission } from "@/hooks/useCommissions";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CommissionBanner from "@/components/CommissionBanner";
import { toast } from "sonner";

// Parse SSE stream and extract text
async function parseSSEStream(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let result = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") break;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) result += content;
      } catch {}
    }
  }
  return result;
}

const NegotiationPage = () => {
  const { id: dealId } = useParams();
  const { user, profile } = useAuthContext();
  const { getMessages, sendMessage } = useDeals();
  const { getListing } = useListings();
  const { monitorChat, calculateDealRisk } = useFraudEngine();
  const { getProfile } = useProfiles();
  const { getCommission } = useCommissions();

  const [deal, setDeal] = useState<any>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [showLegalPanel, setShowLegalPanel] = useState(false);
  const [commission, setCommission] = useState<Commission | null>(null);
  
  // AI Mediator state
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"summary" | "actions">("summary");
  const [showAiToolbar, setShowAiToolbar] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastMsgCountRef = useRef(0);

  const listingTitle = listing?.title || listing?.business_activity || "فرصة تقبيل";

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const buildContext = useCallback(() => {
    if (!deal || !listing) return "";
    const parts: string[] = [];
    parts.push(`عنوان الإعلان: ${listing.title || listing.business_activity || "فرصة تقبيل"}`);
    if (listing.price) parts.push(`السعر المطلوب: ${Number(listing.price).toLocaleString("en-US")} ريال`);
    if (deal.agreed_price) parts.push(`السعر المتفق عليه حالياً: ${Number(deal.agreed_price).toLocaleString("en-US")} ريال`);
    if (listing.city) parts.push(`المدينة: ${listing.city}`);
    if (listing.district) parts.push(`الحي: ${listing.district}`);
    if (listing.business_activity) parts.push(`النشاط: ${listing.business_activity}`);
    if (listing.deal_type) parts.push(`نوع الصفقة: ${listing.deal_type}`);
    parts.push(`حالة الصفقة: ${deal.status}`);
    parts.push(`عدد الرسائل: ${messages.length}`);
    
    const isBuyer = user?.id === deal.buyer_id;
    parts.push(`المستخدم الحالي: ${isBuyer ? "المشتري" : "البائع"}`);
    if (profile?.full_name) parts.push(`اسم المستخدم: ${profile.full_name}`);
    
    // Last few messages for context
    const recentMsgs = messages.slice(-8);
    if (recentMsgs.length > 0) {
      parts.push("\nآخر الرسائل:");
      recentMsgs.forEach(m => {
        const role = m.sender_id === deal.buyer_id ? "المشتري" : m.sender_id === deal.seller_id ? "البائع" : "النظام";
        parts.push(`${role}: ${m.message}`);
      });
    }
    
    return parts.join("\n");
  }, [deal, listing, messages, user, profile]);

  const callAI = useCallback(async (mode: string, extraMessages?: { role: string; content: string }[]) => {
    const context = buildContext();
    const aiMessages = extraMessages || [{ role: "user", content: "حلل الموقف" }];
    
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/negotiation-assist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: aiMessages, context, mode }),
    });

    if (!resp.ok) {
      if (resp.status === 429) toast.error("تم تجاوز الحد المسموح، حاول لاحقاً");
      else if (resp.status === 402) toast.error("يرجى إعادة شحن الرصيد");
      else toast.error("حدث خطأ في المساعد الذكي");
      return "";
    }

    return await parseSSEStream(resp);
  }, [buildContext]);

  // Fetch AI suggestions when messages change
  const fetchSuggestions = useCallback(async () => {
    if (!deal || messages.length < 2 || aiLoading) return;
    setAiLoading(true);
    try {
      const text = await callAI("suggestion", [{ role: "user", content: "اقترح ردود مناسبة" }]);
      if (text) {
        const suggestions = text.split("\n").filter(l => l.trim().length > 3).slice(0, 3);
        setAiSuggestions(suggestions);
      }
    } catch {}
    setAiLoading(false);
  }, [deal, messages.length, callAI, aiLoading]);

  // Analyze negotiation
  const handleAnalyze = useCallback(async () => {
    setShowAiPanel(true);
    setAiLoading(true);
    setAiAnalysis("");
    try {
      const text = await callAI("analyze");
      setAiAnalysis(text || "تعذر التحليل");
    } catch {
      setAiAnalysis("حدث خطأ");
    }
    setAiLoading(false);
  }, [callAI]);

  // Push close
  const handlePushClose = useCallback(async () => {
    if (!dealId || !user) return;
    setAiLoading(true);
    try {
      const text = await callAI("push_close");
      if (text) {
        const aiMsg = await sendMessage(dealId, text, "ai_mediation");
        if (aiMsg) setMessages(prev => prev.some(m => m.id === aiMsg.id) ? prev : [...prev, aiMsg]);
      }
    } catch {}
    setAiLoading(false);
  }, [dealId, user, callAI, sendMessage]);

  // Stall intervention
  const handleStallIntervention = useCallback(async () => {
    if (!dealId || !user) return;
    setAiLoading(true);
    try {
      const text = await callAI("stall_intervention");
      if (text) {
        const aiMsg = await sendMessage(dealId, text, "ai_mediation");
        if (aiMsg) setMessages(prev => prev.some(m => m.id === aiMsg.id) ? prev : [...prev, aiMsg]);
      }
    } catch {}
    setAiLoading(false);
  }, [dealId, user, callAI, sendMessage]);

  // AI sends a contextual message
  const handleAiIntervene = useCallback(async () => {
    if (!dealId || !user) return;
    setAiLoading(true);
    try {
      const text = await callAI("mediate", [{ role: "user", content: "ساعد في تقريب وجهات النظر بين الطرفين" }]);
      if (text) {
        const aiMsg = await sendMessage(dealId, text, "ai_mediation");
        if (aiMsg) setMessages(prev => prev.some(m => m.id === aiMsg.id) ? prev : [...prev, aiMsg]);
      }
    } catch {}
    setAiLoading(false);
  }, [dealId, user, callAI, sendMessage]);

  const loadData = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    const { data: dealData } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
    if (!dealData) { setLoading(false); return; }
    setDeal(dealData);
    const listingData = await getListing(dealData.listing_id);
    setListing(listingData);
    const msgs = await getMessages(dealId);
    setMessages(msgs);
    const otherId = user?.id === dealData.buyer_id ? dealData.seller_id : dealData.buyer_id;
    if (otherId) { const p = await getProfile(otherId); setOtherProfile(p); }
    calculateDealRisk(dealId).catch(() => {});
    if (dealData.status === "completed" || dealData.status === "finalized") {
      const comm = await getCommission(dealId);
      setCommission(comm);
    }
    setLoading(false);
  }, [dealId, getListing, getMessages, user, getProfile, calculateDealRisk, getCommission]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-switch to actions tab when deal is completed/finalized
  useEffect(() => {
    if (deal && (deal.status === "completed" || deal.status === "finalized")) {
      setSidebarTab("actions");
    }
  }, [deal?.status]);

  // Realtime messages + notifications
  useEffect(() => {
    if (!dealId) return;
    const channel = supabase
      .channel(`messages-${dealId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "negotiation_messages", filter: `deal_id=eq.${dealId}` }, (payload) => {
        const newMsg = payload.new as unknown as NegotiationMessage;
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);

        // Notify if message is from other party (not me)
        if (newMsg.sender_id !== user?.id) {
          const isAttachment = newMsg.message_type === "image" || newMsg.message_type === "document";
          const dealLabel = listing?.title || listing?.business_activity || "فرصة تقبيل";
          const title = isAttachment ? "📎 مرفق جديد في التفاوض" : "💬 رسالة جديدة في التفاوض";
          const body = isAttachment
            ? `تم إرسال ${newMsg.message_type === "image" ? "صورة" : "مستند"} في صفقة ${dealLabel}`
            : newMsg.message.length > 60 ? newMsg.message.slice(0, 60) + "…" : newMsg.message;

          // Play notification sound
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkJaXl5OLgHJlW1dZY293hI2UmZqZlI2BdGdcV1lfaXeDjZSZm5qVjoJ1aF1YW2Brd4SNlJmbmpWOgnRoXFhbYGx4hI6VmpualY6Bc2dcWFxhbXmFj5abm5qVjYByZltYXGFueYaQl5ycm5WNgHFmW1hcYm97h5GYnJyblo6AcGVaWFxjcHyIkpmcnJyWjn9vZFpYXGRxfYmTmp2dnJaPfm5jWVhdZXJ/ipScnp6dnJWOfW1iWVhdZnOAi5WdoJ+dnZWNfGxhWFlfZ3WCjZeeoaCenZaNe2tgWFlgaHaDjpifoqGfnpaNemphV1lhaXeEj5mgoqKgn5eMeWlgV1lianiFkJuho6OhoJ2Vinhof1dhbGuBfYqRl5mYlI+Gfm9nYGBmcH6Kk5qdnpuXkId+b2ZeXWRufIqTm5+gnJiSiX5wZl5cY2x7iZObnqCdmZKJfnBmXl1kbXuKlJ2goZ6alIqAcWdfXmVufIuVnqGin5yVi4FyaGBfZm9+jJafoqOfnZaLgXJoYF9ncH+Nl5+ioqCel4yBcmhfX2dxgI6Yn6Khn56XjIFyaF9fZ3GAjpeeoaCenpeMgHFnX19ncYCOl56hoJ6dl4t/cWZeXmdwf42WnaCanJqUin5wZl1cZW58i5SbnZ6bmZKIfm9lXVxkbXuJk5qcnJqXkId9bmRcW2Nse4iSmpycmpeSh31uZFxbYmx6iJGZm5uZlZGGfG1jW1pibHmHkJiampeTj4V7bGJaWmFreIaPlpmZl5KOhHpqYVlZX2l2hY2WmJeVkY2Demhg");
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}

          // Toast notification
          toast.info(title, { description: body, duration: 4000 });

          // Save to notifications table
          supabase.from("notifications").insert({
            user_id: user?.id,
            title,
            body,
            type: "message",
            reference_type: "deal",
            reference_id: dealId,
          } as any).then(() => {});

          // Browser notification (if permitted)
          if (Notification.permission === "granted") {
            try { new Notification(title, { body, icon: "/placeholder.svg" }); } catch {}
          }
        }
      })
      .subscribe();

    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    return () => { supabase.removeChannel(channel); };
  }, [dealId, user?.id, listing]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Auto-fetch suggestions when new messages arrive
  useEffect(() => {
    if (messages.length > lastMsgCountRef.current && messages.length >= 2) {
      lastMsgCountRef.current = messages.length;
      const timer = setTimeout(() => fetchSuggestions(), 1500);
      return () => clearTimeout(timer);
    }
  }, [messages.length, fetchSuggestions]);

  const handleSend = async () => {
    if (!input.trim() || !dealId || sending) return;
    setSending(true);
    const trimmed = input.trim();
    const msg = await sendMessage(dealId, trimmed);
    if (msg) setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    if (user) monitorChat(dealId, trimmed, user.id).catch(() => {});
    setInput("");
    setSending(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const isBuyer = user?.id === deal?.buyer_id;
  const otherParty = isBuyer ? "البائع" : "المشتري";

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-4">
        <AiStar size={32} />
        <Loader2 size={24} className="text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">جاري تحميل التفاوض...</p>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="py-20 text-center">
        <AiStar size={32} className="mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">الصفقة غير موجودة</p>
        <Button asChild variant="outline" className="mt-4 rounded-xl">
          <Link to="/dashboard">العودة للوحة التحكم</Link>
        </Button>
      </div>
    );
  }

  if (showLegalPanel && deal && listing) {
    return (
      <div className="py-8">
        <div className="container max-w-3xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button onClick={() => setShowLegalPanel(false)} className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowRight size={14} strokeWidth={1.3} />
              العودة للتفاوض
            </button>
          </div>
          <LegalConfirmationPanel deal={deal} listing={listing} onConfirmed={() => { setShowLegalPanel(false); loadData(); }} />
        </div>
      </div>
    );
  }

  const isPostAgreement = deal.status === "completed" || deal.status === "finalized";

  const statusLabel = deal.status === "negotiating" ? "جاري التفاوض" : deal.status === "completed" ? "مكتمل" : deal.status === "finalized" ? "مُقفل" : deal.status;
  const riskLabel = !deal.risk_score || deal.risk_score <= 25 ? "مرتفعة" : deal.risk_score <= 50 ? "متوسطة" : "منخفضة";
  const riskColor = !deal.risk_score || deal.risk_score <= 25 ? "text-success" : deal.risk_score <= 50 ? "text-warning" : "text-destructive";
  const readinessPercent = Math.max(0, 100 - (deal.risk_score || 0));

  return (
    <div className="py-6">
      <div className="container max-w-6xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link to={`/listing/${deal.listing_id}`} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowRight size={12} strokeWidth={1.3} />
            العودة للإعلان
          </Link>
          <span className="text-border">|</span>
          <span>{listingTitle}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* ═══════════ CHAT AREA ═══════════ */}
          <div className="lg:col-span-2 bg-card rounded-2xl shadow-soft flex flex-col" style={{ height: "78vh" }}>
            {/* Chat Header — compact */}
            <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare size={14} className="text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-medium text-sm leading-tight">{listingTitle}</h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {listing?.price ? `${Number(listing.price).toLocaleString("en-US")} ر.س` : ""} — {statusLabel}
                  </p>
                </div>
              </div>
              {deal.risk_score !== null && deal.risk_score !== undefined && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50">
                  <div className={`w-1.5 h-1.5 rounded-full ${riskColor.replace("text-", "bg-")}`} />
                  <span className={`text-[10px] font-medium ${riskColor}`}>جاهزية {riskLabel}</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-16 text-sm text-muted-foreground">
                  <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
                    <AiStar size={20} />
                  </div>
                  <p className="font-medium">ابدأ المحادثة مع {otherParty}</p>
                  <p className="text-[11px] mt-1.5 text-muted-foreground/60 max-w-xs mx-auto">
                    المساعد الذكي متاح لمساعدتك في أي وقت — اضغط ✨ أسفل الدردشة
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <ChatMessageBubble key={msg.id} msg={msg} isMe={msg.sender_id === user?.id} buyerId={deal.buyer_id} sellerId={deal.seller_id} />
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* AI Analysis inline (appears above input when triggered) */}
            {showAiPanel && aiAnalysis && (
              <div className="mx-4 mb-2 p-3 rounded-xl bg-accent/20 border border-accent/30">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={12} className="text-primary" />
                    <span className="text-[10px] font-medium text-primary">تحليل المساعد الذكي</span>
                  </div>
                  <button onClick={() => setShowAiPanel(false)} className="text-[10px] text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line max-h-32 overflow-y-auto">{aiAnalysis}</p>
              </div>
            )}

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="px-4 pb-1.5 flex gap-1.5 flex-wrap">
                <span className="text-[9px] text-muted-foreground/60 self-center ml-1">💡</span>
                {aiSuggestions.map((s, i) => (
                  <button key={i} onClick={() => handleSuggestionClick(s)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-accent/30 text-accent-foreground hover:bg-accent/50 transition-all truncate max-w-[180px]">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* AI Toolbar (expandable) */}
            {showAiToolbar && (
              <div className="px-4 pb-2 flex gap-1.5 animate-in slide-in-from-bottom-2 duration-200">
                <button onClick={() => { handleAnalyze(); setShowAiToolbar(false); }} disabled={aiLoading}
                  className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
                  <Zap size={10} /> تحليل الموقف
                </button>
                <button onClick={() => { handleAiIntervene(); setShowAiToolbar(false); }} disabled={aiLoading}
                  className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
                  <MessageSquare size={10} /> وساطة
                </button>
                <button onClick={() => { handlePushClose(); setShowAiToolbar(false); }} disabled={aiLoading}
                  className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all disabled:opacity-50">
                  <Target size={10} /> دفع للإغلاق
                </button>
                <button onClick={() => { handleStallIntervention(); setShowAiToolbar(false); }} disabled={aiLoading}
                  className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
                  <RefreshCw size={10} /> تحريك
                </button>
              </div>
            )}

            {/* Input area with integrated AI button */}
            <div className="p-3 border-t border-border/20">
              {aiLoading && (
                <div className="flex items-center gap-1.5 mb-2 px-1 text-[10px] text-primary">
                  <Loader2 size={10} className="animate-spin" /> المساعد الذكي يعمل...
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAiToolbar(!showAiToolbar)}
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0",
                    showAiToolbar ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title="أدوات المساعد الذكي"
                >
                  <Sparkles size={15} strokeWidth={1.5} />
                </button>
                <ChatAttachmentButton
                  dealId={dealId!}
                  onFileSent={async (message, type, metadata) => {
                    if (!dealId || !user) return;
                    const { data } = await supabase
                      .from("negotiation_messages")
                      .insert({ deal_id: dealId, sender_id: user.id, message, message_type: type, metadata: metadata as any })
                      .select().single();
                    if (data) {
                      const newMsg = data as unknown as NegotiationMessage;
                      setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
                    }
                  }}
                  disabled={sending}
                />
                <input
                  type="text" value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 px-4 py-2 rounded-xl border border-border/40 bg-background text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
                />
                <Button onClick={handleSend} disabled={sending} size="icon" className="gradient-primary text-primary-foreground rounded-xl active:scale-[0.95] h-9 w-9">
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} strokeWidth={1.5} />}
                </Button>
              </div>
            </div>
          </div>

          {/* ═══════════ SIDEBAR ═══════════ */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex bg-muted/40 rounded-xl p-0.5">
              <button
                onClick={() => setSidebarTab("summary")}
                className={cn(
                  "flex-1 text-[11px] py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5",
                  sidebarTab === "summary" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Info size={12} strokeWidth={1.5} /> ملخص الصفقة
              </button>
              <button
                onClick={() => setSidebarTab("actions")}
                className={cn(
                  "flex-1 text-[11px] py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5",
                  sidebarTab === "actions" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileCheck size={12} strokeWidth={1.5} /> الإجراءات
                {isPostAgreement && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
              </button>
            </div>

            {/* ═══ TAB: Summary ═══ */}
            {sidebarTab === "summary" && (
              <div className="space-y-4 animate-in fade-in-0 duration-200">
                {/* Deal Readiness Card (merged: status + risk) */}
                <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-xs flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-primary" strokeWidth={1.5} />
                      جاهزية الصفقة
                    </h3>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md", 
                      readinessPercent >= 70 ? "bg-success/10 text-success" : 
                      readinessPercent >= 40 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                    )}>
                      {readinessPercent}%
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-muted/60 mb-3">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500",
                        readinessPercent >= 70 ? "bg-success" : readinessPercent >= 40 ? "bg-warning" : "bg-destructive"
                      )}
                      style={{ width: `${readinessPercent}%` }}
                    />
                  </div>

                  {/* Status rows */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">الحالة</span>
                      <span className="text-primary font-medium">{statusLabel}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">الرسائل</span>
                      <span className="font-medium">{messages.length}</span>
                    </div>
                    {deal.agreed_price && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">السعر المتفق</span>
                        <span className="font-medium">{Number(deal.agreed_price).toLocaleString("en-US")} ر.س</span>
                      </div>
                    )}
                  </div>

                  {/* Interactive readiness steps */}
                  {(deal.risk_factors as string[] || []).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/20">
                      <p className="text-[10px] text-muted-foreground mb-2">خطوات لتحسين الجاهزية:</p>
                      <div className="space-y-1.5">
                        {(deal.risk_factors as string[]).map((factor, i) => {
                          const stepMap: Record<string, { label: string; action: string; path: string }> = {
                            "مشتري غير موثق": { label: "وثّق حسابك", action: "verify", path: "/dashboard" },
                            "بائع غير موثق": { label: "وثّق حسابك", action: "verify", path: "/dashboard" },
                            "نوع الصفقة غير محدد": { label: "حدد النوع", action: "deal_type", path: `/listing/${deal.listing_id}` },
                            "لا يوجد سعر متفق عليه": { label: "تفاوض على السعر", action: "chat", path: "" },
                            "صفقة جديدة بدون رسائل": { label: "ابدأ المحادثة", action: "chat", path: "" },
                          };
                          const step = stepMap[factor];
                          const isActionable = !!step;

                          return (
                            <div key={i} className="flex items-center gap-2 text-[10px] group">
                              <div className="w-4 h-4 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                              </div>
                              <span className="flex-1 text-muted-foreground">{factor}</span>
                              {isActionable && (
                                step.action === "chat" ? (
                                  <button
                                    onClick={() => {
                                      const chatInput = document.querySelector<HTMLInputElement>('input[placeholder="اكتب رسالتك..."]');
                                      chatInput?.focus();
                                    }}
                                    className="text-[9px] px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors opacity-70 group-hover:opacity-100"
                                  >
                                    {step.label}
                                  </button>
                                ) : (
                                  <Link
                                    to={step.path}
                                    className="text-[9px] px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors opacity-70 group-hover:opacity-100"
                                  >
                                    {step.label}
                                  </Link>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Other party trust — compact */}
                {otherProfile && (
                  <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield size={13} strokeWidth={1.5} className="text-primary" />
                      <h3 className="font-medium text-xs">ملف {otherParty}</h3>
                    </div>
                    <TrustBadge score={otherProfile.trust_score} verificationLevel={otherProfile.verification_level} size="md" showScore />
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>✅ مكتملة: {otherProfile.completed_deals || 0}</span>
                      <span>❌ ملغاة: {otherProfile.cancelled_deals || 0}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAB: Actions ═══ */}
            {sidebarTab === "actions" && (
              <div className="space-y-4 animate-in fade-in-0 duration-200">
                {/* Legal Confirmation */}
                {!isPostAgreement && (
                  <div className="bg-card rounded-2xl p-4 shadow-soft border border-primary/15">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale size={13} strokeWidth={1.5} className="text-primary" />
                      <h3 className="font-medium text-xs">التأكيد القانوني</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                      عند الاتفاق على السعر والشروط، يمكنكم البدء في التأكيد الرسمي.
                    </p>
                    <Button onClick={() => setShowLegalPanel(true)} variant="outline" className="w-full rounded-xl active:scale-[0.98] text-xs">
                      بدء التأكيد القانوني
                    </Button>
                  </div>
                )}

                {/* Finalized state */}
                {deal.status === "finalized" && (
                  <div className="bg-gradient-to-b from-primary/5 to-card rounded-2xl p-4 shadow-soft border border-primary/15">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={13} strokeWidth={1.5} className="text-primary" />
                      <h3 className="font-medium text-xs">الصفقة مُقفلة ✓</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                      تمت الموافقة من الطرفين. يمكنك الانتقال للاتفاقية.
                    </p>
                    <Button asChild className="w-full rounded-xl text-xs gradient-primary text-primary-foreground">
                      <Link to={`/agreement/${dealId}`}>عرض الاتفاقية</Link>
                    </Button>
                  </div>
                )}

                {/* Commission — only after agreement */}
                {isPostAgreement && listing?.price && (
                  <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/20">
                    <CommissionBanner dealAmount={deal.agreed_price || listing.price} showDetails />
                  </div>
                )}

                {/* Commission Payment */}
                {commission && isPostAgreement && (
                  <CommissionPaymentPanel commission={commission} isSeller={user?.id === deal.seller_id} onUpdate={loadData} />
                )}

                {/* Buyer Review */}
                {isBuyer && isPostAgreement && deal.seller_id && (
                  <SellerReviewForm dealId={deal.id} sellerId={deal.seller_id} />
                )}

                {/* Empty state for actions tab during negotiation */}
                {!isPostAgreement && (
                  <div className="text-center py-6">
                    <p className="text-[11px] text-muted-foreground/60">
                      أكمل التفاوض أولاً، ثم ستظهر هنا إجراءات العمولة والاتفاقية
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NegotiationPage;
