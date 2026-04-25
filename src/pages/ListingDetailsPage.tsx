import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { safeJsonLd } from "@/lib/security";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MapPin, MessageCircle, Building2, Loader2, Check, AlertTriangle, Shield, Star, Edit3, ArrowLeft, Heart, Share2, Eye, CalendarCheck, MessageSquare, Users, Trash2, Pause, Play, Sparkles, ChevronDown, Wallet, Package } from "lucide-react";
import PromoteListingDialog from "@/components/PromoteListingDialog";
import { Textarea } from "@/components/ui/textarea";
import AiStar from "@/components/AiStar";
import ListingHealthReport from "@/components/ListingHealthReport";
import TrustBadge, { getSellerBadges } from "@/components/TrustBadge";
import VerifiedSellerBadge from "@/components/VerifiedSellerBadge";
import SellerReviewsSummary from "@/components/SellerReviewsSummary";
import SellerRatingDisplay from "@/components/SellerRatingDisplay";
import { Button } from "@/components/ui/button";
import DealCheckPanel from "@/components/DealCheckPanel";
import ListingStickyCtaBar from "@/components/ListingStickyCtaBar";
import FeasibilityStudyPanel from "@/components/FeasibilityStudyPanel";
import DealSimulationPanel from "@/components/DealSimulationPanel";
import { useAnalysisCache } from "@/hooks/useAnalysisCache";

import QuickPriceEdit from "@/components/QuickPriceEdit";
import ListingEditDialog from "@/components/ListingEditDialog";
import ListingOfferForm from "@/components/ListingOfferForm";
import SellerOffersPanel from "@/components/SellerOffersPanel";
import MoqbilAgentPanel from "@/components/MoqbilAgentPanel";
import ProtectedDocumentsPanel from "@/components/ProtectedDocumentsPanel";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useListings, type Listing } from "@/hooks/useListings";
import { useListingSocial } from "@/hooks/useListingSocial";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDeals } from "@/hooks/useDeals";
import { useProfiles } from "@/hooks/useProfiles";
import { useSellerReviews, type SellerReview } from "@/hooks/useSellerReviews";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/useSEO";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";
import PriceDisplay from "@/components/PriceDisplay";
import { DEAL_TYPE_MAP } from "@/lib/dealStructureConfig";
import { getArabicDealType } from "@/lib/translations";
import SimulationOverlay, { isSimulationImage, hasSimulationPhotos } from "@/components/SimulationOverlay";
import ReportListingDialog from "@/components/ReportListingDialog";
import { getOrderedPhotos } from "@/lib/photoOrdering";


type ListingDocumentItem = {
  id: string;
  label: string;
  url?: string;
  type?: string;
};

type ListingDetailsSnapshot = {
  listing: Listing | null;
  sellerProfile: any;
  sellerReviews: SellerReview[];
  myActiveDeal: any;
  isLiked: boolean;
  likeCount: number;
  viewCount: number;
  interestCount: number;
};

const listingDetailsStateCache = new Map<string, ListingDetailsSnapshot>();

const normalizeListingDocuments = (documents: unknown[]): ListingDocumentItem[] => {
  if (!Array.isArray(documents)) return [];

  return documents.flatMap((doc, groupIndex) => {
    if (typeof doc === "string") {
      return [{ id: `legacy-${groupIndex}`, label: `مستند ${groupIndex + 1}`, url: doc }];
    }

    if (!doc || typeof doc !== "object") return [];

    const record = doc as {
      name?: string;
      label?: string;
      url?: string;
      type?: string;
      files?: unknown;
      status?: string;
    };

    if (typeof record.url === "string") {
      return [{
        id: `single-${groupIndex}`,
        label: record.name || record.label || record.type || `مستند ${groupIndex + 1}`,
        url: record.url,
        type: record.type,
      }];
    }

    if (Array.isArray(record.files)) {
      const files = record.files.filter((file): file is string => typeof file === "string" && file.length > 0);

      return files.map((file, fileIndex) => ({
        id: `group-${groupIndex}-${fileIndex}`,
        label: files.length > 1
          ? `${record.type || record.name || record.label || "مستند"} ${fileIndex + 1}`
          : record.type || record.name || record.label || `مستند ${groupIndex + 1}`,
        url: file,
        type: record.type,
      }));
    }

    if (record.name || record.label) {
      return [{
        id: `meta-${groupIndex}`,
        label: record.name || record.label || `مستند ${groupIndex + 1}`,
        url: undefined,
        type: record.type,
      }];
    }

    return [];
  });
};

const ListingDetailsPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuthContext();
  const analysisCache = useAnalysisCache(id);
  const { recordView, toggleLike, getLikesAndViews } = useListingSocial();
  const { getListing, softDeleteListing, updateListing } = useListings();
  const { createDeal, getMyDeals } = useDeals();
  const { getProfile } = useProfiles();
  const { getSellerReviews } = useSellerReviews();
  const queryClient = useQueryClient();
  const cachedSnapshot = id ? listingDetailsStateCache.get(id) : undefined;
  const [listing, setListing] = useState<Listing | null>(() => cachedSnapshot?.listing ?? null);

  // Dynamic SEO with OG tags for smart social sharing
  const listingTitle = listing ? (listing.title || listing.business_activity || "فرصة تقبيل") : "تفاصيل الإعلان";
  const ogTitle = listing ? `${listingTitle} — ${listing.city || "السعودية"}` : "تفاصيل الإعلان";
  const ogDesc = listing
    ? `${listing.business_activity || "فرصة تقبيل"} في ${listing.city || "السعودية"}${listing.price ? ` بسعر ${Number(listing.price).toLocaleString("en-US")} ر.س` : ""} — تصفح التفاصيل وقدّم عرضك على سوق تقبيل`
    : "عرض تفاصيل فرصة تقبيل على سوق تقبيل";
  const ogPhotos = listing?.photos as Record<string, string[]> | null;
  const ogImage = ogPhotos ? (Object.values(ogPhotos).flat()[0] as string | undefined) : undefined;
  useSEO({
    title: ogTitle,
    description: ogDesc,
    ogImage: ogImage || undefined,
    canonical: `/listing/${id}`,
    type: "article",
  });

  const [sellerProfile, setSellerProfile] = useState<any>(() => cachedSnapshot?.sellerProfile ?? null);
  const [sellerReviews, setSellerReviews] = useState<SellerReview[]>(() => cachedSnapshot?.sellerReviews ?? []);
  const [loading, setLoading] = useState(() => !cachedSnapshot?.listing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startingDeal, setStartingDeal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [editDialogOpen, setEditDialogOpen] = useState(() => searchParams.get("edit") === "1");
  const [myActiveDeal, setMyActiveDeal] = useState<any>(() => cachedSnapshot?.myActiveDeal ?? null);
  const [isLiked, setIsLiked] = useState(() => cachedSnapshot?.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(() => cachedSnapshot?.likeCount ?? 0);
  const [viewCount, setViewCount] = useState(() => cachedSnapshot?.viewCount ?? 0);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [interestMessage, setInterestMessage] = useState("");
  const [wantsMeeting, setWantsMeeting] = useState<boolean | null>(null);
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [interestCount, setInterestCount] = useState(() => cachedSnapshot?.interestCount ?? 0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [statusToggling, setStatusToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const loadedIdRef = useRef<string | null>(cachedSnapshot?.listing?.id ?? null);

  const applyCachedSnapshot = useCallback((snapshot: ListingDetailsSnapshot) => {
    setListing(snapshot.listing);
    setSellerProfile(snapshot.sellerProfile);
    setSellerReviews(snapshot.sellerReviews);
    setMyActiveDeal(snapshot.myActiveDeal);
    setIsLiked(snapshot.isLiked);
    setLikeCount(snapshot.likeCount);
    setViewCount(snapshot.viewCount);
    setInterestCount(snapshot.interestCount);
    setLoadError(null);
    setLoading(false);
  }, []);

  const loadListing = useCallback(async (forceRefresh = false, signal?: AbortSignal) => {
    if (!id) return;

    const cachedState = !forceRefresh ? listingDetailsStateCache.get(id) : undefined;
    if (cachedState?.listing) {
      applyCachedSnapshot(cachedState);
      loadedIdRef.current = id;
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await getListing(id);
      if (signal?.aborted) return;
      setListing(data);
      loadedIdRef.current = id;
      if (data) {
        const [profile, reviews, social] = await Promise.all([
          getProfile(data.owner_id),
          getSellerReviews(data.owner_id),
          getLikesAndViews([data.id]),
        ]);
        if (signal?.aborted) return;
        const { count: dealCount } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("listing_id", data.id);
        if (signal?.aborted) return;
        setInterestCount(dealCount || 0);
        setSellerProfile(profile);
        setSellerReviews(reviews);
        setViewCount(social.views[data.id] || 0);
        setLikeCount(social.likes[data.id] || 0);
        setIsLiked(social.userLikes.has(data.id));
      }
    } catch (err: any) {
      if (signal?.aborted) return;
      console.error("[ListingDetails] Load failed:", { id, error: err?.message });
      setLoadError("فشل تحميل الإعلان — يرجى المحاولة مرة أخرى");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id || !listing) return;

    listingDetailsStateCache.set(id, {
      listing,
      sellerProfile,
      sellerReviews,
      myActiveDeal,
      isLiked,
      likeCount,
      viewCount,
      interestCount,
    });
  }, [id, listing, sellerProfile, sellerReviews, myActiveDeal, isLiked, likeCount, viewCount, interestCount]);

  useEffect(() => {
    const controller = new AbortController();
    const hasCachedSnapshot = Boolean(id && listingDetailsStateCache.get(id)?.listing);

    loadListing(false, controller.signal);

    if (id && !hasCachedSnapshot && loadedIdRef.current !== id) {
      recordView(id).catch(() => {});
    }
    if (user && id && !hasCachedSnapshot) {
      getMyDeals().then(deals => {
        if (controller.signal.aborted) return;
        const active = deals.find(d => d.listing_id === id && !["cancelled", "completed"].includes(d.status));
        setMyActiveDeal(active || null);
      });
    }

    return () => {
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const handleStartNegotiation = async () => {
    if (!user) { setShowAuthDialog(true); return; }
    if (!listing) return;
    if (user.id === listing.owner_id) {
      toast.error("لا يمكنك إبداء الاهتمام بإعلانك الخاص");
      return;
    }
    const myDeals = await getMyDeals();
    const existing = myDeals.find(d => d.listing_id === listing.id);
    if (existing) { navigate(`/negotiate/${existing.id}`); return; }
    setShowInterestForm(true);
  };

  const handleSubmitInterest = async () => {
    if (!listing || !user) return;
    setSubmittingInterest(true);
    try {
      const { data, error } = await createDeal(listing.id, listing.owner_id);
      if (error) {
        const msg = error?.message?.includes("Rate limit") ? "تم تجاوز الحد المسموح، حاول لاحقاً" : "حدث خطأ أثناء بدء التفاوض. يرجى إعادة المحاولة";
        toast.error(msg);
        setSubmittingInterest(false);
        return;
      }
      if (data) {
        const msgParts: string[] = [];
        if (interestMessage.trim()) msgParts.push(interestMessage.trim());
        if (wantsMeeting === true) msgParts.push("🤝 أرغب بترتيب مقابلة للاطلاع على الفرصة");
        if (wantsMeeting === false) msgParts.push("💬 أفضل إتمام التفاوض إلكترونياً");
        const fullMsg = msgParts.length > 0 ? msgParts.join("\n\n") : "مرحباً، أنا مهتم بهذه الفرصة وأود معرفة المزيد من التفاصيل.";

        await supabase.from("negotiation_messages").insert({
          deal_id: data.id,
          sender_id: user.id,
          message: fullMsg,
          message_type: "text",
        });

        const conversationId = crypto.randomUUID();
        const defaultFirstMsg = "مرحباً، أنا مهتم بهذه الفرصة";
        await supabase.from("conversations").insert({
          id: conversationId,
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.owner_id,
          last_message: defaultFirstMsg,
          last_message_at: new Date().toISOString(),
          status: "active",
        });
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          receiver_id: listing.owner_id,
          listing_id: listing.id,
          content: defaultFirstMsg,
        });

        setShowInterestForm(false);
        setInterestMessage("");
        setWantsMeeting(null);
        toast.success("تم إرسال اهتمامك بنجاح!");
        navigate(`/negotiate/${data.id}`);
      }
    } catch (err: any) {
      console.error("[ListingDetails] submitInterest failed:", err?.message);
      toast.error("تعذر إرسال الاهتمام. تحقق من اتصالك بالإنترنت وأعد المحاولة");
    } finally {
      setSubmittingInterest(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-4">
        <AiStar size={32} />
        <Loader2 size={24} className="text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">جاري تحميل الإعلان...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-20 text-center">
        <AlertTriangle size={32} className="mx-auto mb-4 text-destructive" />
        <p className="text-sm text-destructive mb-3">{loadError}</p>
        <Button onClick={() => loadListing(true)} variant="outline" className="rounded-xl">إعادة المحاولة</Button>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="py-20 text-center">
        <AiStar size={32} className="mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">الإعلان غير موجود</p>
        <Button asChild variant="outline" className="mt-4 rounded-xl">
          <Link to="/marketplace">العودة للسوق</Link>
        </Button>
      </div>
    );
  }

  const photos = getOrderedPhotos(listing.photos as Record<string, string[]>);
  const inventory = (listing.inventory || []) as Array<{ name: string; qty: number; condition: string }>;
  const documents = normalizeListingDocuments(listing.documents || []);
  const isOwner = user?.id === listing.owner_id;
  const isPlatformAdmin = role === "platform_owner" || role === "supervisor";
  const canManageListing = isOwner || isPlatformAdmin;
  const isSimulation = hasSimulationPhotos(listing.photos as Record<string, unknown>);

  // Deal structure data
  const dealOptions = ((listing as any).deal_options || []) as Array<{ type_id: string; priority: number; is_primary: boolean }>;
  const primaryDealType = (listing as any).primary_deal_type || listing.deal_type;
  const primaryConfig = DEAL_TYPE_MAP[primaryDealType];
  const alternativeOptions = dealOptions.filter(o => !o.is_primary);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title || "فرصة تقبيل",
    description: listing.description || "",
    url: `https://soqtaqbeel.com/listing/${listing.id}`,
    image: photos.length > 0 ? photos[0] : undefined,
    brand: {
      "@type": "Organization",
      name: "سوق تقبيل",
    },
    offers: listing.price
      ? {
          "@type": "Offer",
          price: listing.price,
          priceCurrency: "SAR",
          availability: listing.status === "published"
            ? "https://schema.org/InStock"
            : "https://schema.org/SoldOut",
          url: `https://soqtaqbeel.com/listing/${listing.id}`,
        }
      : undefined,
    category: listing.category || listing.business_activity || undefined,
    additionalProperty: [
      listing.city ? { "@type": "PropertyValue", name: "المدينة", value: listing.city } : null,
      listing.district ? { "@type": "PropertyValue", name: "الحي", value: listing.district } : null,
    ].filter(Boolean),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }} />
      <div className="py-8 pb-24 lg:pb-8">
      <div className="container">

        {/* Owner / Admin action bar — top of page */}
        {canManageListing && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-3" dir="rtl">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield size={14} className="text-primary" strokeWidth={1.5} />
              <span className="font-medium text-foreground">
                {isOwner ? t("manage.yourListing") : isPlatformAdmin ? t("manage.title") : "—"}
              </span>
              <span>
                {listing.status === "published" ? t("manage.published") : listing.status === "suspended" ? t("manage.suspended") : listing.status === "draft" ? t("manage.draft") : listing.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!(myActiveDeal && (myActiveDeal.status === "finalized" || myActiveDeal.status === "completed")) && (
                <Button variant="outline" size="sm" className="rounded-xl text-xs h-8" onClick={() => setEditDialogOpen(true)}>
                  <Edit3 size={13} strokeWidth={1.5} /> {t("manage.edit")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-8"
                onClick={() => {
                  const url = `${window.location.origin}/listing/${listing.id}`;
                  if (navigator.share) {
                    navigator.share({ title: listing.title || "فرصة تقبيل", url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url);
                    toast.success("تم نسخ رابط الإعلان");
                  }
                }}
              >
                <Share2 size={13} strokeWidth={1.5} /> {t("common.share")}
              </Button>
              {(listing.status === "published" || listing.status === "suspended") && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={statusToggling}
                  className="rounded-xl text-xs h-8"
                  onClick={async () => {
                    if (!listing) return;
                    const newStatus = listing.status === "published" ? "suspended" : "published";
                    setStatusToggling(true);
                    const { error } = await updateListing(listing.id, { status: newStatus });
                    setStatusToggling(false);
                    if (error) {
                      toast.error("تعذّر تغيير حالة الإعلان");
                      return;
                    }
                    setListing((prev) => prev ? { ...prev, status: newStatus } as Listing : prev);
                    listingDetailsStateCache.delete(listing.id);
                    toast.success(newStatus === "suspended" ? "تم إيقاف الإعلان مؤقتاً" : "تم إعادة تفعيل الإعلان");
                  }}
                >
                  {statusToggling ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : listing.status === "published" ? (
                    <><Pause size={13} strokeWidth={1.5} /> {t("manage.pause")}</>
                  ) : (
                    <><Play size={13} strokeWidth={1.5} /> {t("manage.resume")}</>
                  )}
                </Button>
              )}
              {listing.status === "published" && !listing.featured && (
                <Button
                  size="sm"
                  className="rounded-xl text-xs h-8 bg-gradient-to-l from-primary to-primary/70 text-primary-foreground"
                  onClick={() => setPromoteDialogOpen(true)}
                >
                  <Sparkles size={13} strokeWidth={1.5} /> {t("manage.promote")}
                </Button>
              )}
              {listing.featured && (
                <span className="inline-flex items-center gap-1 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 text-[11px] font-medium">
                  <Sparkles size={12} strokeWidth={1.5} /> {t("manage.featured")}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={deleting}
                className="rounded-xl text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/30"
                onClick={async () => {
                  if (!listing) return;
                  if (!confirm(`هل تريد حذف "${listing.title || "هذا الإعلان"}"؟ لن يمكن استرجاعه من هنا.`)) return;
                  setDeleting(true);
                  const { error } = await softDeleteListing(listing.id);
                  setDeleting(false);
                  if (error) {
                    toast.error((error as Error).message || "تعذّر حذف الإعلان");
                    return;
                  }
                  listingDetailsStateCache.delete(listing.id);
                  toast.success("تم حذف الإعلان");
                  navigate("/dashboard");
                }}
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <><Trash2 size={13} strokeWidth={1.5} /> {t("manage.delete")}</>}
              </Button>
            </div>
          </div>
        )}

        {myActiveDeal && (
          <div className="mb-5 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-3" dir="rtl">
            <div className="flex items-center gap-2">
              <MessageCircle size={14} className="text-primary" />
              <span className="text-xs text-foreground font-medium">
                لديك صفقة جارية على هذا الإعلان
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({myActiveDeal.status === "negotiating" ? "جاري التفاوض" : myActiveDeal.status === "finalized" ? "مُقفل" : myActiveDeal.status})
              </span>
            </div>
            <Button asChild size="sm" className="rounded-xl text-xs gap-1.5">
              <Link to={`/negotiate/${myActiveDeal.id}`}>
                <ArrowLeft size={12} />
                الانتقال للمفاوضات
              </Link>
            </Button>
          </div>
        )}

        {isSimulation && (
          <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 p-5" dir="rtl">
            <div className="flex items-start gap-3 mb-3">
              <div className="mt-0.5 shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-amber-900 mb-1">⚠️ عرض توضيحي — ليس إعلاناً حقيقياً</p>
                <p className="text-sm text-amber-800 leading-relaxed">
                  هذا الإعلان مجرد <strong>محاكاة</strong> لتوضيح كيف تعمل منصة سوق تقبيل. جميع البيانات والصور والأسعار المعروضة هنا <strong>وهمية وغير حقيقية</strong>.
                </p>
              </div>
            </div>
            <div className="mr-[52px] space-y-2">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <span className="shrink-0">🚫</span>
                <span>لا يمكن التفاوض أو إتمام صفقة على هذا الإعلان</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <span className="shrink-0">📋</span>
                <span>الهدف هو تعريفك بآلية عرض الفرص والتفاوض عليها</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <span className="shrink-0">✅</span>
                <span>عند إضافة فرص حقيقية من بائعين موثقين، ستظهر بدون هذا التنبيه</span>
              </div>
              <div className="mt-3">
                <Link 
                  to="/create-listing?new=1" 
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-l from-primary to-primary/70 text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
                >
                  أضف فرصتك الآن
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.length > 0 ? photos.slice(0, 6).map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className="aspect-[4/3] bg-card rounded-xl shadow-soft overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                >
                  <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  {isSimulationImage(url) && <SimulationOverlay size="sm" />}
                  {i === 5 && photos.length > 6 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-lg font-bold">+{photos.length - 6}</span>
                    </div>
                  )}
                </button>
              )) : [1, 2, 3].map(i => (
                <div key={i} className="aspect-[4/3] bg-card rounded-xl gradient-hero flex items-center justify-center shadow-soft">
                  <Building2 size={24} strokeWidth={1} className="text-muted-foreground/20" />
                </div>
              ))}
            </div>

            {/* Photo Lightbox — with keyboard + touch/swipe */}
            {lightboxIndex !== null && photos.length > 0 && (
              <div
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center select-none"
                onClick={() => setLightboxIndex(null)}
                tabIndex={0}
                ref={(el) => { el?.focus(); }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setLightboxIndex(null);
                  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    e.preventDefault();
                    setLightboxIndex((prev) => {
                      if (prev === null) return null;
                      return e.key === "ArrowRight"
                        ? (prev - 1 + photos.length) % photos.length
                        : (prev + 1) % photos.length;
                    });
                  }
                }}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  touchStartRef.current = { x: touch.clientX, y: touch.clientY };
                }}
                onTouchEnd={(e) => {
                  if (!touchStartRef.current) return;
                  const touch = e.changedTouches[0];
                  const dx = touch.clientX - touchStartRef.current.x;
                  const dy = touch.clientY - touchStartRef.current.y;
                  touchStartRef.current = null;
                  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
                  setLightboxIndex((prev) => {
                    if (prev === null) return null;
                    return dx > 0
                      ? (prev - 1 + photos.length) % photos.length
                      : (prev + 1) % photos.length;
                  });
                }}
              >
                <button
                  className="absolute top-4 right-4 text-white/80 hover:text-white z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                  onClick={() => setLightboxIndex(null)}
                >✕</button>
                {photos.length > 1 && (
                  <>
                    <button
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex((prev) => (prev === null ? null : (prev - 1 + photos.length) % photos.length));
                      }}
                    >‹</button>
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex((prev) => (prev === null ? null : (prev + 1) % photos.length));
                      }}
                    >›</button>
                  </>
                )}
                <img
                  src={photos[lightboxIndex]}
                  alt=""
                  className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
                  {lightboxIndex + 1} / {photos.length}
                </div>
              </div>
            )}

            {/* Social actions bar */}
            <div className="flex items-center justify-between bg-card rounded-xl px-4 py-2.5 shadow-soft">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Eye size={14} strokeWidth={1.3} />
                  <span className="text-xs tabular-nums">{viewCount}</span>
                  <span className="text-[10px]">{t('listing.views')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Heart size={14} strokeWidth={1.3} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-red-400" : ""} />
                  <span className="text-xs tabular-nums">{likeCount}</span>
                  <span className="text-[10px]">{t('listing.likes')}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={async () => {
                    if (!listing) return;
                    const result = await toggleLike(listing.id);
                    if (result !== null) {
                      setIsLiked(result);
                      setLikeCount(prev => result ? prev + 1 : Math.max(0, prev - 1));
                    }
                  }}
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                    isLiked ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:text-red-500"
                  )}
                  title={t('listing.likes')}
                >
                  <Heart size={14} strokeWidth={1.5} fill={isLiked ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => {
                    if (!listing) return;
                    const url = `${window.location.origin}/listing/${listing.id}`;
                    if (navigator.share) {
                      navigator.share({ title: listing.title || "فرصة تقبيل", url });
                    } else {
                      navigator.clipboard.writeText(url);
                      toast.success("تم نسخ رابط الإعلان");
                    }
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
                  title="مشاركة"
                >
                  <Share2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>


            {/* ====== بطاقة ملخص الصفقة (ثابتة — لا تنطوي) ====== */}
            <DealSummaryCard listing={listing} />

            {/* ====== هيكل الصفقة (Accordion) ====== */}
            {primaryConfig && (
              <SectionAccordion
                title={t('listing.dealStructure')}
                icon={<Shield size={16} strokeWidth={1.4} className="text-primary" />}
                summary={`${primaryConfig.label}${primaryConfig.includes.length > 0 ? ` — يشمل ${primaryConfig.includes.slice(0, 3).join("، ")}` : ""}`}
              >
                <DealStructureDisplay
                  primaryConfig={primaryConfig}
                  primaryTypeId={primaryDealType}
                  alternatives={alternativeOptions}
                />
              </SectionAccordion>
            )}

            {/* ====== ملخص الفرصة (إن وُجد — يبقى مرئياً كبطاقة قصيرة) ====== */}
            {(listing.description || listing.ai_summary) && (
              <SectionAccordion
                title="ملخص الفرصة"
                icon={<AiStar size={16} animate={false} />}
                summary={String(listing.ai_summary || listing.description || "").replace(/\s+/g, " ").trim().slice(0, 90) + ((String(listing.ai_summary || listing.description || "").length > 90) ? "…" : "")}
              >
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {listing.ai_summary || listing.description}
                </p>
              </SectionAccordion>
            )}

            {/* ====== جرد الأصول (Accordion) ====== */}
            {inventory.length > 0 && (
              <SectionAccordion
                title={`${t('listing.assetInventory')} (${inventory.length})`}
                icon={<Building2 size={16} strokeWidth={1.4} className="text-primary" />}
                summary={(() => {
                  const inv = (listing.inventory || []) as any[];
                  const priced = inv.filter((a) => typeof a?.pricing?.price_sar === "number" && a.pricing.price_sar > 0 && a.pricing?.confidence !== "يتطلب_معاينة").length;
                  const inspect = inv.length - priced;
                  return inspect > 0 ? `${priced} ${t('listing.priced')} · ${inspect} ${t('listing.needsInspection')}` : `${priced} ${t('listing.priced')}`;
                })()}
              >
                <CollapsibleList title={t("inventory.confirmedAssets")} items={inventory} threshold={5} renderItem={(item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm">{item.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{item.qty} {t("inventory.unit")}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md ${item.condition === "جديد" || item.condition === "شبه جديد" ? "bg-success/10 text-success" : item.condition === "تالف" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                        {item.condition}
                      </span>
                    </div>
                  </div>
                )} />
              </SectionAccordion>
            )}

            {/* ====== المستندات والوثائق (Accordion) ====== */}
            <SectionAccordion
              title={t('listing.documents')}
              icon={<Shield size={16} strokeWidth={1.4} className="text-primary" />}
              summary={`${documents.length} ${t('listing.document')}`}
            >
              <ProtectedDocumentsPanel
                listingId={listing.id}
                ownerId={listing.owner_id}
                legacyDocuments={documents}
              />
            </SectionAccordion>

            {/* ====== فحص الصفقة + تسعير الأصول + الموثوقية + الجدوى (مكوّنات لها ترويسات داخلية) ====== */}
            <DealCheckPanel listing={listing} analysisCache={analysisCache} />

            {/* دراسة الجدوى الاقتصادية وتحليل المنافسين */}
            <FeasibilityStudyPanel listing={listing} analysisCache={analysisCache} isOwner={isOwner} />

            {/* محاكاة الصفقة */}
            {!isOwner && listing.price && (
              <SectionAccordion
                title={t('listing.dealSimulation')}
                icon={<Sparkles size={16} strokeWidth={1.4} className="text-primary" />}
                summary={t('listing.priceScenarios')}
              >
                <DealSimulationPanel listingId={listing.id} />
              </SectionAccordion>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-card rounded-2xl p-6 shadow-soft">
              {/* Owner edit buttons */}
              {isOwner && (
                <div className="flex gap-2 mb-4">
                  {myActiveDeal && (myActiveDeal.status === "finalized" || myActiveDeal.status === "completed") ? (
                    <div className="flex-1 text-center text-xs text-muted-foreground bg-muted/50 rounded-xl py-2 px-3">
                      لا يمكن تعديل الإعلان أثناء الاتفاق النهائي
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditDialogOpen(true)}
                      className="flex-1 rounded-xl text-xs"
                    >
                      <Edit3 size={14} /> تعديل الإعلان
                    </Button>
                  )}
                </div>
              )}

              {listing.status === "sold" && (
                <div className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-md px-3 py-1.5 text-sm font-bold mb-2">
                  <Check size={16} />
                  تم البيع
                </div>
              )}

              <h1 className="text-xl font-medium mb-1">{listing.title || listing.business_activity || "فرصة تقبيل"}</h1>
              {sellerProfile && (
                <Link to={`/seller/${sellerProfile.user_id}`} className="flex items-center gap-1.5 mb-1 group/seller">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-semibold text-primary">
                    {sellerProfile.full_name?.charAt(0) || "?"}
                  </div>
                  <span className="text-xs text-muted-foreground group-hover/seller:text-primary transition-colors">{sellerProfile.full_name || "بائع"}</span>
                  <VerifiedSellerBadge userId={sellerProfile.user_id} size="sm" />
                </Link>
              )}
              {listing.location_lat && listing.location_lng ? (
                <button
                  type="button"
                  onClick={() => window.open(`https://www.google.com/maps?q=${listing.location_lat},${listing.location_lng}`, '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline mb-4 cursor-pointer bg-transparent border-none p-0"
                >
                  <MapPin size={14} strokeWidth={1.3} />
                  {listing.district && `${listing.district}, `}{listing.city || "—"}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                  <MapPin size={14} strokeWidth={1.3} />
                  {listing.district && `${listing.district}, `}{listing.city || "—"}
                </div>
              )}
              {(listing as any).area_sqm && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                  <Building2 size={14} strokeWidth={1.3} />
                  المساحة: {(listing as any).area_sqm} م²
                </div>
              )}

              <div className="mb-6">
                <div className="text-2xl font-medium gradient-text">
                  {listing.price ? <PriceDisplay amount={Number(listing.price)} size={14} /> : "—"}
                </div>
                {isOwner && (
                  <QuickPriceEdit
                    listingId={listing.id}
                    currentPrice={listing.price}
                    onUpdated={(newPrice) => setListing((prev) => prev ? { ...prev, price: newPrice } : prev)}
                    className="mt-1"
                  />
                )}
              </div>

              <div className="space-y-3 mb-6">
                <InfoRow label={t('listing.dealType')} value={primaryConfig?.label || getArabicDealType(primaryDealType)} />

                {(listing.annual_rent || listing.lease_duration || listing.lease_remaining || listing.municipality_license || listing.civil_defense_license || listing.liabilities) && (
                  <Collapsible>
                    <CollapsibleTrigger className="w-full flex items-center justify-between text-xs text-primary hover:text-primary/80 transition-colors py-1.5 group">
                      <span>{t('listing.showExtraDetails')}</span>
                      <ChevronDown size={14} className="transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      {listing.annual_rent && <InfoRow label="الإيجار السنوي" value={<PriceDisplay amount={Number(listing.annual_rent)} size={10} />} />}
                      {listing.lease_duration && <InfoRow label="مدة العقد" value={listing.lease_duration} />}
                      {listing.lease_remaining && <InfoRow label="المتبقي" value={listing.lease_remaining} />}
                      {listing.municipality_license && <InfoRow label="رخصة البلدية" value={listing.municipality_license} />}
                      {listing.civil_defense_license && <InfoRow label="الدفاع المدني" value={listing.civil_defense_license} />}
                      {listing.liabilities && <InfoRow label="الالتزامات" value={listing.liabilities} />}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              {/* Listing Health Report - for owner */}
              {isOwner && <ListingHealthReport listingId={listing.id} />}


              {/* Seller Info Card */}
              {sellerProfile && (
                <div className="mb-4 p-4 bg-muted/20 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {sellerProfile.full_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {role === "platform_owner" ? (
                          <Link to={`/dashboard/view-customer/${sellerProfile.user_id}`} className="text-sm font-medium truncate text-primary hover:underline">
                            {sellerProfile.full_name || "بائع"}
                          </Link>
                        ) : (
                          <span className="text-sm font-medium truncate">{sellerProfile.full_name || "بائع"}</span>
                        )}
                        <VerifiedSellerBadge userId={sellerProfile.user_id} size="md" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{t('listing.opportunityOwner')}</p>
                    </div>
                    <Link to={`/seller/${sellerProfile.user_id}`} className="text-[10px] text-primary hover:underline shrink-0">
                      {t('listing.profile')}
                    </Link>
                  </div>
                  <TrustBadge
                    score={sellerProfile.trust_score}
                    verificationLevel={sellerProfile.verification_level}
                    size="md"
                    showScore
                    showBadges
                    badges={getSellerBadges(sellerProfile)}
                  />
                </div>
              )}

              {/* Seller: offers panel */}
              {isOwner && (
                <SellerOffersPanel listingId={listing.id} listingOwnerId={listing.owner_id} className="mb-4" />
              )}

              {/* Seller: agent panel */}
              {isOwner && listing.status === "published" && (
                <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 mb-4">
                  <MoqbilAgentPanel listingId={listing.id} />
                </div>
              )}

              {/* Buyer: offer form + negotiate button */}
              {!isOwner && !isSimulation && (
                <>
                  {/* Express Interest CTA */}
                  {!myActiveDeal && (
                    <Button
                      onClick={handleStartNegotiation}
                      disabled={startingDeal}
                      className="w-full rounded-xl text-base h-12 active:scale-[0.98] mb-3"
                    >
                      {startingDeal ? <Loader2 size={18} className="animate-spin" /> : <Heart size={18} strokeWidth={1.5} />}
                      {t('listing.showInterest')}
                    </Button>
                  )}

                  {myActiveDeal && (
                    <Button
                      onClick={() => navigate(`/negotiate/${myActiveDeal.id}`)}
                      className="w-full rounded-xl text-base h-12 active:scale-[0.98] mb-3"
                      variant="secondary"
                    >
                      <MessageCircle size={18} strokeWidth={1.5} />
                      متابعة التفاوض
                    </Button>
                  )}

                  <ListingOfferForm
                    listingId={listing.id}
                    listingPrice={listing.price}
                    ownerId={listing.owner_id}
                    className="mb-4"
                  />
                  <p className="text-[11px] text-muted-foreground text-center mb-2">
                    💡 {t("listing.publicOfferTip")}
                  </p>
                  <Button
                    onClick={handleStartNegotiation}
                    disabled={startingDeal}
                    variant="outline"
                    className="w-full rounded-xl active:scale-[0.98]"
                  >
                    {startingDeal ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} strokeWidth={1.5} />}
                    {t('listing.contactSeller')}
                  </Button>
                </>
              )}

              {isSimulation && (
                <Button
                  onClick={handleStartNegotiation}
                  disabled={startingDeal}
                  className="w-full rounded-xl text-base h-12 active:scale-[0.98]"
                >
                  {startingDeal ? <Loader2 size={18} className="animate-spin" /> : <Heart size={18} strokeWidth={1.5} />}
                  أبدِ اهتمامك بهذه الفرصة
                </Button>
              )}

              {interestCount > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-2">
                  <Users size={15} />
                  <span>{interestCount} مستخدمين أبدوا اهتمامهم</span>
                </div>
              )}

              {/* Deal Ratings */}
              {listing.owner_id && (
                <SellerRatingDisplay sellerId={listing.owner_id} className="mt-4 justify-center" />
              )}

              {/* Seller Reviews */}
              {sellerReviews.length > 0 && (
                <SellerReviewsSummary reviews={sellerReviews} className="mt-4" />
              )}

              {/* Report */}
              {!isOwner && !isSimulation && (
                <div className="mt-4 flex justify-center">
                  <ReportListingDialog listingId={listing.id} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {isOwner && listing && (
        <ListingEditDialog
          listing={listing}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdated={(updated) => {
            setListing((prev) => prev ? { ...prev, ...updated } as Listing : prev);
            // Invalidate caches so dashboard + marketplace reflect the change immediately
            if (listing?.id) {
              listingDetailsStateCache.delete(listing.id);
            }
            queryClient.invalidateQueries({ queryKey: ["listings"] });
            queryClient.invalidateQueries({ queryKey: ["listing", listing?.id] });
          }}
        />
      )}

      {/* Promote dialog */}
      {isOwner && listing && (
        <PromoteListingDialog
          open={promoteDialogOpen}
          onOpenChange={setPromoteDialogOpen}
          listingId={listing.id}
          listingTitle={listing.title || "هذا الإعلان"}
        />
      )}

      {/* Auth required dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="max-w-sm text-center" dir="rtl">
          <DialogHeader className="items-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <MessageCircle className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-lg">سجّل حسابك</DialogTitle>
            <DialogDescription className="text-sm">
              سجّل حسابك لتتواصل مع البائع مباشرة
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-2">
            <Button className="w-full rounded-xl h-11" onClick={() => navigate("/login")}>
              تسجيل الدخول
            </Button>
            <Button variant="outline" className="w-full rounded-xl h-11" onClick={() => navigate("/login?tab=register")}>
              إنشاء حساب جديد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interest form dialog (logged-in users) */}
      <Dialog open={showInterestForm} onOpenChange={setShowInterestForm}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-lg">{t('listing.showInterest')}</DialogTitle>
            <DialogDescription className="text-sm">
              أرسل رسالتك الأولى للبائع وابدأ التفاوض
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* First message */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                رسالتك الأولى
              </label>
              <Textarea
                placeholder="مرحباً، أنا مهتم بهذه الفرصة وأود معرفة المزيد..."
                value={interestMessage}
                onChange={(e) => setInterestMessage(e.target.value)}
                className="min-h-[80px] resize-none rounded-xl"
              />
            </div>

            {/* Meeting preference */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                هل ترغب بترتيب مقابلة؟
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWantsMeeting(true)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    wantsMeeting === true
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  ✅ نعم، أرغب بمقابلة
                </button>
                <button
                  type="button"
                  onClick={() => setWantsMeeting(false)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    wantsMeeting === false
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  💬 لا، إلكترونياً
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              className="w-full rounded-xl h-11"
              onClick={handleSubmitInterest}
              disabled={submittingInterest}
            >
              {submittingInterest ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} />}
              إرسال اهتمامي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    <ListingStickyCtaBar
      listing={listing}
      isOwner={isOwner}
      isSimulation={isSimulation}
      myActiveDeal={myActiveDeal}
      startingDeal={startingDeal}
      onStartNegotiation={handleStartNegotiation}
    />
    </>
  );
};

// ---- Sub-components ----

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

const CollapsibleList = <T,>({ title, icon, items, threshold, renderItem }: {
  title: string;
  icon?: React.ReactNode;
  items: T[];
  threshold: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const needsExpand = items.length > threshold;
  const visibleItems = needsExpand && !expanded ? items.slice(0, threshold) : items;

  return (
    <div className="border-b border-border/20 pb-5 last:border-0 last:pb-0">
      <h3 className="font-medium mb-3 flex items-center gap-2">
        {icon}
        {title}
        <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
      </h3>
      <div className="space-y-2">
        {visibleItems.map((item, i) => renderItem(item, i))}
      </div>
      {needsExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? t("common.showLess") : `${t("common.showMore")} (${items.length - threshold}+)`}
        </button>
      )}
    </div>
  );
};

interface DealStructureDisplayProps {
  primaryConfig: typeof DEAL_TYPE_MAP[string];
  primaryTypeId: string;
  alternatives: Array<{ type_id: string; priority: number }>;
}

const DEAL_CONTENT_TRANSLATION_KEYS: Record<string, string> = {
  "السجل التجاري": "deal.commercialReg",
  "الاسم التجاري": "deal.tradeName",
  "العلامة التجارية": "deal.trademark",
  "الأصول والمعدات": "deal.assetsEquipment",
  "عقد الإيجار": "deal.lease",
  "المخزون": "deal.inventory",
  "الحقوق التشغيلية": "deal.operationalRights",
  "الديون والالتزامات تجاه الغير": "deal.debtsLiabilities",
  "نقل الأعمال بالكامل بما تملكه وما عليها من التزامات": "deal.fullTransferDesc",
  "يتحمل المشتري جميع الالتزامات السابقة": "deal.buyerAssumesLiabilities",
  "يجب التحقق من النزاعات القانونية القائمة": "deal.checkLegalDisputes",
};

const DealStructureDisplay = ({ primaryConfig, primaryTypeId, alternatives }: DealStructureDisplayProps) => {
  const { t } = useTranslation();
  if (!primaryConfig) return null;

  const tr = (s: string) => (DEAL_CONTENT_TRANSLATION_KEYS[s] ? t(DEAL_CONTENT_TRANSLATION_KEYS[s]) : s);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={18} strokeWidth={1.3} className="text-primary" />
        <h3 className="font-medium">{t('listing.dealStructure')}</h3>
      </div>

      {/* Primary deal type */}
      <div className="border border-primary/20 bg-primary/5 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium flex items-center gap-0.5">
            <Star size={10} fill="currentColor" /> {t("listing.mainOption")}
          </span>
          <span className="text-sm font-medium">{primaryConfig.label}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{tr(primaryConfig.desc)}</p>

        {primaryConfig.includes.length > 0 && (
          <div className="mb-2">
            <div className="text-[11px] font-medium text-success mb-1 flex items-center gap-1">
              <Check size={11} /> {t("listing.includes")}
            </div>
            <div className="flex flex-wrap gap-1">
              {primaryConfig.includes.map((item, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">{tr(item)}</span>
              ))}
            </div>
          </div>
        )}
        {primaryConfig.excludes.length > 0 && (
          <div>
            <div className="text-[11px] font-medium text-destructive mb-1 flex items-center gap-1">
              <AlertTriangle size={11} /> {t("listing.excludes")}
            </div>
            <div className="flex flex-wrap gap-1">
              {primaryConfig.excludes.map((item, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">{tr(item)}</span>
              ))}
            </div>
          </div>
        )}
        {primaryConfig.cautionNotes.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/30">
            {primaryConfig.cautionNotes.map((note, i) => (
              <div key={i} className="text-[11px] text-warning flex items-start gap-1 mt-0.5">
                <AlertTriangle size={10} className="shrink-0 mt-0.5" /> {tr(note)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alternative options */}
      {alternatives.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium">{t("listing.alternativeOptions")}</div>
          {alternatives.map((alt) => {
            const altConfig = DEAL_TYPE_MAP[alt.type_id];
            if (!altConfig) return null;
            return (
              <div key={alt.type_id} className="border border-border/30 rounded-lg p-3">
                <div className="text-sm font-medium">{altConfig.label}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{tr(altConfig.desc)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Reusable section accordion — unified collapsed-by-default chrome
// for every section in the listing details page.
// ============================================================
const SectionAccordion = ({
  title,
  icon,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: React.ReactNode;
  summary?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  return (
    <Collapsible defaultOpen={defaultOpen} className="bg-card rounded-2xl shadow-soft overflow-hidden">
      <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 hover:bg-accent/20 transition-colors group" dir="rtl">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon}
          <h3 className="text-sm sm:text-base font-medium text-foreground shrink-0">{title}</h3>
        </div>
        <div className="flex items-center gap-2 min-w-0 mr-auto">
          {summary && (
            <span className="text-[11px] sm:text-xs text-muted-foreground truncate text-left">
              {summary}
            </span>
          )}
          <ChevronDown
            size={16}
            strokeWidth={1.5}
            className="text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-180"
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 sm:px-5 pb-4 sm:pb-5">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ============================================================
// Deal Summary Card — fixed (non-collapsible), two-line summary
// shown right after the photos.
// ============================================================
const DealSummaryCard = ({ listing }: { listing: any }) => {
  const { t } = useTranslation();
  const inv = Array.isArray(listing?.inventory) ? listing.inventory : [];
  const totalAssets = inv.length;
  const pricedTotal = inv.reduce((sum: number, a: any) => {
    const p = Number(a?.pricing?.price_sar);
    const q = Number(a?.quantity) > 0 ? Number(a.quantity) : 1;
    return Number.isFinite(p) && p > 0 && a?.pricing?.confidence !== "يتطلب_معاينة" ? sum + p * q : sum;
  }, 0);
  const askingPrice = Number(listing?.price) || 0;
  const dealLabel = DEAL_TYPE_MAP[listing?.primary_deal_type || listing?.deal_type]?.label
    || getArabicDealType(listing?.primary_deal_type || listing?.deal_type);
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div className="bg-gradient-to-br from-primary/[0.06] via-card to-card rounded-2xl border border-primary/15 shadow-soft p-4 sm:p-5" dir="rtl">
      {/* السطر 1: نشاط · مدينة · نوع الصفقة */}
      <div className="flex items-center gap-2 flex-wrap text-sm sm:text-base font-semibold text-foreground">
        <Building2 size={16} strokeWidth={1.4} className="text-primary shrink-0" />
        <span className="truncate">
          {listing?.business_activity || listing?.title || "فرصة تقبيل"}
        </span>
        <span className="text-muted-foreground/60 font-normal">·</span>
        <span className="inline-flex items-center gap-1 text-muted-foreground font-normal">
          <MapPin size={13} strokeWidth={1.4} />
          {listing?.city || "—"}
        </span>
        {dealLabel && (
          <>
            <span className="text-muted-foreground/60 font-normal">·</span>
            <span className="inline-flex items-center gap-1 text-primary text-xs sm:text-sm font-medium px-2 py-0.5 rounded-md bg-primary/10">
              {dealLabel}
            </span>
          </>
        )}
      </div>

      {/* السطر 2: السعر · قيمة الأصول · عدد الأصول */}
      <div className="mt-3 flex items-center gap-3 flex-wrap text-xs sm:text-sm tabular-nums">
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <Wallet size={13} strokeWidth={1.4} className="text-primary" />
          <span className="text-muted-foreground">{t('listing.price')}:</span>
          <span className="font-semibold">{askingPrice > 0 ? `${fmt(askingPrice)} ر.س` : "—"}</span>
        </span>
        {pricedTotal > 0 && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <Sparkles size={13} strokeWidth={1.4} className="text-primary" />
              <span className="text-muted-foreground">{t('listing.pricedAssetsValue')}:</span>
              <span className="font-medium">{fmt(pricedTotal)} ر.س</span>
            </span>
          </>
        )}
        {totalAssets > 0 && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Package size={13} strokeWidth={1.4} />
              {totalAssets} {t('listing.asset')}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default ListingDetailsPage;
