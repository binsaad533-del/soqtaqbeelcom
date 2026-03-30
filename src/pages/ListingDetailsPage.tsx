import { Link, useParams, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MapPin, FileText, MessageCircle, Building2, Loader2, Check, AlertTriangle, Shield, Star, Edit3, ArrowLeft, Heart, Share2, Eye, CalendarCheck, MessageSquare, Users, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import AiStar from "@/components/AiStar";
import TrustBadge, { getSellerBadges } from "@/components/TrustBadge";
import SellerReviewsSummary from "@/components/SellerReviewsSummary";
import { Button } from "@/components/ui/button";
import DealCheckPanel from "@/components/DealCheckPanel";
import TransparencyIndicator from "@/components/TransparencyIndicator";
import { calculateTransparency } from "@/lib/transparencyScore";
import QuickPriceEdit from "@/components/QuickPriceEdit";
import ListingEditDialog from "@/components/ListingEditDialog";
import ListingOfferForm from "@/components/ListingOfferForm";
import SellerOffersPanel from "@/components/SellerOffersPanel";
import { useState, useEffect } from "react";
import { useListings, type Listing } from "@/hooks/useListings";
import { useListingSocial } from "@/hooks/useListingSocial";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDeals } from "@/hooks/useDeals";
import { useProfiles } from "@/hooks/useProfiles";
import { useSellerReviews, type SellerReview } from "@/hooks/useSellerReviews";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";
import PriceDisplay from "@/components/PriceDisplay";
import { DEAL_TYPE_MAP } from "@/lib/dealStructureConfig";
import { t, DEAL_TYPE_LABELS } from "@/lib/translations";
import SimulationOverlay, { isSimulationImage, hasSimulationPhotos } from "@/components/SimulationOverlay";
import ReportListingDialog from "@/components/ReportListingDialog";


const ListingDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuthContext();
  const { recordView, toggleLike, getLikesAndViews } = useListingSocial();
  const { getListing } = useListings();
  const { createDeal, getMyDeals } = useDeals();
  const { getProfile } = useProfiles();
  const { getSellerReviews } = useSellerReviews();
  const [listing, setListing] = useState<Listing | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [sellerReviews, setSellerReviews] = useState<SellerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startingDeal, setStartingDeal] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [myActiveDeal, setMyActiveDeal] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [interestMessage, setInterestMessage] = useState("");
  const [wantsMeeting, setWantsMeeting] = useState<boolean | null>(null);
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [interestCount, setInterestCount] = useState(0);

  const loadListing = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      console.log("[ListingDetails] Loading listing:", id);
      const data = await getListing(id);
      console.log("[ListingDetails] Listing loaded:", { id, found: !!data, status: data?.status });
      setListing(data);
      if (data) {
        const [profile, reviews, social] = await Promise.all([
          getProfile(data.owner_id),
          getSellerReviews(data.owner_id),
          getLikesAndViews([data.id]),
        ]);
        const { count: dealCount } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("listing_id", data.id);
        setInterestCount(dealCount || 0);
        setSellerProfile(profile);
        setSellerReviews(reviews);
        setViewCount(social.views[data.id] || 0);
        setLikeCount(social.likes[data.id] || 0);
        setIsLiked(social.userLikes.has(data.id));
      }
    } catch (err: any) {
      console.error("[ListingDetails] Load failed:", { id, error: err?.message });
      setLoadError("فشل تحميل الإعلان — يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListing();
    if (id) recordView(id).catch(() => {});
    // Check if the current user has an active deal on this listing
    if (user && id) {
      getMyDeals().then(deals => {
        const active = deals.find(d => d.listing_id === id && !["cancelled", "completed"].includes(d.status));
        setMyActiveDeal(active || null);
      });
    }
  }, [id, getListing, user]);

  const handleStartNegotiation = async () => {
    if (!user) { setShowAuthDialog(true); return; }
    if (!listing) return;
    const myDeals = await getMyDeals();
    const existing = myDeals.find(d => d.listing_id === listing.id);
    if (existing) { navigate(`/negotiate/${existing.id}`); return; }
    // Show interest form instead of creating deal directly
    setShowInterestForm(true);
  };

  const handleSubmitInterest = async () => {
    if (!listing || !user) return;
    setSubmittingInterest(true);
    const { data, error } = await createDeal(listing.id, listing.owner_id);
    if (error) {
      toast.error("حدث خطأ أثناء بدء التفاوض");
      setSubmittingInterest(false);
      return;
    }
    if (data) {
      // Send first message + meeting preference
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

      setShowInterestForm(false);
      setInterestMessage("");
      setWantsMeeting(null);
      toast.success("تم إرسال اهتمامك بنجاح!");
      navigate(`/negotiate/${data.id}`);
    }
    setSubmittingInterest(false);
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
        <Button onClick={loadListing} variant="outline" className="rounded-xl">إعادة المحاولة</Button>
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

  const photos = listing.photos ? Object.values(listing.photos).flat() as string[] : [];
  const inventory = (listing.inventory || []) as Array<{ name: string; qty: number; condition: string }>;
  const documents = (listing.documents || []) as Array<{ name: string; status: string; url?: string }>;
  const isOwner = user?.id === listing.owner_id;
  const isSimulation = hasSimulationPhotos(listing.photos as Record<string, unknown>);

  // Deal structure data
  const dealOptions = ((listing as any).deal_options || []) as Array<{ type_id: string; priority: number; is_primary: boolean }>;
  const primaryDealType = (listing as any).primary_deal_type || listing.deal_type;
  const primaryConfig = DEAL_TYPE_MAP[primaryDealType];
  const alternativeOptions = dealOptions.filter(o => !o.is_primary);

  return (
    <>
      <div className="py-8">
      <div className="container">

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
                  to="/create-listing" 
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
                <div key={i} className="aspect-[4/3] bg-card rounded-xl shadow-soft overflow-hidden relative">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {isSimulationImage(url) && <SimulationOverlay size="sm" />}
                </div>
              )) : [1, 2, 3].map(i => (
                <div key={i} className="aspect-[4/3] bg-card rounded-xl gradient-hero flex items-center justify-center shadow-soft">
                  <Building2 size={24} strokeWidth={1} className="text-muted-foreground/20" />
                </div>
              ))}
            </div>

            {/* Social actions bar */}
            <div className="flex items-center justify-between bg-card rounded-xl px-4 py-2.5 shadow-soft">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Eye size={14} strokeWidth={1.3} />
                  <span className="text-xs tabular-nums">{viewCount}</span>
                  <span className="text-[10px]">مشاهدة</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Heart size={14} strokeWidth={1.3} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-red-400" : ""} />
                  <span className="text-xs tabular-nums">{likeCount}</span>
                  <span className="text-[10px]">إعجاب</span>
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
                  title="إعجاب"
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


            {primaryConfig && (
              <DealStructureDisplay
                primaryConfig={primaryConfig}
                primaryTypeId={primaryDealType}
                alternatives={alternativeOptions}
              />
            )}

            {/* Details Card */}
            <div className="bg-card rounded-2xl p-6 shadow-soft space-y-5">
              {/* Summary */}
              {(listing.description || listing.ai_summary) && (
                <div className="border-b border-border/20 pb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AiStar size={20} animate={false} />
                    <h2 className="font-medium">ملخص الفرصة</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {listing.ai_summary || listing.description}
                  </p>
                </div>
              )}

              {/* Inventory */}
              {inventory.length > 0 && (
                <CollapsibleList title="جرد الأصول المؤكّد" items={inventory} threshold={5} renderItem={(item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm">{item.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{item.qty} وحدة</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md ${item.condition === "جديد" || item.condition === "شبه جديد" ? "bg-success/10 text-success" : item.condition === "تالف" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                        {item.condition}
                      </span>
                    </div>
                  </div>
                )} />
              )}

              {/* Documents */}
              {documents.length > 0 && (
                <CollapsibleList title="المستندات الداعمة" icon={<FileText size={16} strokeWidth={1.3} />} items={documents} threshold={5} renderItem={(doc, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm">{doc.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${doc.status === "مرفق" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {doc.status}
                    </span>
                  </div>
                )} />
              )}
            </div>

            <DealCheckPanel listing={listing} savedAnalysis={listing.ai_structure_validation} />
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

              <h2 className="text-xl font-medium mb-1">{listing.title || listing.business_activity || "فرصة تقبيل"}</h2>
              {sellerProfile && (
                <Link to={`/seller/${sellerProfile.user_id}`} className="flex items-center gap-1.5 mb-1 group/seller">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-semibold text-primary">
                    {sellerProfile.full_name?.charAt(0) || "?"}
                  </div>
                  <span className="text-xs text-muted-foreground group-hover/seller:text-primary transition-colors">{sellerProfile.full_name || "بائع"}</span>
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
                <InfoRow label="نوع الصفقة" value={primaryConfig?.label || t(listing.deal_type, DEAL_TYPE_LABELS)} />
                {listing.annual_rent && <InfoRow label="الإيجار السنوي" value={<PriceDisplay amount={Number(listing.annual_rent)} size={10} />} />}
                {listing.lease_duration && <InfoRow label="مدة العقد" value={listing.lease_duration} />}
                {listing.lease_remaining && <InfoRow label="المتبقي" value={listing.lease_remaining} />}
                {listing.municipality_license && <InfoRow label="رخصة البلدية" value={listing.municipality_license} />}
                {listing.civil_defense_license && <InfoRow label="الدفاع المدني" value={listing.civil_defense_license} />}
                
                {listing.liabilities && <InfoRow label="الالتزامات" value={listing.liabilities} />}
              </div>

              {/* Deal-type-aware Transparency Indicator */}
              <TransparencyIndicator listing={listing} className="mb-4" />


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
                      </div>
                      <p className="text-[11px] text-muted-foreground">صاحب الفرصة</p>
                    </div>
                    <Link to={`/seller/${sellerProfile.user_id}`} className="text-[10px] text-primary hover:underline shrink-0">
                      الملف الشخصي
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
                      أبدِ اهتمامك
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
                    💡 تقديم العروض على العام يزيد من شفافية الصفقة ويعطيك أفضلية
                  </p>
                  <Button
                    onClick={handleStartNegotiation}
                    disabled={startingDeal}
                    variant="outline"
                    className="w-full rounded-xl active:scale-[0.98]"
                  >
                    {startingDeal ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} strokeWidth={1.5} />}
                    تواصل على الخاص
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
          }}
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
            <DialogTitle className="text-lg">أبدِ اهتمامك</DialogTitle>
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
          {expanded ? "عرض أقل" : `عرض المزيد (${items.length - threshold}+)`}
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

const DealStructureDisplay = ({ primaryConfig, primaryTypeId, alternatives }: DealStructureDisplayProps) => {
  if (!primaryConfig) return null;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={18} strokeWidth={1.3} className="text-primary" />
        <h3 className="font-medium">هيكل الصفقة</h3>
      </div>

      {/* Primary deal type */}
      <div className="border border-primary/20 bg-primary/5 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium flex items-center gap-0.5">
            <Star size={10} fill="currentColor" /> الخيار الرئيسي
          </span>
          <span className="text-sm font-medium">{primaryConfig.label}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{primaryConfig.desc}</p>

        {primaryConfig.includes.length > 0 && (
          <div className="mb-2">
            <div className="text-[11px] font-medium text-success mb-1 flex items-center gap-1">
              <Check size={11} /> يشمل
            </div>
            <div className="flex flex-wrap gap-1">
              {primaryConfig.includes.map((item, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">{item}</span>
              ))}
            </div>
          </div>
        )}
        {primaryConfig.excludes.length > 0 && (
          <div>
            <div className="text-[11px] font-medium text-destructive mb-1 flex items-center gap-1">
              <AlertTriangle size={11} /> لا يشمل
            </div>
            <div className="flex flex-wrap gap-1">
              {primaryConfig.excludes.map((item, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">{item}</span>
              ))}
            </div>
          </div>
        )}
        {primaryConfig.cautionNotes.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/30">
            {primaryConfig.cautionNotes.map((note, i) => (
              <div key={i} className="text-[11px] text-warning flex items-start gap-1 mt-0.5">
                <AlertTriangle size={10} className="shrink-0 mt-0.5" /> {note}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alternative options */}
      {alternatives.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium">خيارات بديلة:</div>
          {alternatives.map((alt) => {
            const altConfig = DEAL_TYPE_MAP[alt.type_id];
            if (!altConfig) return null;
            return (
              <div key={alt.type_id} className="border border-border/30 rounded-lg p-3">
                <div className="text-sm font-medium">{altConfig.label}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{altConfig.desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ListingDetailsPage;
