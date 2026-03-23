import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useListings, type Listing } from "@/hooks/useListings";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import AiStar from "@/components/AiStar";
import TrustBadge, { getSellerBadges, getTrustLevel } from "@/components/TrustBadge";
import MarketplaceFilters, { defaultFilters, type FilterState } from "@/components/marketplace/MarketplaceFilters";
import MobileFilterSheet from "@/components/marketplace/MobileFilterSheet";
import SmartSearchBar from "@/components/marketplace/SmartSearchBar";
import { MapPin, Eye, ShieldCheck, TrendingUp } from "lucide-react";

interface EnrichedListing extends Listing {
  sellerProfile?: Profile | null;
  visibilityTier: 1 | 2 | 3;
}

const MarketplacePage = () => {
  const { getPublishedListings } = useListings();
  const { getAllProfiles } = useProfiles();
  const isMobile = useIsMobile();
  const [listings, setListings] = useState<Listing[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const handleSmartSearch = (partial: Partial<FilterState>, _message: string) => {
    setFilters(prev => ({ ...prev, ...partial }));
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [listingsData, profilesData] = await Promise.all([
        getPublishedListings(),
        getAllProfiles(),
      ]);
      setListings(listingsData);
      setProfiles(profilesData);
      setLoading(false);
    };
    load();
  }, [getPublishedListings, getAllProfiles]);

  const enrichedListings = useMemo((): EnrichedListing[] => {
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));
    return listings.map(listing => {
      const seller = profileMap.get(listing.owner_id);
      const trustScore = seller?.trust_score ?? 50;
      const isVerified = seller?.is_verified ?? false;
      let tier: 1 | 2 | 3 = 2;
      if (trustScore >= 70 && isVerified) tier = 1;
      if (trustScore < 50) tier = 3;
      return { ...listing, sellerProfile: seller || null, visibilityTier: tier };
    });
  }, [listings, profiles]);

  const filtered = useMemo(() => {
    const result = enrichedListings.filter(l => {
      // City
      if (filters.city !== "الكل" && filters.city !== "📍 بالقرب مني" && l.city !== filters.city) return false;
      // Activity
      if (filters.activity !== "الكل" && l.category !== filters.activity && !l.business_activity?.includes(filters.activity)) return false;
      // Deal type
      if (filters.dealType !== "الكل") {
        const dt = l.primary_deal_type || l.deal_type || "";
        if (filters.dealType === "تقبيل_كامل" && !dt.includes("تقبيل") && !dt.includes("full")) return false;
        if (filters.dealType === "بيع_معدات" && !dt.includes("معدات") && !dt.includes("assets")) return false;
        if (filters.dealType === "بيع_مع_سجل" && !dt.includes("سجل") && !dt.includes("with_cr")) return false;
        if (filters.dealType === "بيع_بدون_سجل" && !dt.includes("بدون") && !dt.includes("no_cr")) return false;
      }
      // Price
      if (l.price != null) {
        if (l.price < filters.priceRange[0] || l.price > filters.priceRange[1]) return false;
      }
      // Search
      if (filters.search) {
        const s = filters.search;
        if (!l.title?.includes(s) && !l.business_activity?.includes(s) && !l.city?.includes(s) && !l.description?.includes(s)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (a.visibilityTier !== b.visibilityTier) return a.visibilityTier - b.visibilityTier;
      return (b.sellerProfile?.trust_score ?? 50) - (a.sellerProfile?.trust_score ?? 50);
    });

    return result;
  }, [enrichedListings, filters]);

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-medium">سوق التقبيل</h1>
            <p className="text-sm text-muted-foreground">استعرض فرص التقبيل المتاحة</p>
          </div>
          <div className="flex items-center gap-3">
            {isMobile && (
              <MobileFilterSheet filters={filters} onChange={setFilters} resultCount={filtered.length} />
            )}
            <AiStar size={24} />
          </div>
        </div>

        {/* Incentive */}
        <div className="bg-primary/5 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2">
          <TrendingUp size={14} className="text-primary shrink-0" />
          <p className="text-[11px] text-muted-foreground">البائعون الملتزمون بالسداد والموثّقون يظهرون أولاً في النتائج</p>
        </div>

        <div className="flex gap-6">
          {/* Desktop filters sidebar */}
          {!isMobile && (
            <aside className="w-64 shrink-0">
              <div className="sticky top-24 bg-card rounded-2xl p-4 shadow-soft">
                <MarketplaceFilters filters={filters} onChange={setFilters} resultCount={filtered.length} />
              </div>
            </aside>
          )}

          {/* Listings grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="text-center py-16 text-sm text-muted-foreground">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <AiStar size={32} className="mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ListingCard = ({ listing }: { listing: EnrichedListing }) => {
  const seller = listing.sellerProfile;
  const badges = seller ? getSellerBadges(seller) : [];

  return (
    <Link
      to={`/listing/${listing.id}`}
      className={cn(
        "bg-card rounded-2xl shadow-soft hover:shadow-soft-hover transition-all overflow-hidden group relative",
        listing.visibilityTier === 1 && "ring-1 ring-primary/10"
      )}
    >
      {listing.visibilityTier === 1 && (
        <div className="absolute top-2 right-2 z-10 bg-primary/90 text-primary-foreground text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1">
          <ShieldCheck size={10} /> بائع موثوق
        </div>
      )}
      <div className="h-40 bg-gradient-to-br from-primary/5 to-accent/30 flex items-center justify-center">
        {listing.photos && Object.values(listing.photos).flat().length > 0 ? (
          <img src={(Object.values(listing.photos).flat() as string[])[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <Eye size={24} className="text-muted-foreground/30" strokeWidth={1} />
        )}
      </div>
      <div className="p-4">
        <div className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
          {listing.title || listing.business_activity || "فرصة تقبيل"}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin size={12} strokeWidth={1.3} />
          {listing.district && `${listing.district}, `}{listing.city || "—"}
        </div>
        {seller && (
          <div className="mb-2">
            <TrustBadge score={seller.trust_score} verificationLevel={seller.verification_level} size="sm" showScore showBadges badges={badges.slice(0, 2)} />
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary">
            {listing.price ? `${Number(listing.price).toLocaleString()} ر.س` : "—"}
          </span>
          {listing.disclosure_score !== null && listing.disclosure_score > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full gradient-primary" style={{ width: `${listing.disclosure_score}%` }} />
              </div>
              <span className="text-[9px] text-muted-foreground">{listing.disclosure_score}%</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default MarketplacePage;
