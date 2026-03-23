import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useListings, type Listing } from "@/hooks/useListings";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { cn } from "@/lib/utils";
import AiStar from "@/components/AiStar";
import TrustBadge, { getSellerBadges, getTrustLevel } from "@/components/TrustBadge";
import { Search, MapPin, Eye, ShieldCheck, AlertTriangle, TrendingUp } from "lucide-react";

const categories = ["الكل", "مطاعم", "كافيهات", "صالونات", "بقالات", "محلات تجارية", "ورش", "مكاتب"];
const cities = ["الكل", "الرياض", "جدة", "الدمام", "مكة", "المدينة"];

interface EnrichedListing extends Listing {
  sellerProfile?: Profile | null;
  visibilityTier: 1 | 2 | 3;
}

const MarketplacePage = () => {
  const { getPublishedListings } = useListings();
  const { getAllProfiles } = useProfiles();
  const [listings, setListings] = useState<Listing[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("الكل");
  const [selectedCategory, setSelectedCategory] = useState("الكل");

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

  // Enrich listings with seller profiles and visibility tiers, then sort
  const enrichedListings = useMemo((): EnrichedListing[] => {
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));

    return listings.map(listing => {
      const seller = profileMap.get(listing.owner_id);
      const trustScore = seller?.trust_score ?? 50;
      const isVerified = seller?.is_verified ?? false;

      // Calculate visibility tier client-side (mirrors DB function)
      let tier: 1 | 2 | 3 = 2;
      if (trustScore >= 70 && isVerified) tier = 1;
      if (trustScore < 50) tier = 3;

      return {
        ...listing,
        sellerProfile: seller || null,
        visibilityTier: tier,
      };
    });
  }, [listings, profiles]);

  const filtered = useMemo(() => {
    const result = enrichedListings.filter(l => {
      if (selectedCity !== "الكل" && l.city !== selectedCity) return false;
      if (selectedCategory !== "الكل" && l.category !== selectedCategory && !l.business_activity?.includes(selectedCategory)) return false;
      if (search && !l.title?.includes(search) && !l.business_activity?.includes(search) && !l.city?.includes(search)) return false;
      return true;
    });

    // Sort: Tier 1 first, then Tier 2, then Tier 3. Within tiers, sort by trust score desc
    result.sort((a, b) => {
      if (a.visibilityTier !== b.visibilityTier) return a.visibilityTier - b.visibilityTier;
      const scoreA = a.sellerProfile?.trust_score ?? 50;
      const scoreB = b.sellerProfile?.trust_score ?? 50;
      return scoreB - scoreA;
    });

    return result;
  }, [enrichedListings, selectedCity, selectedCategory, search]);

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-medium">سوق التقبيل</h1>
            <p className="text-sm text-muted-foreground">استعرض فرص التقبيل المتاحة</p>
          </div>
          <AiStar size={24} />
        </div>

        {/* Incentive message */}
        <div className="bg-primary/5 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2">
          <TrendingUp size={14} className="text-primary shrink-0" />
          <p className="text-[11px] text-muted-foreground">البائعون الملتزمون بالسداد والموثّقون يظهرون أولاً في النتائج</p>
        </div>

        <div className="relative mb-5">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.3} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن فرصة..." className="w-full pr-10 pl-4 py-3 rounded-xl border border-border/50 bg-card text-sm focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 shadow-soft" />
        </div>

        <div className="space-y-3 mb-6">
          <FilterRow label="المدينة" options={cities} selected={selectedCity} onSelect={setSelectedCity} />
          <FilterRow label="التصنيف" options={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        <p className="text-xs text-muted-foreground mb-4">{filtered.length} نتيجة</p>

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
  );
};

const ListingCard = ({ listing }: { listing: EnrichedListing }) => {
  const seller = listing.sellerProfile;
  const trustLevel = seller ? getTrustLevel(seller.trust_score) : null;
  const badges = seller ? getSellerBadges(seller) : [];
  const isTrusted = badges.includes("trusted_seller");

  return (
    <Link
      to={`/listing/${listing.id}`}
      className={cn(
        "bg-card rounded-2xl shadow-soft hover:shadow-soft-hover transition-all overflow-hidden group relative",
        listing.visibilityTier === 1 && "ring-1 ring-primary/10"
      )}
    >
      {/* Tier 1 boost indicator */}
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
          {listing.title || listing.business_activity || "فرصة تقبّل"}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin size={12} strokeWidth={1.3} />
          {listing.district && `${listing.district}, `}{listing.city || "—"}
        </div>

        {/* Seller trust info */}
        {seller && (
          <div className="mb-2">
            <TrustBadge
              score={seller.trust_score}
              verificationLevel={seller.verification_level}
              size="sm"
              showScore
              showBadges
              badges={badges.slice(0, 2)}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary">
            {listing.price ? `${Number(listing.price).toLocaleString()} ر.س` : "—"}
          </span>
          <div className="flex items-center gap-2">
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
      </div>
    </Link>
  );
};

const FilterRow = ({ label, options, selected, onSelect }: { label: string; options: string[]; selected: string; onSelect: (v: string) => void }) => (
  <div className="flex items-center gap-2 overflow-x-auto pb-1">
    <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
    {options.map(opt => (
      <button key={opt} onClick={() => onSelect(opt)} className={cn("text-xs px-3 py-1 rounded-lg whitespace-nowrap transition-all", selected === opt ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>{opt}</button>
    ))}
  </div>
);

export default MarketplacePage;
