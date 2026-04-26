import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import MarketplaceFilters, { type FilterState } from "./MarketplaceFilters";

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  resultCount: number;
}

const MobileFilterSheet = ({ filters, onChange, resultCount }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterState>(filters);

  const handleOpen = (v: boolean) => {
    if (v) setDraft(filters);
    setOpen(v);
  };

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
          <SlidersHorizontal size={14} />
          {t("marketplace.filterCta")}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-24">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">{t("marketplace.filterTitle")}</SheetTitle>
        </SheetHeader>
        <MarketplaceFilters filters={draft} onChange={setDraft} resultCount={resultCount} />
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border/50">
          <Button onClick={apply} className="w-full rounded-xl">
            {t("marketplace.showResultsCta", { count: resultCount })}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFilterSheet;
