import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import SarSymbol from "@/components/SarSymbol";
import {
  ShoppingCart, ChevronLeft, Clock, CheckCircle,
  XCircle, Loader2, Search
} from "lucide-react";

type Offer = {
  id: string;
  listing_id: string;
  offered_price: number;
  status: string;
  message: string | null;
  seller_response: string | null;
  created_at: string;
  listing_title?: string;
  listing_city?: string;
  listing_activity?: string;
};

export default function BuyerOffersTab() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const statusMap: Record<string, { label: string; cls: string }> = useMemo(() => ({
    pending: { label: t("dashboard.buyerOffers.status.pending"), cls: "bg-warning/15 text-warning" },
    accepted: { label: t("dashboard.buyerOffers.status.accepted"), cls: "bg-success/15 text-success" },
    rejected: { label: t("dashboard.buyerOffers.status.rejected"), cls: "bg-destructive/15 text-destructive" },
    withdrawn: { label: t("dashboard.buyerOffers.status.withdrawn"), cls: "bg-muted text-muted-foreground" },
  }), [t]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("listing_offers")
        .select("id, listing_id, offered_price, status, message, seller_response, created_at")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (!data) { setLoading(false); return; }

      const listingIds = [...new Set(data.map(o => o.listing_id))];
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, city, business_activity")
        .in("id", listingIds);

      const listingMap = new Map((listings || []).map(l => [l.id, l]));

      setOffers(data.map(o => {
        const l = listingMap.get(o.listing_id);
        return {
          ...o,
          listing_title: l?.title || l?.business_activity || undefined,
          listing_city: l?.city || undefined,
          listing_activity: l?.business_activity || undefined,
        };
      }));
      setLoading(false);
    })();
  }, [user?.id]);

  const filtered = useMemo(() => {
    let result = offers;
    if (filter !== "all") result = result.filter(o => o.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        (o.listing_title || "").toLowerCase().includes(q) ||
        (o.listing_city || "").toLowerCase().includes(q) ||
        String(o.offered_price).includes(q)
      );
    }
    return result;
  }, [offers, filter, search]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("dashboard.search.offers")}
            className="w-full bg-muted/40 border-0 rounded-lg py-2 pr-9 pl-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "all", label: t("dashboard.filters.all") },
          { id: "pending", label: t("dashboard.filters.pending") },
          { id: "accepted", label: t("dashboard.filters.accepted") },
          { id: "rejected", label: t("dashboard.filters.rejected") },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap transition-all",
            filter === f.id ? "bg-primary/10 text-primary font-medium" : "bg-muted/40 text-muted-foreground hover:bg-muted"
          )}>{f.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 shadow-soft border border-border/30 text-center">
          <ShoppingCart size={32} className="mx-auto mb-3 text-muted-foreground/20" strokeWidth={1} />
          <p className="text-sm text-muted-foreground mb-2">
            {offers.length === 0 ? t("dashboard.buyerOffers.empty") : t("dashboard.buyerOffers.noResults")}
          </p>
          {offers.length === 0 && (
            <Link to="/marketplace" className="text-xs text-primary hover:underline">{t("dashboard.buyerOffers.browseAndOffer")}</Link>
          )}
        </div>
      ) : (
        filtered.map(offer => {
          const st = statusMap[offer.status] || statusMap.pending;
          const StatusIcon = offer.status === "accepted" ? CheckCircle : offer.status === "rejected" ? XCircle : Clock;
          return (
            <Link
              key={offer.id}
              to={`/listing/${offer.listing_id}`}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/30 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  offer.status === "accepted" ? "bg-success/10" : offer.status === "rejected" ? "bg-destructive/10" : "bg-primary/10"
                )}>
                  <StatusIcon size={16} className={offer.status === "accepted" ? "text-success" : offer.status === "rejected" ? "text-destructive" : "text-primary"} strokeWidth={1.3} />
                </div>
                <div>
                  <div className="text-sm font-medium group-hover:text-primary transition-colors">
                    {offer.listing_title || t("dashboard.buyerOffers.opportunityFallback")}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {offer.listing_city || "—"}
                    {" · "}
                    {t("dashboard.buyerOffers.yourOffer")} {Number(offer.offered_price).toLocaleString("en-US")} <SarSymbol size={9} />
                    {" · "}
                    {new Date(offer.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                  {offer.seller_response && (
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5 truncate max-w-[300px]">
                      {t("dashboard.buyerOffers.sellerReply")} {offer.seller_response}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                <ChevronLeft size={14} className="text-muted-foreground/40" />
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
