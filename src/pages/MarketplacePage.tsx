import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useListings, type Listing } from "@/hooks/useListings";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import AiStar from "@/components/AiStar";
import TrustBadge, { getSellerBadges } from "@/components/TrustBadge";
import SimulationOverlay, { hasSimulationPhotos } from "@/components/SimulationOverlay";
import MarketplaceFilters, { defaultFilters, type FilterState } from "@/components/marketplace/MarketplaceFilters";
import MobileFilterSheet from "@/components/marketplace/MobileFilterSheet";
import SmartSearchBar from "@/components/marketplace/SmartSearchBar";
import ComparePanel, { type CompareItem } from "@/components/marketplace/ComparePanel";
import { MapPin, Eye, ShieldCheck, GitCompareArrows, Check, Lightbulb } from "lucide-react";
import MarketplaceTicker from "@/components/marketplace/MarketplaceTicker";
import { toast } from "sonner";

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
  const [compareItems, setCompareItems] = useState<CompareItem[]>([]);
  const [similarActivities, setSimilarActivities] = useState<string[]>([]);

  const handleSmartSearch = (partial: Partial<FilterState>, _message: string, similar?: string[]) => {
    setFilters(prev => ({ ...prev, ...partial }));
    setSimilarActivities(similar || []);
  };

  const toggleCompare = useCallback((listing: EnrichedListing) => {
    setCompareItems(prev => {
      const exists = prev.find(i => i.id === listing.id);
      if (exists) return prev.filter(i => i.id !== listing.id);
      if (prev.length >= 4) {
        toast.error("يمكنك مقارنة 4 إعلانات كحد أقصى");
        return prev;
      }
      const item: CompareItem = {
        id: listing.id,
        title: listing.title,
        business_activity: listing.business_activity,
        city: listing.city,
        district: listing.district,
        price: listing.price,
        deal_type: listing.deal_type,
        primary_deal_type: listing.primary_deal_type,
        disclosure_score: listing.disclosure_score,
        photos: listing.photos,
        ai_rating: listing.ai_rating,
        trust_score: listing.sellerProfile?.trust_score,
        verification_level: listing.sellerProfile?.verification_level,
      };
      return [...prev, item];
    });
  }, []);

  const removeCompare = useCallback((id: string) => {
    setCompareItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCompare = useCallback(() => setCompareItems([]), []);

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
      if (filters.city === "📍 بالقرب مني" && filters.nearbyCities?.length) {
        if (!filters.nearbyCities.includes(l.city || "")) return false;
      } else if (filters.city !== "الكل" && filters.city !== "📍 بالقرب مني" && l.city !== filters.city) return false;
      if (filters.activity !== "الكل" && l.category !== filters.activity && !l.business_activity?.includes(filters.activity)) return false;
      if (filters.dealType !== "الكل") {
        const dt = l.primary_deal_type || l.deal_type || "";
        if (filters.dealType === "تقبيل_كامل" && !dt.includes("تقبيل") && !dt.includes("full")) return false;
        if (filters.dealType === "بيع_معدات" && !dt.includes("معدات") && !dt.includes("assets")) return false;
        if (filters.dealType === "بيع_مع_سجل" && !dt.includes("سجل") && !dt.includes("with_cr")) return false;
        if (filters.dealType === "بيع_بدون_سجل" && !dt.includes("بدون") && !dt.includes("no_cr")) return false;
      }
      if (l.price != null) {
        if (l.price < filters.priceRange[0] || l.price > filters.priceRange[1]) return false;
      }
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

  // Similar results: listings matching similar activities but NOT the main filter
  const similarResults = useMemo(() => {
    if (similarActivities.length === 0 || filters.activity === "الكل") return [];

    return enrichedListings.filter(l => {
      // Exclude listings already in main results
      if (l.category === filters.activity || l.business_activity?.includes(filters.activity)) return false;
      // Check if matches any similar activity
      const matchesSimilar = similarActivities.some(sa =>
        l.category === sa || l.business_activity?.includes(sa)
      );
      if (!matchesSimilar) return false;
      // Apply other filters (city, price, deal type)
      if (filters.city === "📍 بالقرب مني" && filters.nearbyCities?.length) {
        if (!filters.nearbyCities.includes(l.city || "")) return false;
      } else if (filters.city !== "الكل" && filters.city !== "📍 بالقرب مني" && l.city !== filters.city) return false;
      if (filters.dealType !== "الكل") {
        const dt = l.primary_deal_type || l.deal_type || "";
        if (filters.dealType === "تقبيل_كامل" && !dt.includes("تقبيل") && !dt.includes("full")) return false;
        if (filters.dealType === "بيع_معدات" && !dt.includes("معدات") && !dt.includes("assets")) return false;
        if (filters.dealType === "بيع_مع_سجل" && !dt.includes("سجل") && !dt.includes("with_cr")) return false;
        if (filters.dealType === "بيع_بدون_سجل" && !dt.includes("بدون") && !dt.includes("no_cr")) return false;
      }
      if (l.price != null) {
        if (l.price < filters.priceRange[0] || l.price > filters.priceRange[1]) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.visibilityTier !== b.visibilityTier) return a.visibilityTier - b.visibilityTier;
      return (b.sellerProfile?.trust_score ?? 50) - (a.sellerProfile?.trust_score ?? 50);
    }).slice(0, 6);
  }, [enrichedListings, filters, similarActivities]);

  const compareIds = useMemo(() => new Set(compareItems.map(i => i.id)), [compareItems]);

  return (
    <div className={cn("py-8", compareItems.length > 0 && "pb-24")}>
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

        {/* Live Market Ticker */}
        <MarketplaceTicker />

        {/* Mobile: Smart search */}
        {isMobile && <SmartSearchBar onApplyFilters={handleSmartSearch} resultCount={filtered.length} />}

        <div className="flex gap-6">
          {/* Desktop filters sidebar */}
          {!isMobile && (
            <aside className="w-64 shrink-0">
                <div className="sticky top-24 space-y-4">
                <SmartSearchBar onApplyFilters={handleSmartSearch} resultCount={filtered.length} />
                <div className="bg-card rounded-2xl p-4 shadow-soft max-h-[calc(100vh-12rem)] overflow-y-auto">
                  <MarketplaceFilters filters={filters} onChange={setFilters} resultCount={filtered.length} />
                </div>
              </div>
            </aside>
          )}

          {/* Listings grid */}
          <div className="flex-1 min-w-0 space-y-6">
            {loading ? (
              <div className="text-center py-16 text-sm text-muted-foreground">جاري التحميل...</div>
            ) : filtered.length === 0 && similarResults.length === 0 ? (
              <div className="text-center py-16">
                <AiStar size={32} className="mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة</p>
              </div>
            ) : (
              <>
                {/* Exact results */}
                {filtered.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(listing => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        isComparing={compareIds.has(listing.id)}
                        onToggleCompare={() => toggleCompare(listing)}
                      />
                    ))}
                  </div>
                )}

                {filtered.length === 0 && similarResults.length > 0 && (
                  <div className="text-center py-8">
                    <AiStar size={28} className="mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة تماماً لبحثك</p>
                  </div>
                )}

                {/* Similar results section */}
                {similarResults.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Lightbulb size={14} className="text-amber-500" />
                        <span className="text-xs font-medium">فرص مشابهة قد تهمّك</span>
                      </div>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-90">
                      {similarResults.map(listing => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          isComparing={compareIds.has(listing.id)}
                          onToggleCompare={() => toggleCompare(listing)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Compare Panel */}
      <ComparePanel items={compareItems} onRemove={removeCompare} onClear={clearCompare} />
    </div>
  );
};

const ListingCard = ({ listing, isComparing, onToggleCompare }: {
  listing: EnrichedListing;
  isComparing: boolean;
  onToggleCompare: () => void;
}) => {
  const seller = listing.sellerProfile;
  const badges = seller ? getSellerBadges(seller) : [];

  return (
    <div className={cn(
      "bg-card rounded-2xl shadow-soft hover:shadow-soft-hover transition-all overflow-hidden group relative",
      listing.visibilityTier === 1 && "ring-1 ring-primary/10",
      isComparing && "ring-2 ring-primary"
    )}>
      {listing.visibilityTier === 1 && (
        <div className="absolute top-2 right-2 z-10 bg-primary/90 text-primary-foreground text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1">
          <ShieldCheck size={10} /> بائع موثوق
        </div>
      )}

      {/* Compare toggle button */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare(); }}
        className={cn(
          "absolute top-2 left-2 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          isComparing
            ? "bg-primary text-primary-foreground shadow-soft"
            : "bg-card/80 backdrop-blur text-muted-foreground hover:bg-card hover:text-primary border border-border/50"
        )}
        title={isComparing ? "إزالة من المقارنة" : "إضافة للمقارنة"}
      >
        {isComparing ? <Check size={14} strokeWidth={2} /> : <GitCompareArrows size={14} strokeWidth={1.5} />}
      </button>

      <Link to={`/listing/${listing.id}`}>
        <div className="h-40 bg-gradient-to-br from-primary/5 to-accent/30 flex items-center justify-center relative">
          {listing.photos && Object.values(listing.photos).flat().length > 0 ? (
            <>
              <img src={(Object.values(listing.photos).flat() as string[])[0]} alt="" className="w-full h-full object-cover" />
              {hasSimulationPhotos(listing.photos as Record<string, unknown>) && <SimulationOverlay size="sm" />}
            </>
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
              <div className="flex items-center gap-1" title="نسبة شفافية البائع في الإفصاح عن تفاصيل الفرصة">
                <span className="text-[8px] text-muted-foreground/70">شفافية</span>
                <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full gradient-primary" style={{ width: `${listing.disclosure_score}%` }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{listing.disclosure_score}%</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default MarketplacePage;
