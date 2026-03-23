import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Send, ArrowRight, Zap, Loader2, Shield, Scale } from "lucide-react";
import AiStar from "@/components/AiStar";
import TrustBadge from "@/components/TrustBadge";
import DealRiskIndicator from "@/components/DealRiskIndicator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDeals, type NegotiationMessage } from "@/hooks/useDeals";
import { useListings, type Listing } from "@/hooks/useListings";
import { useFraudEngine } from "@/hooks/useFraudEngine";
import { useProfiles } from "@/hooks/useProfiles";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";


const NegotiationPage = () => {
  const { id: dealId } = useParams();
  
  const { user } = useAuthContext();
  const { getMessages, sendMessage } = useDeals();
  const { getListing } = useListings();
  const { monitorChat, calculateDealRisk } = useFraudEngine();
  const { getProfile } = useProfiles();

  const [deal, setDeal] = useState<any>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [showLegalPanel, setShowLegalPanel] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const loadData = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);

    // Load deal
    const { data: dealData } = await supabase
      .from("deals")
      .select("*")
      .eq("id", dealId)
      .maybeSingle();

    if (!dealData) {
      setLoading(false);
      return;
    }
    setDeal(dealData);

    // Load listing
    const listingData = await getListing(dealData.listing_id);
    setListing(listingData);

    // Load messages
    const msgs = await getMessages(dealId);
    setMessages(msgs);

    // Load other party's profile for trust badge
    const otherId = user?.id === dealData.buyer_id ? dealData.seller_id : dealData.buyer_id;
    if (otherId) {
      const p = await getProfile(otherId);
      setOtherProfile(p);
    }

    // Calculate deal risk
    calculateDealRisk(dealId).catch(() => {});

    setLoading(false);
  }, [dealId, getListing, getMessages, user, getProfile, calculateDealRisk]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime messages
  useEffect(() => {
    if (!dealId) return;
    const channel = supabase
      .channel(`messages-${dealId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "negotiation_messages",
        filter: `deal_id=eq.${dealId}`,
      }, (payload) => {
        const newMsg = payload.new as unknown as NegotiationMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dealId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !dealId || sending) return;
    setSending(true);
    const trimmed = input.trim();
    const msg = await sendMessage(dealId, trimmed);
    if (msg) {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    }
    // Monitor for fraud keywords in background
    if (user) monitorChat(dealId, trimmed, user.id).catch(() => {});
    setInput("");
    setSending(false);
  };

  const handleAiAnalyze = async () => {
    if (!dealId || !user) return;
    const aiMsg = await sendMessage(dealId, "📊 طلب تحليل ذكي للمفاوضة...", "ai_request");
    if (aiMsg) setMessages(prev => [...prev, aiMsg]);
  };

  const isBuyer = user?.id === deal?.buyer_id;
  const otherParty = isBuyer ? "البائع" : "المشتري";
  const listingTitle = listing?.title || listing?.business_activity || "فرصة تقبّل";

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

  return (
    <div className="py-8">
      <div className="container max-w-4xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to={`/listing/${deal.listing_id}`} className="hover:text-foreground transition-colors flex items-center gap-1">
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
                  <h2 className="font-medium text-sm">التفاوض — {listingTitle}</h2>
                  <p className="text-xs text-muted-foreground">
                    {listing?.price ? `${Number(listing.price).toLocaleString("en-US")} ر.س` : ""} — {listing?.district && `${listing.district}, `}{listing?.city || ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button onClick={handleAiAnalyze} variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-accent-foreground hover:bg-accent/50 rounded-lg">
                    <Zap size={12} strokeWidth={1.5} />
                    تحليل
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  <AiStar size={24} className="mx-auto mb-3" />
                  <p>ابدأ المحادثة مع {otherParty}</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                const isAi = msg.sender_type === "ai" || msg.message_type === "ai_request";
                return (
                  <div key={msg.id} className={cn(
                    "max-w-[80%]",
                    isMe ? "mr-auto" : isAi ? "mx-auto max-w-[90%]" : "ml-auto"
                  )}>
                    <div className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      isMe ? "bg-primary/8 border border-primary/10" :
                      isAi ? "bg-accent/50 border border-accent-foreground/10" :
                      "bg-muted/60"
                    )}>
                      {isAi && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <AiStar size={14} />
                          <span className="text-xs text-accent-foreground font-medium">المساعد الذكي</span>
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
          <div className="space-y-5">
            {/* Other party trust */}
            {otherProfile && (
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} strokeWidth={1.5} className="text-primary" />
                  <h3 className="font-medium text-sm">مستوى ثقة {otherParty}</h3>
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

            <div className="bg-gradient-to-b from-primary/5 to-card rounded-2xl p-5 shadow-soft border border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <AiStar size={18} animate={false} />
                <h3 className="font-medium text-sm">حالة التفاوض</h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">الحالة</span>
                  <span className="text-primary font-medium">{deal.status === "negotiating" ? "جاري التفاوض" : deal.status === "completed" ? "مكتمل" : deal.status}</span>
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

            {/* Legal Confirmation / Final Approval */}
            {deal.status !== "completed" && deal.status !== "finalized" && (
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Scale size={14} strokeWidth={1.5} className="text-primary" />
                  <h3 className="font-medium text-sm">التأكيد القانوني</h3>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                  قبل إنهاء الصفقة، يجب على الطرفين مراجعة الملخص والموافقة رسمياً.
                </p>
                <Button
                  onClick={() => setShowLegalPanel(true)}
                  variant="outline"
                  className="w-full rounded-xl active:scale-[0.98] text-xs"
                >
                  بدء التأكيد القانوني
                </Button>
              </div>
            )}
            {deal.status === "finalized" && (
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={14} strokeWidth={1.5} className="text-primary" />
                  <h3 className="font-medium text-sm">الصفقة مُقفلة</h3>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                  تمت الموافقة من الطرفين. يمكنك الانتقال للاتفاقية.
                </p>
                <Button asChild className="w-full rounded-xl text-xs gradient-primary text-primary-foreground">
                  <Link to={`/agreement/${dealId}`}>عرض الاتفاقية</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NegotiationPage;
