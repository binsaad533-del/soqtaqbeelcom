import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Check, X, MessageSquare, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListingOffers, type ListingOffer } from "@/hooks/useListingOffers";
import { useDeals } from "@/hooks/useDeals";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

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

  const hasAccepted = offers.some(o => o.status === "accepted");

  const handleAccept = async (offer: ListingOffer) => {
    if (hasAccepted) {
      toast.error("لا يمكن قبول أكثر من عرض واحد");
      return;
    }
    setRespondingId(offer.id);
    const { error } = await respondToOffer(offer.id, "accepted");
    if (error) {
      toast.error("فشل قبول العرض");
      setRespondingId(null);
      return;
    }

    // Auto-reject all other pending offers
    const otherPending = offers.filter(o => o.id !== offer.id && o.status === "pending");
    for (const other of otherPending) {
      await respondToOffer(other.id, "rejected");
    }

    toast.success("تم قبول العرض ✅ ورفض العروض الأخرى تلقائياً");

    // Create a deal with agreed price
    const { data: dealData } = await createDeal(listingId, listingOwnerId, offer.buyer_id, offer.offered_price);
    if (dealData) {
      setOffers(prev => prev.map(o =>
        o.id === offer.id
          ? { ...o, status: "accepted", deal_id: dealData.id }
          : { ...o, status: o.status === "pending" ? "rejected" : o.status }
      ));
      navigate(`/negotiate/${dealData.id}`);
    } else {
      setOffers(prev => prev.map(o =>
        o.id === offer.id
          ? { ...o, status: "accepted" }
          : { ...o, status: o.status === "pending" ? "rejected" : o.status }
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
    }
    setRespondingId(null);
  };

  if (offers.length === 0) return null;

  const pendingOffers = offers.filter(o => o.status === "pending");
  const otherOffers = offers.filter(o => o.status !== "pending");

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
          {pendingOffers.length > 0 && (
            <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
              {pendingOffers.length} جديد
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            أعلى: {offers[0]?.offered_price ? Number(offers[0].offered_price).toLocaleString("en-US") : "—"} ر.س
          </span>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* Pending first */}
          {pendingOffers.map(offer => (
            <div key={offer.id} className="p-3 bg-background rounded-xl border border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {Number(offer.offered_price).toLocaleString("en-US")} ر.س
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(offer.created_at), { locale: ar, addSuffix: true })}
                </span>
              </div>
              {offer.message && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <MessageSquare size={10} className="shrink-0 mt-0.5" />
                  {offer.message}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(offer)}
                  disabled={loading || respondingId === offer.id || hasAccepted}
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
            </div>
          ))}

          {/* Responded offers */}
          {otherOffers.map(offer => (
            <div key={offer.id} className="p-2.5 bg-muted/20 rounded-xl border border-border/10 opacity-60">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">
                  {Number(offer.offered_price).toLocaleString("en-US")} ر.س
                </span>
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded",
                  offer.status === "accepted" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                )}>
                  {offer.status === "accepted" ? "مقبول" : "مرفوض"}
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
