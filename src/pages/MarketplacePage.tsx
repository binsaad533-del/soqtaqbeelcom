import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useListings, type Listing } from "@/hooks/useListings";
import { cn } from "@/lib/utils";
import AiStar from "@/components/AiStar";
import { Search, MapPin, Eye } from "lucide-react";

const categories = ["الكل", "مطاعم", "كافيهات", "صالونات", "بقالات", "محلات تجارية", "ورش", "مكاتب"];
const cities = ["الكل", "الرياض", "جدة", "الدمام", "مكة", "المدينة"];

const MarketplacePage = () => {
  const { getPublishedListings } = useListings();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("الكل");
  const [selectedCategory, setSelectedCategory] = useState("الكل");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getPublishedListings();
      setListings(data);
      setLoading(false);
    };
    load();
  }, [getPublishedListings]);

  const filtered = listings.filter(l => {
    if (selectedCity !== "الكل" && l.city !== selectedCity) return false;
    if (selectedCategory !== "الكل" && l.category !== selectedCategory && !l.business_activity?.includes(selectedCategory)) return false;
    if (search && !l.title?.includes(search) && !l.business_activity?.includes(search) && !l.city?.includes(search)) return false;
    return true;
  });

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-medium">سوق التقبّل</h1>
            <p className="text-sm text-muted-foreground">استعرض فرص التقبّل المتاحة</p>
          </div>
          <AiStar size={24} />
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
              <Link key={listing.id} to={`/listing/${listing.id}`} className="bg-card rounded-2xl shadow-soft hover:shadow-soft-hover transition-all overflow-hidden group">
                <div className="h-40 bg-gradient-to-br from-primary/5 to-accent/30 flex items-center justify-center">
                  {listing.photos && Object.values(listing.photos).flat().length > 0 ? (
                    <img src={(Object.values(listing.photos).flat() as string[])[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Eye size={24} className="text-muted-foreground/30" strokeWidth={1} />
                  )}
                </div>
                <div className="p-4">
                  <div className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">{listing.title || listing.business_activity || "فرصة تقبّل"}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <MapPin size={12} strokeWidth={1.3} />
                    {listing.district && `${listing.district}, `}{listing.city || "—"}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">{listing.price ? `${Number(listing.price).toLocaleString()} ر.س` : "—"}</span>
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
            ))}
          </div>
        )}
      </div>
    </div>
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
