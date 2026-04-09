import { useState, useMemo, useCallback, useEffect, memo } from "react";
import { useSEO } from "@/hooks/useSEO";
import { calculateTransparency } from "@/lib/transparencyScore";
import { getOrderedPhotos } from "@/lib/photoOrdering";
import { Link } from "react-router-dom";
import { type Listing } from "@/hooks/useListings";
import { type Profile } from "@/hooks/useProfiles";
import { useListingSocial } from "@/hooks/useListingSocial";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import AiStar from "@/components/AiStar";
import TrustBadge, { getSellerBadges } from "@/components/TrustBadge";
import SimulationOverlay, { hasSimulationPhotos } from "@/components/SimulationOverlay";
import MarketplaceFilters, { defaultFilters, type FilterState } from "@/components/marketplace/MarketplaceFilters";
import MobileFilterSheet from "@/components/marketplace/MobileFilterSheet";
import SmartSearchBar from "@/components/marketplace/SmartSearchBar";
import ComparePanel, { type CompareItem } from "@/components/marketplace/ComparePanel";
import { MapPin, Eye, ShieldCheck, GitCompareArrows, Check, Lightbulb, Heart, Share2 } from "lucide-react";
import VerifiedSellerBadge from "@/components/VerifiedSellerBadge";
import MarketplaceTicker from "@/components/marketplace/MarketplaceTicker";
import OpportunityHeatmap from "@/components/OpportunityHeatmap";
import { toast } from "sonner";
import PriceDisplay from "@/components/PriceDisplay";
import { getArabicDealType } from "@/lib/translations";
import { usePublishedListingsQuery } from "@/hooks/useListingsQuery";
import { useAllProfilesQuery } from "@/hooks/useProfilesQuery";
import { usePagination } from "@/hooks/usePagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface EnrichedListing extends Listing {
  sellerProfile?: Profile | null;
  visibilityTier: 1 | 2 | 3;
}

const MarketplacePage = () => {
  useSEO({ title: "سوق الفرص", description: "استعرض فرص تقبيل المشاريع التجارية المتاحة", canonical: "/marketplace" });
  const { data: listings = [], isLoading: listingsLoading } = usePublishedListingsQuery();
  const { data: profiles = [], isLoading: profilesLoading } = useAllProfilesQuery();
  const { getLikesAndViews, toggleLike } = useListingSocial();
  const { user } = useAuthContext();
  const isMobile = useIsMobile();
  const loading = listingsLoading || profilesLoading;
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [compareItems, setCompareItems] = useState<CompareItem[]>([]);
  const [similarActivities, setSimilarActivities] = useState<string[]>([]);

  // Social data
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [userLikedIds, setUserLikedIds] = useState<Set<string>>(new Set());

  // Load social data when listings change
  useEffect(() => {
    if (listings.length > 0) {
      const ids = listings.map(l => l.id);
      getLikesAndViews(ids).then(({ likes, views, userLikes }) => {
        setLikeCounts(likes);
        setViewCounts(views);
        setUserLikedIds(userLikes);
      });
    }
  }, [listings, getLikesAndViews]);

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

  const handleToggleLike = useCallback(async (listingId: string) => {
    if (!user) {
      toast.error("سجّل دخولك أولاً للإعجاب");
      return;
    }
    const liked = await toggleLike(listingId);
    setUserLikedIds(prev => {
      const next = new Set(prev);
      if (liked) next.add(listingId); else next.delete(listingId);
      return next;
    });
    setLikeCounts(prev => ({
      ...prev,
      [listingId]: (prev[listingId] || 0) + (liked ? 1 : -1),
    }));
  }, [user, toggleLike]);

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
      // Hide simulation listings if filter is on
      if (filters.hideSimulation && hasSimulationPhotos(l.photos as Record<string, unknown>)) return false;
      if (filters.city === "📍 بالقرب مني" && filters.nearbyCities?.length) {
        if (!filters.nearbyCities.includes(l.city || "")) return false;
      } else if (filters.city !== "الكل" && filters.city !== "📍 بالقرب مني" && l.city !== filters.city) return false;
      if (filters.activity !== "الكل" && l.category !== filters.activity && !l.business_activity?.includes(filters.activity)) return false;
      if (filters.dealType !== "الكل") {
        const dt = l.primary_deal_type || l.deal_type || "";
        if (!dt.includes(filters.dealType)) return false;
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

  // Pagination
  const pagination = usePagination(filtered, 12);

  // Reset pagination when filters change
  useEffect(() => {
    pagination.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Similar results
  const similarResults = useMemo(() => {
    if (similarActivities.length === 0 || filters.activity === "الكل") return [];
    return enrichedListings.filter(l => {
      if (l.category === filters.activity || l.business_activity?.includes(filters.activity)) return false;
      const matchesSimilar = similarActivities.some(sa => l.category === sa || l.business_activity?.includes(sa));
      if (!matchesSimilar) return false;
      if (filters.city === "📍 بالقرب مني" && filters.nearbyCities?.length) {
        if (!filters.nearbyCities.includes(l.city || "")) return false;
      } else if (filters.city !== "الكل" && filters.city !== "📍 بالقرب مني" && l.city !== filters.city) return false;
      if (filters.dealType !== "الكل") {
        const dt = l.primary_deal_type || l.deal_type || "";
        if (!dt.includes(filters.dealType)) return false;
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

  const isOnline = useCallback((profile?: Profile | null) => {
    if (!profile?.last_activity) return false;
    const diff = Date.now() - new Date(profile.last_activity).getTime();
    return diff < 15 * 60 * 1000;
  }, []);

  // Generate pagination page numbers
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const total = pagination.totalPages;
    const current = pagination.currentPage;
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push("ellipsis");
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) pages.push("ellipsis");
      pages.push(total);
    }
    return pages;
  };

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
          </div>
        </div>

        <MarketplaceTicker />
        <OpportunityHeatmap />

        {isMobile && <SmartSearchBar onApplyFilters={handleSmartSearch} resultCount={filtered.length} />}

        <div className="flex gap-6">
          {!isMobile && (
            <aside className="w-72 shrink-0">
              <div className="sticky top-[68px] flex flex-col gap-4">
                <SmartSearchBar onApplyFilters={handleSmartSearch} resultCount={filtered.length} />
                <div className="bg-card rounded-2xl p-4 shadow-soft">
                  <MarketplaceFilters filters={filters} onChange={setFilters} resultCount={filtered.length} />
                </div>
              </div>
            </aside>
          )}

          <div className="flex-1 min-w-0 space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl shadow-soft overflow-hidden animate-pulse">
                    <div className="h-40 bg-muted" />
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-muted" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                      <div className="flex justify-between pt-2 border-t border-border/10">
                        <div className="h-3 w-16 bg-muted rounded" />
                        <div className="h-3 w-12 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 && similarResults.length === 0 ? (
              <div className="text-center py-16">
                <AiStar size={32} className="mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة</p>
              </div>
            ) : (
              <>
                {/* Results count */}
                {filtered.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>عرض {pagination.startIndex}–{pagination.endIndex} من {pagination.totalItems} نتيجة</span>
                  </div>
                )}

                {filtered.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pagination.paginatedItems.map(listing => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        isComparing={compareIds.has(listing.id)}
                        onToggleCompare={() => toggleCompare(listing)}
                        likeCount={likeCounts[listing.id] || 0}
                        viewCount={viewCounts[listing.id] || 0}
                        isLiked={userLikedIds.has(listing.id)}
                        onToggleLike={() => handleToggleLike(listing.id)}
                        isOnline={isOnline(listing.sellerProfile)}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <Pagination className="mt-6">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => pagination.prevPage()}
                          className={cn(!pagination.hasPrevPage && "pointer-events-none opacity-50", "cursor-pointer")}
                        />
                      </PaginationItem>
                      {getPageNumbers().map((page, idx) => (
                        <PaginationItem key={idx}>
                          {page === "ellipsis" ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              isActive={page === pagination.currentPage}
                              onClick={() => pagination.goToPage(page)}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => pagination.nextPage()}
                          className={cn(!pagination.hasNextPage && "pointer-events-none opacity-50", "cursor-pointer")}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}

                {filtered.length === 0 && similarResults.length > 0 && (
                  <div className="text-center py-8">
                    <AiStar size={28} className="mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة تماماً لبحثك</p>
                  </div>
                )}

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
                          likeCount={likeCounts[listing.id] || 0}
                          viewCount={viewCounts[listing.id] || 0}
                          isLiked={userLikedIds.has(listing.id)}
                          onToggleLike={() => handleToggleLike(listing.id)}
                          isOnline={isOnline(listing.sellerProfile)}
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

      <ComparePanel items={compareItems} onRemove={removeCompare} onClear={clearCompare} />
    </div>
  );
};



const ListingCard = memo(({ listing, isComparing, onToggleCompare, likeCount, viewCount, isLiked, onToggleLike, isOnline }: {
  listing: EnrichedListing;
  isComparing: boolean;
  onToggleCompare: () => void;
  likeCount: number;
  viewCount: number;
  isLiked: boolean;
  onToggleLike: () => void;
  isOnline: boolean;
}) => {
  const seller = listing.sellerProfile;
  const badges = seller ? getSellerBadges(seller) : [];

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/listing/${listing.id}`;
    const title = listing.title || listing.business_activity || "فرصة تقبيل";
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("تم نسخ الرابط");
      }
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        toast.success("تم نسخ الرابط");
      } catch {
        toast.error("لم يتم نسخ الرابط، انسخه يدوياً");
      }
    }
  };

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
      {listing.featured && (
        <div className="absolute top-2 left-2 z-10 bg-amber-500/90 text-white text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1">
          ★ مميز
        </div>
      )}

      <Link to={`/listing/${listing.id}`}>
        <div className="h-40 bg-gradient-to-br from-primary/5 to-accent/30 flex items-center justify-center relative">
          {(() => {
            const orderedPhotos = getOrderedPhotos(listing.photos as Record<string, string[]>);
            return orderedPhotos.length > 0 ? (
              <>
                <img src={orderedPhotos[0]} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                {hasSimulationPhotos(listing.photos as Record<string, unknown>) && <SimulationOverlay size="sm" />}
              </>
            ) : (
              <Eye size={24} className="text-muted-foreground/30" strokeWidth={1} />
            );
          })()}
        </div>
        <div className="p-4">
          {seller && (
            <Link to={`/seller/${seller.user_id}`} onClick={e => e.stopPropagation()} className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-semibold text-primary shrink-0">
                  {seller.full_name?.charAt(0) || "?"}
                </div>
                <span className="text-[11px] text-foreground font-medium truncate max-w-[120px]">{seller.full_name || "بائع"}</span>
                <VerifiedSellerBadge userId={seller.user_id} size="sm" />
                <TrustBadge score={seller.trust_score} verificationLevel={seller.verification_level} size="sm" showScore showBadges badges={badges.slice(0, 2)} />
              </div>
              <div className="flex items-center gap-1" title={isOnline ? "متواجد الآن" : "غير متواجد"}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isOnline ? "bg-emerald-500" : "bg-red-400"
                )} />
                <span className="text-[8px] text-muted-foreground/70">
                  {isOnline ? "متواجد" : "غير متواجد"}
                </span>
              </div>
            </Link>
          )}

          <div className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
            {listing.title || listing.business_activity || "فرصة تقبيل"}
          </div>
          <div className="text-[10px] text-muted-foreground mb-1">
            {getArabicDealType(listing.primary_deal_type || listing.deal_type)}
          </div>
          {listing.location_lat && listing.location_lng ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps?q=${listing.location_lat},${listing.location_lng}`, '_blank', 'noopener,noreferrer'); }}
              className="flex items-center gap-1 text-xs text-primary hover:underline mb-2 cursor-pointer bg-transparent border-none p-0"
            >
              <MapPin size={12} strokeWidth={1.3} />
              {listing.district && `${listing.district}, `}{listing.city || "—"}
            </button>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin size={12} strokeWidth={1.3} />
              {listing.district && `${listing.district}, `}{listing.city || "—"}
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-primary">
              {listing.price ? <PriceDisplay amount={Number(listing.price)} size={10} /> : "—"}
            </span>
            {(() => {
              const tr = calculateTransparency(listing);
              const badgeColor = tr.score >= 80 ? "text-success" : tr.score >= 60 ? "text-yellow-600 dark:text-yellow-400" : tr.score >= 40 ? "text-orange-600 dark:text-orange-400" : "text-destructive";
              const barColor = tr.score >= 80 ? "bg-success" : tr.score >= 60 ? "bg-yellow-500" : tr.score >= 40 ? "bg-orange-500" : "bg-destructive";
              const badgeLabel = tr.score >= 80 ? "✓ موثوق" : tr.score >= 60 ? "⚠ متوسط" : tr.score >= 40 ? "⚠ ضعيف" : "✗ ناقص";
              return (
                <div className="flex items-center gap-1.5" title={`شفافية الإعلان: ${tr.score}%`}>
                  <span className={cn("text-[9px] font-semibold", badgeColor)}>{badgeLabel}</span>
                  <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", barColor)} style={{ width: `${tr.score}%` }} />
                  </div>
                  <span className={cn("text-[9px] tabular-nums", badgeColor)}>{tr.score}%</span>
                </div>
              );
            })()}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-muted-foreground/60">
                <Eye size={10} strokeWidth={1.3} />
                <span className="text-[10px] tabular-nums">{viewCount}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground/60">
                <Heart size={10} strokeWidth={1.3} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-red-400" : ""} />
                <span className="text-[10px] tabular-nums">{likeCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare(); }}
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center transition-all",
                  isComparing ? "text-primary" : "text-muted-foreground/50 hover:text-primary"
                )}
                title={isComparing ? "إزالة من المقارنة" : "مقارنة"}
              >
                {isComparing ? <Check size={10} strokeWidth={2} /> : <GitCompareArrows size={10} strokeWidth={1.5} />}
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleLike(); }}
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center transition-all",
                  isLiked ? "text-red-500" : "text-muted-foreground/50 hover:text-red-500"
                )}
                title="إعجاب"
              >
                <Heart size={10} strokeWidth={1.5} fill={isLiked ? "currentColor" : "none"} />
              </button>
              <button
                onClick={handleShare}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-all"
                title="مشاركة"
              >
                <Share2 size={10} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
});

export default MarketplacePage;
