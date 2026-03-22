import { Link } from "react-router-dom";
import { MapPin, Building2, Tag, ChevronLeft } from "lucide-react";
import AiStar from "@/components/AiStar";
import { useState } from "react";

const categories = ["الكل", "مطاعم", "كافيهات", "صالونات", "محلات تجارية", "ورش", "مكاتب", "بقالات"];
const cities = ["الكل", "الرياض", "جدة", "الدمام", "مكة", "المدينة", "أبها", "تبوك", "الخبر"];
const dealTypes = ["الكل", "تقبّل كامل", "أصول فقط", "مع السجل التجاري", "مع الاسم التجاري"];

interface Listing {
  id: string;
  title: string;
  category: string;
  city: string;
  district: string;
  price: number;
  dealType: string;
  disclosureScore: number;
  imageUrl: string;
  aiScore: string;
}

const mockListings: Listing[] = [
  { id: "1", title: "مطعم شاورما مجهّز بالكامل", category: "مطاعم", city: "الرياض", district: "حي النسيم", price: 180000, dealType: "تقبّل كامل", disclosureScore: 92, imageUrl: "", aiScore: "فرصة واعدة" },
  { id: "2", title: "كافيه متخصص في القهوة المختصة", category: "كافيهات", city: "جدة", district: "حي الروضة", price: 250000, dealType: "مع الاسم التجاري", disclosureScore: 87, imageUrl: "", aiScore: "مقبولة بحذر" },
  { id: "3", title: "صالون رجالي بموقع مميز", category: "صالونات", city: "الدمام", district: "حي الفيصلية", price: 95000, dealType: "أصول فقط", disclosureScore: 78, imageUrl: "", aiScore: "فرصة واعدة" },
  { id: "4", title: "بقالة في حي سكني كثيف", category: "بقالات", city: "الرياض", district: "حي الملقا", price: 120000, dealType: "تقبّل كامل", disclosureScore: 95, imageUrl: "", aiScore: "جذابة إذا أُعيد هيكلتها" },
  { id: "5", title: "ورشة صيانة سيارات", category: "ورش", city: "جدة", district: "حي الصفا", price: 320000, dealType: "مع السجل التجاري", disclosureScore: 68, imageUrl: "", aiScore: "مبالغ في السعر" },
  { id: "6", title: "مكتب عقاري مرخّص", category: "مكاتب", city: "مكة", district: "حي العزيزية", price: 85000, dealType: "تقبّل كامل", disclosureScore: 90, imageUrl: "", aiScore: "مقبولة بحذر" },
];

const MarketplacePage = () => {
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [selectedCity, setSelectedCity] = useState("الكل");
  const [selectedDealType, setSelectedDealType] = useState("الكل");

  const filtered = mockListings.filter((l) => {
    if (selectedCategory !== "الكل" && l.category !== selectedCategory) return false;
    if (selectedCity !== "الكل" && l.city !== selectedCity) return false;
    if (selectedDealType !== "الكل" && l.dealType !== selectedDealType) return false;
    return true;
  });

  return (
    <div className="py-8">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium mb-2">سوق الفرص</h1>
          <p className="text-muted-foreground text-sm">تصفّح فرص تقبّل الأعمال المتاحة في السعودية</p>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-8">
          <FilterRow label="النشاط" options={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
          <FilterRow label="المدينة" options={cities} selected={selectedCity} onSelect={setSelectedCity} />
          <FilterRow label="نوع الصفقة" options={dealTypes} selected={selectedDealType} onSelect={setSelectedDealType} />
        </div>

        {/* Results */}
        <div className="text-sm text-muted-foreground mb-4">{filtered.length} فرصة</div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <AiStar size={36} className="justify-center mb-4" />
            <p className="text-muted-foreground">لا توجد فرص مطابقة — جرّب تغيير الفلاتر</p>
          </div>
        )}
      </div>
    </div>
  );
};

const FilterRow = ({ label, options, selected, onSelect }: { label: string; options: string[]; selected: string; onSelect: (v: string) => void }) => (
  <div className="flex items-center gap-3 overflow-x-auto pb-1">
    <span className="text-sm text-muted-foreground whitespace-nowrap min-w-[60px]">{label}</span>
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all active:scale-[0.97] ${
            selected === opt
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-card text-muted-foreground border border-border/50 hover:border-border"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const ListingCard = ({ listing }: { listing: Listing }) => (
  <Link
    to={`/listing/${listing.id}`}
    className="group bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-300"
  >
    {/* Placeholder image */}
    <div className="h-40 gradient-hero relative flex items-center justify-center">
      <Building2 size={32} strokeWidth={1} className="text-muted-foreground/30" />
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-lg px-2.5 py-1">
        <AiStar size={14} animate={false} />
        <span className="text-xs text-accent-foreground">{listing.aiScore}</span>
      </div>
    </div>
    <div className="p-5">
      <h3 className="font-medium mb-2 group-hover:text-primary transition-colors">{listing.title}</h3>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
        <MapPin size={14} strokeWidth={1.3} />
        <span>{listing.city} — {listing.district}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Tag size={14} strokeWidth={1.3} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{listing.dealType}</span>
        </div>
        <span className="text-sm font-medium">{listing.price.toLocaleString("en-US")} ر.س</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full gradient-primary" style={{ width: `${listing.disclosureScore}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">إفصاح {listing.disclosureScore}%</span>
        </div>
        <ChevronLeft size={16} strokeWidth={1.3} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  </Link>
);

export default MarketplacePage;
