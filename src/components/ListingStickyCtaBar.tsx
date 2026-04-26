import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, MessageCircle, Wallet, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ListingOfferForm from "@/components/ListingOfferForm";
import type { Listing } from "@/hooks/useListings";
import { cn } from "@/lib/utils";

interface ListingStickyCtaBarProps {
  listing: Listing;
  isOwner: boolean;
  isSimulation: boolean;
  myActiveDeal: any;
  startingDeal: boolean;
  onStartNegotiation: () => void;
}

const SHOW_THRESHOLD = 300;
const HIDE_NEAR_FOOTER = 200;

export default function ListingStickyCtaBar({
  listing,
  isOwner,
  isSimulation,
  myActiveDeal,
  startingDeal,
  onStartNegotiation,
}: ListingStickyCtaBarProps) {
  const [visible, setVisible] = useState(false);
  const [offerSheetOpen, setOfferSheetOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOwner) return; // لا حاجة للاستماع لو المالك

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const distanceFromBottom = docHeight - (scrollY + viewportHeight);

        const shouldShow = scrollY >= SHOW_THRESHOLD && distanceFromBottom > HIDE_NEAR_FOOTER;
        setVisible(shouldShow);
        ticking = false;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOwner]);

  // ─── الحالات التي لا يظهر فيها الشريط إطلاقاً ───
  if (isOwner) return null;
  if (!visible) return null;

  const price = listing.price ? Number(listing.price).toLocaleString("en-US") : null;
  const activity = listing.business_activity || listing.title || t("listingDetails.opportunityFallback");

  // ─── تحديد الأزرار حسب الحالة ───
  const renderActions = () => {
    if (isSimulation) {
      return (
        <Button
          onClick={onStartNegotiation}
          disabled={startingDeal}
          className="h-11 rounded-xl px-4 active:scale-[0.98] shrink-0"
        >
          {startingDeal ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} strokeWidth={1.5} />
          )}
          {t("listingDetails.tryOpportunity")}
        </Button>
      );
    }

    if (myActiveDeal) {
      return (
        <Button
          onClick={onStartNegotiation}
          disabled={startingDeal}
          variant="secondary"
          className="h-11 rounded-xl px-4 active:scale-[0.98] shrink-0"
        >
          <MessageCircle size={16} strokeWidth={1.5} />
          {t("listingDetails.continueNegotiation")}
        </Button>
      );
    }

    return (
      <div className="flex items-center gap-2 shrink-0">
        <Sheet open={offerSheetOpen} onOpenChange={setOfferSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="h-11 rounded-xl px-3 active:scale-[0.98]"
            >
              <Wallet size={16} strokeWidth={1.5} />
              {t("listing.makeOffer")}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
          >
            <SheetHeader className="text-right mb-4">
              <SheetTitle>{t("listingDetails.submitYourOffer")}</SheetTitle>
            </SheetHeader>
            <ListingOfferForm
              listingId={listing.id}
              listingPrice={listing.price}
              ownerId={listing.owner_id}
            />
          </SheetContent>
        </Sheet>

        <Button
          onClick={onStartNegotiation}
          disabled={startingDeal}
          className="h-11 rounded-xl px-4 active:scale-[0.98]"
        >
          {startingDeal ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Heart size={16} strokeWidth={1.5} />
          )}
          {t("listing.showInterest")}
        </Button>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 lg:hidden",
        "border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "rounded-t-2xl shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.1)]",
        "animate-in slide-in-from-bottom-4 duration-300",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      role="region"
      aria-label={t("listingDetails.quickActionsAria")}
      dir="rtl"
    >
      <div className="container flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          {price && (
            <div className="text-base font-bold text-foreground leading-tight">
              {price} ر.س
            </div>
          )}
          <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
            {activity}
          </div>
        </div>
        {renderActions()}
      </div>
    </div>
  );
}
