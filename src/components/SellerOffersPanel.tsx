import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Check, X, MessageSquare, Loader2, TrendingUp, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListingOffers, type ListingOffer } from "@/hooks/useListingOffers";
import { useDeals } from "@/hooks/useDeals";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  listingId: string;
  listingOwnerId: string;
  className?: string;
}

const SellerOffersPanel = ({ listingId, listingOwnerId, className }: Props) => {
  const navigate = useNavigate();
  const { getSellerOffers, respondToOffer, loading } = useListingOffers();
  const { createDeal } = useDeals();
  const [offers, setOffers] = useState<ListingOffer[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    getSellerOffers(listingId).then(setOffers);
  }, [listingId, getSellerOffers]);

  const acceptedOffer = offers.find(o => o.status === "accepted");
  const hasAccepted = !!acceptedOffer;

  const handleAccept = async (offer: ListingOffer) => {
    if (hasAccepted) {
      toast.error("يوجد عرض مقبول بالفعل — أكمل الصفقة الحالية أو ألغها أولاً");
      return;
    }
    setRespondingId(offer.id);
    const { error } = await respondToOffer(offer.id, "accepted");
    if (error) {
      toast.error("فشل قبول العرض");
      setRespondingId(null);
      return;
    }

    toast.success("تم قبول العرض ✅");

    // Send email notification to buyer (server looks up email)
    sendNotificationEmail({
      userId: offer.buyer_id,
      category: "offers",
      templateName: "offer-status-update",
      idempotencyKey: `offer-accepted-${offer.id}`,
      templateData: {
        offeredPrice: offer.offered_price?.toLocaleString("ar-SA"),
        status: "accepted",
      },
    }).catch(() => {});

    // Create a deal with agreed price — other offers stay pending (on hold)
    const { data: dealData } = await createDeal(listingId, listingOwnerId, offer.buyer_id, offer.offered_price);
    if (dealData) {
      setOffers(prev => prev.map(o =>
        o.id === offer.id ? { ...o, status: "accepted", deal_id: dealData.id } : o
      ));
      navigate(`/negotiate/${dealData.id}`);
    } else {
      setOffers(prev => prev.map(o =>
        o.id === offer.id ? { ...o, status: "accepted" } : o
      ));
    }
    setRespondingId(null);
  };

  const handleReject = async (offer: ListingOffer) => {
    setRespondingId(offer.id);
    const { error } = await respondToOffer(offer.id, "rejected");
    if (error) {
      toast.error("فشل رفض العرض");
    } else {
      toast.success("تم رفض العرض");
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: "rejected" } : o));

      // Send email notification to buyer about rejection
      const { data: buyerProfile } = await supabase
        .from("profiles").select("full_name").eq("user_id", offer.buyer_id).maybeSingle();
      const { data: buyerAuth } = await supabase.auth.admin?.getUserById?.(offer.buyer_id) || { data: null };
      const buyerEmail = (buyerAuth as any)?.user?.email;
      if (buyerEmail) {
        sendNotificationEmail({
          userId: offer.buyer_id,
          category: "offers",
          templateName: "offer-status-update",
          recipientEmail: buyerEmail,
          idempotencyKey: `offer-rejected-${offer.id}`,
          templateData: {
            recipientName: buyerProfile?.full_name || "",
            offeredPrice: offer.offered_price?.toLocaleString("ar-SA"),
            status: "rejected",
          },
        }).catch(() => {});
      }
    }
    setRespondingId(null);
  };

  if (offers.length === 0) return null;

  const pendingOffers = offers.filter(o => o.status === "pending");
  const rejectedOffers = offers.filter(o => o.status === "rejected");

  return (
    <div className={cn("rounded-xl border border-primary/20 bg-primary/5 overflow-hidden", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-primary" />
          <span className="text-xs font-semibold text-foreground">
            عروض الأسعار ({offers.length})
          </span>
          {pendingOffers.length > 0 && !hasAccepted && (
            <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
              {pendingOffers.length} جديد
            </span>
          )}
          {hasAccepted && (
            <span className="text-[10px] bg-success/15 text-success rounded-full px-1.5 py-0.5 font-medium">
              صفقة جارية
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            أعلى: {offers.length > 0 ? <>{Math.max(...offers.map(o => Number(o.offered_price))).toLocaleString("en-US")} <SarSymbol size={9} /></> : "—"}
          </span>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* Accepted offer — with link to negotiation */}
          {acceptedOffer && (
            <div className="p-3 bg-success/5 rounded-xl border border-success/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {Number(acceptedOffer.offered_price).toLocaleString("en-US")} <SarSymbol size={11} />
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/15 text-success">
                  مقبول — صفقة جارية
                </span>
              </div>
              {acceptedOffer.deal_id && (
                <Button
                  asChild
                  size="sm"
                  className="w-full rounded-xl text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Link to={`/negotiate/${acceptedOffer.deal_id}`}>
                    <ArrowLeft size={12} />
                    الانتقال للمفاوضات
                  </Link>
                </Button>
              )}
            </div>
          )}

          {/* Info banner when there's an accepted offer */}
          {hasAccepted && pendingOffers.length > 0 && (
            <div className="p-2.5 bg-warning/5 rounded-lg border border-warning/15 flex items-start gap-2">
              <Clock size={12} className="text-warning shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                العروض الأخرى في الانتظار حتى اكتمال الصفقة الحالية أو إلغائها. إذا لم تتم الصفقة يمكنك العودة وقبول عرض آخر.
              </p>
            </div>
          )}

          {/* Pending offers */}
          {pendingOffers.map(offer => (
            <div key={offer.id} className={cn(
              "p-3 bg-background rounded-xl border border-border/30 space-y-2",
              hasAccepted && "opacity-50"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {Number(offer.offered_price).toLocaleString("en-US")} <SarSymbol size={11} />
                </span>
                <div className="flex items-center gap-2">
                  {hasAccepted && (
                    <span className="text-[9px] text-warning font-medium px-1.5 py-0.5 rounded bg-warning/10">
                      في الانتظار
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(offer.created_at), { locale: ar, addSuffix: true })}
                  </span>
                </div>
              </div>
              {offer.message && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <MessageSquare size={10} className="shrink-0 mt-0.5" />
                  {offer.message}
                </p>
              )}
              {!hasAccepted && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(offer)}
                    disabled={loading || respondingId === offer.id}
                    className="flex-1 rounded-xl text-xs gap-1 bg-success hover:bg-success/90 text-success-foreground"
                  >
                    {respondingId === offer.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    قبول وبدء التفاوض
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(offer)}
                    disabled={loading || respondingId === offer.id}
                    className="rounded-xl text-xs gap-1"
                  >
                    <X size={12} />
                    رفض
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Rejected offers */}
          {rejectedOffers.map(offer => (
            <div key={offer.id} className="p-2.5 bg-muted/20 rounded-xl border border-border/10 opacity-50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">
                  {Number(offer.offered_price).toLocaleString("en-US")} <SarSymbol size={10} />
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                  مرفوض
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerOffersPanel;
