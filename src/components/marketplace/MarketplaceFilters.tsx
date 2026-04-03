import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Search, MapPin, RotateCcw, ChevronDown, ChevronUp, Loader2, EyeOff } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { requestGeolocation, findNearestCity, getNearbyCities } from "@/lib/saudiCities";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";

const dealTypes = [
  { id: "الكل", label: "الكل" },
  { id: "full_takeover", label: "تقبيل كامل" },
  { id: "transfer_no_liabilities", label: "تقبيل نقل أعمال بدون التزامات سابقة" },
  { id: "assets_setup", label: "تقبيل أصول + تجهيز تشغيلي (بدون سجل تجاري)" },
  { id: "assets_only", label: "تقبيل أصول فقط" },
];

const cities = ["الكل", "📍 بالقرب مني", "الرياض", "جدة", "الدمام", "مكة", "المدينة"];

const activities = ["الكل", "مطاعم", "كافيهات", "صالونات", "ورش", "محلات", "بقالات", "مكاتب", "مستودعات", "صيدليات", "مغاسل", "مخابز"];
const INITIAL_ACTIVITIES_SHOWN = 5;

export interface FilterState {
  dealType: string;
  city: string;
  activity: string;
  priceRange: [number, number];
  search: string;
  nearbyCities?: string[];
  hideSimulation?: boolean;
}

const defaultFilters: FilterState = {
  dealType: "الكل",
  city: "الكل",
  activity: "الكل",
  priceRange: [0, 3000000],
  search: "",
  hideSimulation: false,
};

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  resultCount: number;
}

export { defaultFilters };

const MarketplaceFilters = ({ filters, onChange, resultCount }: Props) => {
  const [citySearch, setCitySearch] = useState("");
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const set = <K extends keyof FilterState>(key: K, val: FilterState[K]) =>
    onChange({ ...filters, [key]: val });

  const handleNearMe = useCallback(async () => {
    setGeoLoading(true);
    try {
      const pos = await requestGeolocation();
      const { latitude, longitude } = pos.coords;
      const nearest = findNearestCity(latitude, longitude);
      const nearby = getNearbyCities(latitude, longitude, 150);
      onChange({ ...filters, city: "📍 بالقرب مني", nearbyCities: nearby.length > 0 ? nearby : [nearest.name] });
      toast.success(`📍 تم تحديد موقعك بالقرب من ${nearest.name}`);
    } catch (err: unknown) {
      const geoErr = err as GeolocationPositionError;
      if (geoErr?.code === 1) {
        toast.error("يرجى السماح بالوصول إلى الموقع من إعدادات المتصفح");
      } else {
        toast.error("تعذر تحديد موقعك، حاول مرة أخرى");
      }
    } finally {
      setGeoLoading(false);
    }
  }, [filters, onChange]);

  const handleCityClick = useCallback((city: string) => {
    if (city === "📍 بالقرب مني") {
      handleNearMe();
    } else {
      onChange({ ...filters, city, nearbyCities: undefined });
    }
  }, [handleNearMe, filters, onChange]);

  const reset = () => onChange({ ...defaultFilters });

  const isDefault =
    filters.dealType === "الكل" &&
    filters.city === "الكل" &&
    filters.activity === "الكل" &&
    filters.priceRange[0] === 0 &&
    filters.priceRange[1] === 3000000 &&
    filters.search === "";

  const filteredCities = citySearch
    ? cities.filter(c => c !== "الكل" && c.includes(citySearch))
    : cities;

  const visibleActivities = showAllActivities
    ? activities
    : activities.slice(0, INITIAL_ACTIVITIES_SHOWN);

  return (
    <div className="space-y-5">
      {/* Result count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{resultCount}</span> مشروع متاح
        </p>
        {!isDefault && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw size={12} />
            إعادة تعيين
          </button>
        )}
      </div>


      {/* Deal Type Tabs */}
      <Section label="نوع العملية">
        <div className="flex flex-col gap-1.5">
          {dealTypes.map(dt => (
            <TabChip
              key={dt.id}
              active={filters.dealType === dt.id}
              onClick={() => set("dealType", dt.id)}
            >
              {dt.label}
            </TabChip>
          ))}
        </div>
      </Section>

      {/* City */}
      <Section label="المدينة">
        <div className="relative mb-2">
          <MapPin size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.3} />
          <input
            value={citySearch}
            onChange={e => setCitySearch(e.target.value)}
            placeholder="ابحث عن مدينة..."
            className="w-full pr-8 pl-3 py-1.5 rounded-lg border border-border/40 bg-background text-xs focus:outline-none focus:border-primary/30"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filteredCities.map(c => (
            <Chip key={c} active={filters.city === c} onClick={() => handleCityClick(c)}>
              {c === "📍 بالقرب مني" && geoLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" />
                  جاري التحديد...
                </span>
              ) : c === "📍 بالقرب مني" && filters.city === c && filters.nearbyCities?.length ? (
                <span>📍 {filters.nearbyCities[0]}</span>
              ) : (
                c
              )}
            </Chip>
          ))}
        </div>
      </Section>

      {/* Activity */}
      <Section label="النشاط">
        <div className="flex flex-wrap gap-1.5">
          {visibleActivities.map(a => (
            <Chip key={a} active={filters.activity === a} onClick={() => set("activity", a)}>
              {a}
            </Chip>
          ))}
          {activities.length > INITIAL_ACTIVITIES_SHOWN && (
            <button
              onClick={() => setShowAllActivities(v => !v)}
              className="flex items-center gap-0.5 text-[11px] text-primary hover:text-primary/80 transition-colors px-2 py-1"
            >
              {showAllActivities ? (
                <>أقل <ChevronUp size={12} /></>
              ) : (
                <>المزيد <ChevronDown size={12} /></>
              )}
            </button>
          )}
        </div>
      </Section>

      {/* Price Range */}
      <Section label="السعر">
        <div className="px-1">
          <Slider
            min={0}
            max={3000000}
            step={50000}
            value={filters.priceRange}
            onValueChange={(v) => set("priceRange", v as [number, number])}
            className="my-2"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
            <span>{filters.priceRange[0].toLocaleString()} <SarSymbol size={8} /></span>
            <span>{filters.priceRange[1].toLocaleString()} <SarSymbol size={8} /></span>
          </div>
        </div>
      </Section>

      {/* Hide simulation toggle */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">إخفاء الإعلانات التجريبية</span>
        <button
          dir="ltr"
          onClick={() => onChange({ ...filters, hideSimulation: !filters.hideSimulation })}
          className={cn(
            "w-9 h-5 rounded-full transition-colors relative",
            filters.hideSimulation ? "bg-primary" : "bg-muted"
          )}
        >
          <span className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
            filters.hideSimulation ? "translate-x-4" : "translate-x-0.5"
          )} />
        </button>
      </div>
    </div>
  );
};

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
    {children}
  </div>
);

const TabChip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "text-xs px-3.5 py-2 rounded-lg text-right transition-all font-medium w-full",
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted/50 text-muted-foreground hover:bg-muted"
    )}
  >
    {children}
  </button>
);

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-all",
      active
        ? "bg-primary/10 text-primary font-medium"
        : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
    )}
  >
    {children}
  </button>
);

export default MarketplaceFilters;
