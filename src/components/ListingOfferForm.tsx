import { useState, useEffect } from "react";
import { Send, Loader2, Check, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListingOffers, type OffersSummary, type ListingOffer } from "@/hooks/useListingOffers";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Props {
  listingId: string;
  listingPrice: number | null;
  ownerId: string;
  className?: string;
}

const ListingOfferForm = ({ listingId, listingPrice, ownerId, className }: Props) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { submitOffer, getOffersSummary, getMyOffer, loading } = useListingOffers();

  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [myOffer, setMyOffer] = useState<ListingOffer | null>(null);
  const [summary, setSummary] = useState<OffersSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load summary + my offer on mount
  useEffect(() => {
    getOffersSummary(listingId).then(setSummary);
    if (user && user.id !== ownerId) {
      getMyOffer(listingId).then((offer) => {
        if (offer) {
          setMyOffer(offer);
          setSubmitted(true);
        }
      });
    }
  }, [listingId, user, ownerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOwner = user?.id === ownerId;

  const handleSubmit = async () => {
    if (!user) { navigate("/login"); return; }
    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) {
      toast.error("يرجى إدخال سعر صحيح");
      return;
    }

    const { error } = await submitOffer(listingId, numPrice, message);
    if (error) {
      toast.error("فشل إرسال العرض");
    } else {
      toast.success("تم إرسال عرضك بنجاح ✅");
      setSubmitted(true);
      setMyOffer({ offered_price: numPrice, message, status: "pending" } as any);
      // Refresh summary
      getOffersSummary(listingId).then(setSummary);
    }
  };

  if (isOwner) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Public summary */}
      {summary && summary.total_offers > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp size={14} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              {summary.total_offers} عرض مقدّم
            </p>
            <p className="text-[11px] text-muted-foreground">
              أعلى عرض: {summary.highest_offer.toLocaleString("en-US")} ر.س
            </p>
          </div>
        </div>
      )}

      {/* Already submitted */}
      {submitted && myOffer ? (
        <div className="p-4 bg-success/5 rounded-xl border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <Check size={14} className="text-success" />
            <span className="text-xs font-medium text-success">تم إرسال عرضك</span>
          </div>
          <p className="text-sm font-medium text-foreground">
            {Number(myOffer.offered_price).toLocaleString("en-US")} ر.س
          </p>
          {myOffer.message && (
            <p className="text-xs text-muted-foreground mt-1">{myOffer.message}</p>
          )}
          {myOffer.status === "accepted" && (
            <div className="mt-2 text-xs font-medium text-success bg-success/10 rounded-lg px-2 py-1 inline-block">
              ✓ تم قبول عرضك!
            </div>
          )}
          {myOffer.status === "rejected" && (
            <div className="mt-2 text-xs font-medium text-destructive bg-destructive/10 rounded-lg px-2 py-1 inline-block">
              تم رفض العرض
              {myOffer.seller_response && <span className="block mt-1 font-normal">{myOffer.seller_response}</span>}
            </div>
          )}
        </div>
      ) : (
        /* Offer form */
        <div className="p-4 bg-muted/20 rounded-xl border border-border/30 space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-primary" />
            <span className="text-xs font-semibold text-foreground">قدّم عرض سعر</span>
          </div>

          <div className="relative">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={listingPrice ? `السعر المطلوب: ${Number(listingPrice).toLocaleString("en-US")}` : "اكتب سعرك"}
              className="w-full px-3 py-2.5 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
              dir="ltr"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ر.س</span>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="رسالة للبائع (اختياري)..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background text-xs resize-none focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
          />

          <Button
            onClick={handleSubmit}
            disabled={loading || !price}
            className="w-full gradient-primary text-primary-foreground rounded-xl gap-1"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            إرسال العرض
          </Button>
        </div>
      )}
    </div>
  );
};

export default ListingOfferForm;
