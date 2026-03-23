import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Send, ArrowRight, Zap, Loader2, Shield, Scale, Sparkles, MessageSquare, Target, RefreshCw } from "lucide-react";
import AiStar from "@/components/AiStar";
import TrustBadge from "@/components/TrustBadge";
import DealRiskIndicator from "@/components/DealRiskIndicator";
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
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastMsgCountRef = useRef(0);

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

  // Realtime messages
  useEffect(() => {
    if (!dealId) return;
    const channel = supabase
      .channel(`messages-${dealId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "negotiation_messages", filter: `deal_id=eq.${dealId}` }, (payload) => {
        const newMsg = payload.new as unknown as NegotiationMessage;
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dealId]);

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
  const listingTitle = listing?.title || listing?.business_activity || "فرصة تقبيل";

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

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to={`/listing/${deal.listing_id}`} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowRight size={14} strokeWidth={1.3} />
            العودة للإعلان
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chat */}
          <div className="lg:col-span-2 bg-card rounded-2xl shadow-soft flex flex-col" style={{ height: "75vh" }}>
            <div className="p-4 border-b border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-sm">التفاوض — {listingTitle}</h2>
                  <p className="text-xs text-muted-foreground">
                    {listing?.price ? `${Number(listing.price).toLocaleString("en-US")} ر.س` : ""} — {listing?.district && `${listing.district}, `}{listing?.city || ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button onClick={handleAnalyze} variant="ghost" size="sm" className="h-7 gap-1 text-[11px] rounded-lg" disabled={aiLoading}>
                    <Zap size={12} strokeWidth={1.5} />
                    تحليل
                  </Button>
                  <Button onClick={handleAiIntervene} variant="ghost" size="sm" className="h-7 gap-1 text-[11px] rounded-lg" disabled={aiLoading}>
                    <Sparkles size={12} strokeWidth={1.5} />
                    وساطة
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  <AiStar size={24} className="mx-auto mb-3" />
                  <p>ابدأ المحادثة مع {otherParty}</p>
                  <p className="text-[11px] mt-1 text-muted-foreground/70">المساعد الذكي سيساعدكم في التفاوض</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                const isAi = msg.sender_type === "ai" || msg.message_type === "ai_request" || msg.message_type === "ai_mediation";
                return (
                  <div key={msg.id} className={cn(
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
                          <span className="text-xs text-accent-foreground font-medium">مقبل — وسيط الصفقة</span>
                        </div>
                      )}
                      <span className="whitespace-pre-line">{msg.message}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                      </span>
                      {isMe && <span className="text-[10px] text-primary/60">أنت</span>}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
                <span className="text-[9px] text-muted-foreground/70 self-center ml-1">💡</span>
                {aiSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-accent/40 text-accent-foreground hover:bg-accent/60 transition-all truncate max-w-[200px]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

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
                <Button onClick={handleSend} disabled={sending} size="icon" className="gradient-primary text-primary-foreground rounded-xl active:scale-[0.95]">
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={1.5} />}
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* AI Analysis Panel */}
            {showAiPanel && (
              <div className="bg-gradient-to-b from-accent/30 to-card rounded-2xl p-4 shadow-soft border border-accent-foreground/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-primary" />
                    <h3 className="font-medium text-xs">تحليل المفاوضة</h3>
                  </div>
                  <button onClick={() => setShowAiPanel(false)} className="text-[10px] text-muted-foreground hover:text-foreground">✕</button>
                </div>
                {aiLoading && !aiAnalysis ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                    <Loader2 size={13} className="animate-spin" /> جاري التحليل...
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
                )}
              </div>
            )}

            {/* AI Quick Actions */}
            <div className="bg-card rounded-2xl p-4 shadow-soft border border-primary/10">
              <div className="flex items-center gap-1.5 mb-3">
                <AiStar size={16} animate={false} />
                <h3 className="font-medium text-xs">أدوات المساعد الذكي</h3>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={handleAnalyze} disabled={aiLoading}
                  className="flex items-center gap-1.5 text-[10px] px-2.5 py-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
                  <Zap size={11} /> تحليل الموقف
                </button>
                <button onClick={handleAiIntervene} disabled={aiLoading}
                  className="flex items-center gap-1.5 text-[10px] px-2.5 py-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
                  <MessageSquare size={11} /> وساطة ذكية
                </button>
                <button onClick={handlePushClose} disabled={aiLoading}
                  className="flex items-center gap-1.5 text-[10px] px-2.5 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all disabled:opacity-50">
                  <Target size={11} /> دفع للإغلاق
                </button>
                <button onClick={handleStallIntervention} disabled={aiLoading}
                  className="flex items-center gap-1.5 text-[10px] px-2.5 py-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
                  <RefreshCw size={11} /> تحريك التفاوض
                </button>
              </div>
              {aiLoading && <div className="flex items-center gap-1.5 mt-2 text-[10px] text-primary"><Loader2 size={11} className="animate-spin" /> المساعد يعمل...</div>}
            </div>

            {/* Other party trust */}
            {otherProfile && (
              <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/30">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} strokeWidth={1.5} className="text-primary" />
                  <h3 className="font-medium text-xs">مستوى ثقة {otherParty}</h3>
                </div>
                <TrustBadge score={otherProfile.trust_score} verificationLevel={otherProfile.verification_level} size="md" showScore />
                <div className="mt-2 text-[10px] text-muted-foreground">
                  صفقات مكتملة: {otherProfile.completed_deals || 0} • ملغاة: {otherProfile.cancelled_deals || 0}
                </div>
              </div>
            )}

            {/* Deal risk */}
            {deal.risk_score !== null && deal.risk_score !== undefined && (
              <DealRiskIndicator riskScore={deal.risk_score} riskFactors={deal.risk_factors || []} />
            )}

            {/* Deal Status */}
            <div className="bg-gradient-to-b from-primary/5 to-card rounded-2xl p-4 shadow-soft border border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <AiStar size={16} animate={false} />
                <h3 className="font-medium text-xs">حالة التفاوض</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">الحالة</span>
                  <span className="text-primary font-medium">{deal.status === "negotiating" ? "جاري التفاوض" : deal.status === "completed" ? "مكتمل" : deal.status === "finalized" ? "مُقفل" : deal.status}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">عدد الرسائل</span>
                  <span className="font-medium">{messages.length}</span>
                </div>
                {deal.agreed_price && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">السعر المتفق</span>
                    <span className="font-medium">{Number(deal.agreed_price).toLocaleString("en-US")} ر.س</span>
                  </div>
                )}
              </div>
            </div>

            {/* Commission */}
            {listing?.price && <CommissionBanner dealAmount={deal.agreed_price || listing.price} showDetails />}

            {/* Legal Confirmation */}
            {deal.status !== "completed" && deal.status !== "finalized" && (
              <div className="bg-card rounded-2xl p-4 shadow-soft border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Scale size={14} strokeWidth={1.5} className="text-primary" />
                  <h3 className="font-medium text-xs">التأكيد القانوني</h3>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                  قبل إنهاء الصفقة، يجب على الطرفين مراجعة الملخص والموافقة رسمياً.
                </p>
                <Button onClick={() => setShowLegalPanel(true)} variant="outline" className="w-full rounded-xl active:scale-[0.98] text-xs">
                  بدء التأكيد القانوني
                </Button>
              </div>
            )}
            {deal.status === "finalized" && (
              <div className="bg-card rounded-2xl p-4 shadow-soft border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={14} strokeWidth={1.5} className="text-primary" />
                  <h3 className="font-medium text-xs">الصفقة مُقفلة</h3>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                  تمت الموافقة من الطرفين. يمكنك الانتقال للاتفاقية.
                </p>
                <Button asChild className="w-full rounded-xl text-xs gradient-primary text-primary-foreground">
                  <Link to={`/agreement/${dealId}`}>عرض الاتفاقية</Link>
                </Button>
              </div>
            )}

            {/* Commission Payment */}
            {commission && (deal.status === "completed" || deal.status === "finalized") && (
              <CommissionPaymentPanel commission={commission} isSeller={user?.id === deal.seller_id} onUpdate={loadData} />
            )}

            {/* Buyer Review */}
            {isBuyer && (deal.status === "completed" || deal.status === "finalized") && deal.seller_id && (
              <SellerReviewForm dealId={deal.id} sellerId={deal.seller_id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NegotiationPage;
