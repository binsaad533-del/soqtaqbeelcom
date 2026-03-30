import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import SarSymbol from "@/components/SarSymbol";
import PriceDisplay from "@/components/PriceDisplay";
import {
  Heart, MapPin, Eye, Loader2, Search, Trash2
} from "lucide-react";
import { toast } from "sonner";

type SavedListing = {
  like_id: string;
  listing_id: string;
  liked_at: string;
  title: string | null;
  business_activity: string | null;
  city: string | null;
  district: string | null;
  price: number | null;
  status: string;
  photos: Record<string, unknown> | null;
};

export default function SavedListingsTab() {
  const { user } = useAuthContext();
  const [items, setItems] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: likes } = await supabase
      .from("listing_likes")
      .select("id, listing_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!likes || likes.length === 0) { setItems([]); setLoading(false); return; }

    const listingIds = likes.map(l => l.listing_id);
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, business_activity, city, district, price, status, photos")
      .in("id", listingIds);

    const listingMap = new Map((listings || []).map(l => [l.id, l]));

    setItems(likes.map(like => {
      const l = listingMap.get(like.listing_id);
      return {
        like_id: like.id,
        listing_id: like.listing_id,
        liked_at: like.created_at,
        title: l?.title || null,
        business_activity: l?.business_activity || null,
        city: l?.city || null,
        district: l?.district || null,
        price: l?.price ? Number(l.price) : null,
        status: l?.status || "unknown",
        photos: l?.photos as Record<string, unknown> | null,
      };
    }).filter(i => i.status === "published"));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const removeLike = async (likeId: string) => {
    setRemoving(likeId);
    const { error } = await supabase.from("listing_likes").delete().eq("id", likeId);
    if (!error) {
      setItems(prev => prev.filter(i => i.like_id !== likeId));
      toast.success("تم إزالة الإعلان من المحفوظات");
    }
    setRemoving(null);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      (i.title || "").toLowerCase().includes(q) ||
      (i.business_activity || "").toLowerCase().includes(q) ||
      (i.city || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث في المحفوظات..."
          className="w-full bg-muted/40 border-0 rounded-lg py-2 pr-9 pl-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 shadow-soft border border-border/30 text-center">
          <Heart size={32} className="mx-auto mb-3 text-muted-foreground/20" strokeWidth={1} />
          <p className="text-sm text-muted-foreground mb-2">
            {items.length === 0 ? "لم تحفظ أي إعلان بعد" : "لا توجد نتائج"}
          </p>
          {items.length === 0 && (
            <Link to="/marketplace" className="text-xs text-primary hover:underline">تصفح الفرص واحفظ ما يعجبك</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(item => {
            const photos = item.photos ? Object.values(item.photos).flat() as string[] : [];
            return (
              <div key={item.like_id} className="bg-card rounded-2xl shadow-soft border border-border/30 overflow-hidden hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-200 group relative">
                <Link to={`/listing/${item.listing_id}`}>
                  <div className="h-32 bg-gradient-to-br from-primary/5 to-accent/20 flex items-center justify-center">
                    {photos.length > 0 ? (
                      <img src={photos[0]} alt={item.title || item.business_activity || ""} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <Eye size={20} className="text-muted-foreground/20" strokeWidth={1} />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-medium mb-1 group-hover:text-primary transition-colors truncate">
                      {item.title || item.business_activity || "فرصة تقبيل"}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2">
                      <MapPin size={11} strokeWidth={1.3} />
                      {item.district && `${item.district}، `}{item.city || "—"}
                    </div>
                    <div className="text-sm font-medium text-primary">
                      {item.price ? <PriceDisplay amount={item.price} size={10} /> : "السعر عند التواصل"}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); removeLike(item.like_id); }}
                  disabled={removing === item.like_id}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full bg-card/80 backdrop-blur flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                  title="إزالة من المحفوظات"
                >
                  {removing === item.like_id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
