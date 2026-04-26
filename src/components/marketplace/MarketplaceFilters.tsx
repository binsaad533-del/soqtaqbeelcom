import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { MapPin, RotateCcw, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { requestGeolocation, findNearestCity, getNearbyCities } from "@/lib/saudiCities";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";

// dbValue stays Arabic (DB stored value). id used in React. labelKey -> i18n.
const DEAL_TYPES = [
  { id: "all", dbValue: "الكل", labelKey: "marketplace.filters.dealTypes.all" },
  { id: "full_takeover", dbValue: "تقبيل كامل", labelKey: "marketplace.filters.dealTypes.fullTakeover" },
  { id: "transfer_no_liabilities", dbValue: "تقبيل نقل أعمال بدون التزامات سابقة", labelKey: "marketplace.filters.dealTypes.transferNoLiabilities" },
  { id: "assets_setup", dbValue: "تقبيل أصول + تجهيز تشغيلي (بدون سجل تجاري)", labelKey: "marketplace.filters.dealTypes.assetsSetup" },
  { id: "assets_only", dbValue: "تقبيل أصول فقط", labelKey: "marketplace.filters.dealTypes.assetsOnly" },
];

const NEAR_ME_VALUE = "📍 بالقرب مني";

const CITIES = [
  { dbValue: "الكل", labelKey: "marketplace.filters.dealTypes.all" },
  { dbValue: NEAR_ME_VALUE, labelKey: "marketplace.filters.nearbyOption" },
  { dbValue: "الرياض", labelKey: "marketplace.filters.cities.riyadh" },
  { dbValue: "جدة", labelKey: "marketplace.filters.cities.jeddah" },
  { dbValue: "الدمام", labelKey: "marketplace.filters.cities.dammam" },
  { dbValue: "مكة", labelKey: "marketplace.filters.cities.makkah" },
  { dbValue: "المدينة", labelKey: "marketplace.filters.cities.madinah" },
];

const ACTIVITIES = [
  { dbValue: "الكل", labelKey: "marketplace.filters.dealTypes.all" },
  { dbValue: "مطاعم", labelKey: "marketplace.filters.industries.restaurants" },
  { dbValue: "كافيهات", labelKey: "marketplace.filters.industries.cafes" },
  { dbValue: "صالونات", labelKey: "marketplace.filters.industries.salons" },
  { dbValue: "ورش", labelKey: "marketplace.filters.industries.workshops" },
  { dbValue: "محلات", labelKey: "marketplace.filters.industries.shops" },
  { dbValue: "بقالات", labelKey: "marketplace.filters.industries.groceries" },
  { dbValue: "مكاتب", labelKey: "marketplace.filters.industries.offices" },
  { dbValue: "مستودعات", labelKey: "marketplace.filters.industries.warehouses" },
  { dbValue: "صيدليات", labelKey: "marketplace.filters.industries.pharmacies" },
  { dbValue: "مغاسل", labelKey: "marketplace.filters.industries.laundries" },
  { dbValue: "مخابز", labelKey: "marketplace.filters.industries.bakeries" },
];

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
  const { t } = useTranslation();
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
      onChange({ ...filters, city: NEAR_ME_VALUE, nearbyCities: nearby.length > 0 ? nearby : [nearest.name] });
      toast.success(t("marketplace.geoSuccessToast", { city: nearest.name }));
    } catch (err: unknown) {
      const geoErr = err as GeolocationPositionError;
      if (geoErr?.code === 1) {
        toast.error(t("marketplace.geoPermissionToast"));
      } else {
        toast.error(t("marketplace.geoFailedToast"));
      }
    } finally {
      setGeoLoading(false);
    }
  }, [filters, onChange, t]);

  const handleCityClick = useCallback((dbValue: string) => {
    if (dbValue === NEAR_ME_VALUE) {
      handleNearMe();
    } else {
      onChange({ ...filters, city: dbValue, nearbyCities: undefined });
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

  const filteredCities = useMemo(() => {
    if (!citySearch) return CITIES;
    return CITIES.filter(c => c.dbValue !== "الكل" && (c.dbValue.includes(citySearch) || t(c.labelKey).includes(citySearch)));
  }, [citySearch, t]);

  const visibleActivities = showAllActivities ? ACTIVITIES : ACTIVITIES.slice(0, INITIAL_ACTIVITIES_SHOWN);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{resultCount}</span> {t("marketplace.available")}
        </p>
        {!isDefault && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw size={12} />
            {t("marketplace.reset")}
          </button>
        )}
      </div>

      {/* Deal Type Tabs */}
      <Section label={t("marketplace.dealType")}>
        <div className="flex flex-col gap-1.5">
          {DEAL_TYPES.map(dt => (
            <TabChip
              key={dt.id}
              active={filters.dealType === dt.dbValue}
              onClick={() => set("dealType", dt.dbValue)}
            >
              {t(dt.labelKey)}
            </TabChip>
          ))}
        </div>
      </Section>

      {/* City */}
      <Section label={t("marketplace.city")}>
        <div className="relative mb-2">
          <MapPin size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.3} />
          <input
            value={citySearch}
            onChange={e => setCitySearch(e.target.value)}
            placeholder={t("marketplace.searchCity")}
            className="w-full pr-8 pl-3 py-1.5 rounded-lg border border-border/40 bg-background text-xs focus:outline-none focus:border-primary/30"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filteredCities.map(c => (
            <Chip key={c.dbValue} active={filters.city === c.dbValue} onClick={() => handleCityClick(c.dbValue)}>
              {c.dbValue === NEAR_ME_VALUE && geoLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" />
                  {t("marketplace.locating")}
                </span>
              ) : c.dbValue === NEAR_ME_VALUE && filters.city === c.dbValue && filters.nearbyCities?.length ? (
                <span>📍 {filters.nearbyCities[0]}</span>
              ) : (
                t(c.labelKey)
              )}
            </Chip>
          ))}
        </div>
      </Section>

      {/* Activity */}
      <Section label={t("marketplace.activity")}>
        <div className="flex flex-wrap gap-1.5">
          {visibleActivities.map(a => (
            <Chip key={a.dbValue} active={filters.activity === a.dbValue} onClick={() => set("activity", a.dbValue)}>
              {t(a.labelKey)}
            </Chip>
          ))}
          {ACTIVITIES.length > INITIAL_ACTIVITIES_SHOWN && (
            <button
              onClick={() => setShowAllActivities(v => !v)}
              className="flex items-center gap-0.5 text-[11px] text-primary hover:text-primary/80 transition-colors px-2 py-1"
            >
              {showAllActivities ? (
                <>{t("marketplace.showLess")} <ChevronUp size={12} /></>
              ) : (
                <>{t("marketplace.showMore")} <ChevronDown size={12} /></>
              )}
            </button>
          )}
        </div>
      </Section>

      {/* Price Range */}
      <Section label={t("marketplace.price")}>
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

      <label htmlFor="hide-sim" className="flex items-center gap-2 pt-3 mt-1 border-t border-border/30 cursor-pointer select-none group">
        <Switch
          id="hide-sim"
          dir="ltr"
          checked={filters.hideSimulation ?? false}
          onCheckedChange={(checked) => onChange({ ...filters, hideSimulation: checked })}
          className="h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
        />
        <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
          {t("marketplace.hideSimulation")}
        </span>
      </label>
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
