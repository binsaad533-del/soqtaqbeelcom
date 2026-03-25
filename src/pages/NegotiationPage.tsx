import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Send, ArrowRight, Zap, Loader2, Shield, Scale, Sparkles, MessageSquare, Target, RefreshCw, TrendingUp, Info, FileCheck, CheckCircle2 } from "lucide-react";
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
import VerificationGate from "@/components/VerificationGate";

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

    // ── Market analysis data ──
    if (listing.ai_summary) parts.push(`\nتحليل الذكاء الاصطناعي للإعلان:\n${listing.ai_summary}`);
    if (listing.ai_rating) parts.push(`تقييم الذكاء الاصطناعي: ${listing.ai_rating}`);
    if (listing.ai_structure_validation) {
      try {
        const validation = typeof listing.ai_structure_validation === 'string' 
          ? JSON.parse(listing.ai_structure_validation) 
          : listing.ai_structure_validation;
        if (validation?.market_comparison) {
          parts.push(`\nبيانات مقارنة السوق:`);
          const mc = validation.market_comparison;
          if (mc.estimated_range) parts.push(`النطاق السعري المقدّر: ${mc.estimated_range}`);
          if (mc.position) parts.push(`موقع السعر من السوق: ${mc.position}`);
          if (mc.sources) parts.push(`مصادر المقارنة: ${JSON.stringify(mc.sources)}`);
          if (mc.summary) parts.push(`ملخص المقارنة: ${mc.summary}`);
        }
        if (validation?.risks && Array.isArray(validation.risks)) {
          parts.push(`المخاطر المكتشفة: ${validation.risks.join("، ")}`);
        }
        if (validation?.strengths && Array.isArray(validation.strengths)) {
          parts.push(`نقاط القوة: ${validation.strengths.join("، ")}`);
        }
      } catch {}
    }
    
    // Inventory summary
    if (listing.inventory && Array.isArray(listing.inventory) && listing.inventory.length > 0) {
      const totalValue = listing.inventory.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
      parts.push(`\nالمخزون: ${listing.inventory.length} عنصر، القيمة التقديرية: ${totalValue.toLocaleString("en-US")} ريال`);
    }

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

  // Market analysis
  const handleMarketAnalysis = useCallback(async () => {
    setShowAiPanel(true);
    setAiLoading(true);
    setAiAnalysis("");
    try {
      const text = await callAI("market_analysis");
      setAiAnalysis(text || "تعذر تحليل السوق");
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
    <VerificationGate message="يجب توثيق رقم جوالك قبل بدء التفاوض">
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

        <div className="grid lg:grid-cols-5 gap-5">
          {/* ═══════════ DEAL SUMMARY (3 cols) ═══════════ */}
          <div className="lg:col-span-3 order-2 lg:order-2">
            <div className="space-y-4">
              {/* Deal Summary Card - Simple */}
              <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/20">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileCheck size={14} className="text-primary" strokeWidth={1.5} />
                  ملخص الصفقة
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">الإعلان</span>
                    <Link to={`/listing/${deal.listing_id}`} className="font-medium text-primary hover:underline truncate max-w-[60%] text-left">
                      {listingTitle}
                    </Link>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">الحالة</span>
                    <span className={cn("font-medium px-2 py-0.5 rounded-full text-[10px]",
                      deal.status === "negotiating" ? "bg-primary/10 text-primary" :
                      deal.status === "finalized" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    )}>{statusLabel}</span>
                  </div>

                  {deal.agreed_price ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">السعر المتفق عليه</span>
                      <span className="font-bold text-success">{Number(deal.agreed_price).toLocaleString("en-US")} ر.س</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">السعر المطلوب</span>
                      <span className="font-bold">{listing?.price ? `${Number(listing.price).toLocaleString("en-US")} ر.س` : "—"}</span>
                    </div>
                  )}

                  {listing?.city && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">الموقع</span>
                      <span className="font-medium">{listing.city}{listing.district ? ` — ${listing.district}` : ""}</span>
                    </div>
                  )}

                  {listing?.deal_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">نوع الصفقة</span>
                      <span className="font-medium">
                        {listing.deal_type === "full" ? "تقبيل كامل" :
                         listing.deal_type === "assets_only" ? "بيع أصول فقط" :
                         listing.deal_type === "lease_transfer" ? "تنازل عن عقد إيجار" :
                         listing.deal_type === "brand_transfer" ? "تنازل عن علامة تجارية" :
                         listing.deal_type}
                      </span>
                    </div>
                  )}

                  {listing?.business_activity && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">النشاط</span>
                      <span className="font-medium">{listing.business_activity}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">الرسائل</span>
                    <span className="font-medium">{messages.length}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">تاريخ البدء</span>
                    <span className="font-medium">{new Date(deal.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}</span>
                  </div>
                </div>

                {/* Readiness bar */}
                <div className="mt-3 pt-3 border-t border-border/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-muted-foreground">جاهزية الصفقة</span>
                    <span className={cn("text-[10px] font-semibold",
                      readinessPercent >= 70 ? "text-success" : readinessPercent >= 40 ? "text-warning" : "text-destructive"
                    )}>{readinessPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted/60">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500",
                        readinessPercent >= 70 ? "bg-success" : readinessPercent >= 40 ? "bg-warning" : "bg-destructive"
                      )}
                      style={{ width: `${readinessPercent}%` }}
                    />
                  </div>

                  {/* Incomplete steps only */}
                  {(() => {
                    const allSteps = [
                      { key: "buyer_verified", label: "توثيق المشتري", factor: "مشتري غير موثق", action: "verify" as const, path: "/dashboard", done: profile?.is_verified === true || (profile?.verification_level !== "none") },
                      { key: "seller_verified", label: "توثيق البائع", factor: "بائع غير موثق", action: "verify" as const, path: "/dashboard", done: otherProfile?.is_verified === true || (otherProfile?.verification_level && otherProfile.verification_level !== "none") },
                      { key: "deal_type", label: "تحديد نوع الصفقة", factor: "نوع الصفقة غير محدد", action: "deal_type" as const, path: `/listing/${deal.listing_id}`, done: !!deal.deal_type },
                      { key: "has_messages", label: "بدء المحادثة", factor: "صفقة جديدة بدون رسائل", action: "chat" as const, path: "", done: messages.length > 0 },
                      { key: "agreed_price", label: "الاتفاق على السعر", factor: "لا يوجد سعر متفق عليه", action: "chat" as const, path: "", done: !!deal.agreed_price },
                    ];
                    const riskFactors = (deal.risk_factors as string[]) || [];
                    const incomplete = allSteps.filter(s => riskFactors.includes(s.factor) && !s.done);
                    if (incomplete.length === 0) return null;

                    return (
                      <div className="mt-2 space-y-1">
                        {incomplete.map((step) => (
                          <div key={step.key} className="flex items-center gap-2 text-[10px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                            <span className="flex-1 text-muted-foreground">{step.factor}</span>
                            {step.action === "chat" ? (
                              <button
                                onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="اكتب رسالتك..."]')?.focus()}
                                className="text-[9px] px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                {step.label}
                              </button>
                            ) : (
                              <Link to={step.path} className="text-[9px] px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                {step.label}
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* CTA: Legal confirmation */}
              {!isPostAgreement && deal.status === "negotiating" && (
                <button
                  onClick={() => setShowLegalPanel(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-l from-primary/10 to-primary/5 border border-primary/20 text-primary text-xs font-medium hover:from-primary/15 hover:to-primary/10 transition-all active:scale-[0.98]"
                >
                  <Scale size={13} strokeWidth={1.5} />
                  متفقون؟ انتقل للتأكيد القانوني وإتمام الصفقة
                  <ArrowRight size={13} strokeWidth={1.5} className="rotate-180" />
                </button>
              )}

              {/* Other party trust */}
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

              {/* Commission */}
              {isPostAgreement && listing?.price && (
                <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/20">
                  <CommissionBanner dealAmount={deal.agreed_price || listing.price} showDetails />
                </div>
              )}

              {commission && isPostAgreement && (
                <CommissionPaymentPanel commission={commission} isSeller={user?.id === deal.seller_id} onUpdate={loadData} />
              )}

              {isBuyer && isPostAgreement && deal.seller_id && (
                <SellerReviewForm dealId={deal.id} sellerId={deal.seller_id} />
              )}
            </div>
          </div>

          {/* ═══════════ CHAT (2 cols, compact) ═══════════ */}
          <div className="lg:col-span-2 order-1 lg:order-1 bg-card rounded-2xl shadow-soft flex flex-col" style={{ height: "65vh" }}>
            {/* Chat Header */}
            <div className="px-4 py-2.5 border-b border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare size={12} className="text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-medium text-xs leading-tight">{listingTitle}</h2>
                  <p className="text-[9px] text-muted-foreground">
                    {listing?.price ? `${Number(listing.price).toLocaleString("en-US")} ر.س` : ""} — {statusLabel}
                  </p>
                </div>
              </div>
              {deal.risk_score !== null && deal.risk_score !== undefined && (
                <div className={`w-1.5 h-1.5 rounded-full ${riskColor.replace("text-", "bg-")}`} />
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {messages.length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-3">
                    <AiStar size={16} />
                  </div>
                  <p className="font-medium text-xs">ابدأ المحادثة مع {otherParty}</p>
                  <p className="text-[10px] mt-1 text-muted-foreground/60 max-w-[200px] mx-auto">
                    اضغط ✨ لاستخدام المساعد الذكي
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <ChatMessageBubble key={msg.id} msg={msg} isMe={msg.sender_id === user?.id} buyerId={deal.buyer_id} sellerId={deal.seller_id} />
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* AI Analysis inline */}
            {showAiPanel && aiAnalysis && (
              <div className="mx-3 mb-1.5 p-2.5 rounded-xl bg-accent/20 border border-accent/30">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={10} className="text-primary" />
                    <span className="text-[9px] font-medium text-primary">تحليل المساعد</span>
                  </div>
                  <button onClick={() => setShowAiPanel(false)} className="text-[9px] text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line max-h-24 overflow-y-auto">{aiAnalysis}</p>
              </div>
            )}

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="px-3 pb-1 flex gap-1 flex-wrap">
                <span className="text-[8px] text-muted-foreground/60 self-center">💡</span>
                {aiSuggestions.map((s, i) => (
                  <button key={i} onClick={() => handleSuggestionClick(s)}
                    className="text-[9px] px-2 py-0.5 rounded-lg bg-accent/30 text-accent-foreground hover:bg-accent/50 transition-all truncate max-w-[140px]">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* AI Toolbar */}
            {showAiToolbar && (
              <div className="px-3 pb-1.5 flex gap-1 flex-wrap animate-in slide-in-from-bottom-2 duration-200">
                <button onClick={() => { handleAnalyze(); setShowAiToolbar(false); }} disabled={aiLoading}
                  className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
                  <Zap size={9} /> تحليل
                </button>
                <button onClick={() => { handleAiIntervene(); setShowAiToolbar(false); }} disabled={aiLoading}
                  className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
                  <MessageSquare size={9} /> وساطة
                </button>
                <button onClick={() => { handlePushClose(); setShowAiToolbar(false); }} disabled={aiLoading}
                  className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all disabled:opacity-50">
                  <Target size={9} /> إغلاق
                </button>
                <button onClick={() => { handleStallIntervention(); setShowAiToolbar(false); }} disabled={aiLoading}
                  className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
                  <RefreshCw size={9} /> تحريك
                </button>
                <button onClick={() => { handleMarketAnalysis(); setShowAiToolbar(false); }} disabled={aiLoading}
                  className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
                  <TrendingUp size={9} /> السوق
                </button>
              </div>
            )}

            {/* Input area */}
            <div className="p-2.5 border-t border-border/20">
              {aiLoading && (
                <div className="flex items-center gap-1.5 mb-1.5 px-1 text-[9px] text-primary">
                  <Loader2 size={9} className="animate-spin" /> المساعد يعمل...
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowAiToolbar(!showAiToolbar)}
                  className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center transition-all shrink-0",
                    showAiToolbar ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title="أدوات المساعد الذكي"
                >
                  <Sparkles size={13} strokeWidth={1.5} />
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
                  className="flex-1 px-3 py-1.5 rounded-xl border border-border/40 bg-background text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
                />
                <Button onClick={handleSend} disabled={sending} size="icon" className="gradient-primary text-primary-foreground rounded-xl active:scale-[0.95] h-8 w-8">
                  {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} strokeWidth={1.5} />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </VerificationGate>
  );
};

export default NegotiationPage;
