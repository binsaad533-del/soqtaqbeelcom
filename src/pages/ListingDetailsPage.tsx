import { Link, useParams, useNavigate } from "react-router-dom";
import { MapPin, FileText, MessageCircle, Building2, Loader2, Check, AlertTriangle, Shield, Star, Edit3, ArrowLeft } from "lucide-react";
import AiStar from "@/components/AiStar";
import TrustBadge, { getSellerBadges } from "@/components/TrustBadge";
import SellerReviewsSummary from "@/components/SellerReviewsSummary";
import { Button } from "@/components/ui/button";
import DealCheckPanel from "@/components/DealCheckPanel";
import TransparencyIndicator from "@/components/TransparencyIndicator";
import QuickPriceEdit from "@/components/QuickPriceEdit";
import ListingEditDialog from "@/components/ListingEditDialog";
import ListingOfferForm from "@/components/ListingOfferForm";
import SellerOffersPanel from "@/components/SellerOffersPanel";
import { useState, useEffect } from "react";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals } from "@/hooks/useDeals";
import { useProfiles } from "@/hooks/useProfiles";
import { useSellerReviews, type SellerReview } from "@/hooks/useSellerReviews";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DEAL_TYPE_MAP } from "@/lib/dealStructureConfig";
import { t, DEAL_TYPE_LABELS } from "@/lib/translations";
import SimulationOverlay, { isSimulationImage, hasSimulationPhotos } from "@/components/SimulationOverlay";


const ListingDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
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
        const [profile, reviews] = await Promise.all([
          getProfile(data.owner_id),
          getSellerReviews(data.owner_id),
        ]);
        setSellerProfile(profile);
        setSellerReviews(reviews);
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
    // Check if the current user has an active deal on this listing
    if (user && id) {
      getMyDeals().then(deals => {
        const active = deals.find(d => d.listing_id === id && !["cancelled", "completed"].includes(d.status));
        setMyActiveDeal(active || null);
      });
    }
  }, [id, getListing, user]);

  const handleStartNegotiation = async () => {
    if (!user) { navigate("/login"); return; }
    if (!listing) return;
    const myDeals = await getMyDeals();
    const existing = myDeals.find(d => d.listing_id === listing.id);
    if (existing) { navigate(`/negotiate/${existing.id}`); return; }
    setStartingDeal(true);
    const { data, error } = await createDeal(listing.id, listing.owner_id);
    if (error) { toast.error("حدث خطأ أثناء بدء التفاوض"); }
    else if (data) { navigate(`/negotiate/${data.id}`); }
    setStartingDeal(false);
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
      {myActiveDeal && (
        <div className="fixed top-0 left-0 right-0 z-50 p-3 bg-primary/10 border-b border-primary/20 backdrop-blur-md">
          <div className="container flex items-center justify-between gap-3">
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
        </div>
      )}
      <div className={myActiveDeal ? "pt-20" : "py-8"}>
      <div className="container">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/marketplace" className="hover:text-foreground transition-colors">السوق</Link>
          <span>/</span>
          <span className="text-foreground">{listing.title || listing.business_activity || "فرصة تقبيل"}</span>
        </div>

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

            {/* Deal Structure Panel */}
            {primaryConfig && (
              <DealStructureDisplay
                primaryConfig={primaryConfig}
                primaryTypeId={primaryDealType}
                alternatives={alternativeOptions}
              />
            )}

            {/* Summary */}
            {(listing.description || listing.ai_summary) && (
              <div className="bg-card rounded-2xl p-6 shadow-soft">
                <div className="flex items-center gap-2 mb-4">
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
              <div className="bg-card rounded-2xl p-6 shadow-soft">
                <h3 className="font-medium mb-4">جرد الأصول المؤكّد</h3>
                <div className="space-y-2">
                  {inventory.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <span className="text-sm">{item.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{item.qty} وحدة</span>
                        <span className={`text-xs px-2 py-0.5 rounded-md ${item.condition === "جديد" || item.condition === "شبه جديد" ? "bg-success/10 text-success" : item.condition === "تالف" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                          {item.condition}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {documents.length > 0 && (
              <div className="bg-card rounded-2xl p-6 shadow-soft">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <FileText size={16} strokeWidth={1.3} />
                  المستندات الداعمة
                </h3>
                <div className="space-y-2">
                  {documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <span className="text-sm">{doc.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md ${doc.status === "مرفق" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DealCheckPanel listing={listing} savedAnalysis={listing.ai_structure_validation} />
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-card rounded-2xl p-6 shadow-soft sticky top-20">
              {/* Owner edit buttons */}
              {isOwner && (
                <div className="flex gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditDialogOpen(true)}
                    className="flex-1 rounded-xl text-xs"
                  >
                    <Edit3 size={14} /> تعديل الإعلان
                  </Button>
                </div>
              )}

              <h2 className="text-xl font-medium mb-1">{listing.title || listing.business_activity || "فرصة تقبيل"}</h2>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                <MapPin size={14} strokeWidth={1.3} />
                {listing.district && `${listing.district}, `}{listing.city || "—"}
              </div>

              <div className="mb-6">
                <div className="text-2xl font-medium gradient-text">
                  {listing.price ? `${Number(listing.price).toLocaleString("en-US")}` : "—"} <span className="text-sm">ر.س</span>
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
                {listing.annual_rent && <InfoRow label="الإيجار السنوي" value={`${Number(listing.annual_rent).toLocaleString("en-US")} ر.س`} />}
                {listing.lease_duration && <InfoRow label="مدة العقد" value={listing.lease_duration} />}
                {listing.lease_remaining && <InfoRow label="المتبقي" value={listing.lease_remaining} />}
                {listing.municipality_license && <InfoRow label="رخصة البلدية" value={listing.municipality_license} />}
                {listing.civil_defense_license && <InfoRow label="الدفاع المدني" value={listing.civil_defense_license} />}
                {listing.surveillance_cameras && <InfoRow label="كاميرات المراقبة" value={listing.surveillance_cameras} />}
                {listing.liabilities && <InfoRow label="الالتزامات" value={listing.liabilities} />}
              </div>

              {/* Deal-type-aware Transparency Indicator */}
              <TransparencyIndicator listing={listing} className="mb-4" />

              {/* Seller Trust Badge */}
              {sellerProfile && (
                <div className="mb-4 p-3 bg-muted/20 rounded-xl">
                  <p className="text-[11px] text-muted-foreground mb-2">مستوى ثقة البائع</p>
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
                <div className="w-full text-center py-3 rounded-xl bg-muted/40 text-muted-foreground text-sm">
                  عرض توضيحي — التفاوض غير متاح
                </div>
              )}

              {/* Seller Reviews */}
              {sellerReviews.length > 0 && (
                <SellerReviewsSummary reviews={sellerReviews} className="mt-4" />
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
      </div>
      </div>
    </>
  );
};

// ---- Sub-components ----

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

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
