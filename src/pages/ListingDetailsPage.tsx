import { Link, useParams, useNavigate } from "react-router-dom";
import { MapPin, FileText, MessageCircle, Building2, Loader2, Check, AlertTriangle, Shield, Star } from "lucide-react";
import AiStar from "@/components/AiStar";
import TrustBadge, { getSellerBadges } from "@/components/TrustBadge";
import SellerReviewsSummary from "@/components/SellerReviewsSummary";
import { Button } from "@/components/ui/button";
import DealCheckPanel from "@/components/DealCheckPanel";
import { useState, useEffect } from "react";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals } from "@/hooks/useDeals";
import { useProfiles } from "@/hooks/useProfiles";
import { useSellerReviews, type SellerReview } from "@/hooks/useSellerReviews";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DEAL_TYPE_MAP } from "@/lib/dealStructureConfig";
import { cn } from "@/lib/utils";
import SimulationOverlay, { isSimulationImage, hasSimulationPhotos } from "@/components/SimulationOverlay";
import { Info } from "lucide-react";

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
  const [startingDeal, setStartingDeal] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const data = await getListing(id);
      setListing(data);
      if (data) {
        const [profile, reviews] = await Promise.all([
          getProfile(data.owner_id),
          getSellerReviews(data.owner_id),
        ]);
        setSellerProfile(profile);
        setSellerReviews(reviews);
      }
      setLoading(false);
    };
    load();
  }, [id, getListing]);

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
    <div className="py-8">
      <div className="container">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/marketplace" className="hover:text-foreground transition-colors">السوق</Link>
          <span>/</span>
          <span className="text-foreground">{listing.title || listing.business_activity || "فرصة تقبيل"}</span>
        </div>

        {isSimulation && (
          <div className="mb-5 rounded-2xl bg-primary/5 border border-primary/15 p-4 flex items-start gap-3" dir="rtl">
            <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Info size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">هذا الإعلان للعرض التوضيحي فقط</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                هذه الصفقة مجرد محاكاة لتوضيح طريقة عمل المنصة. لا يمكن التفاوض عليها أو إتمامها. 
                تصفّح <Link to="/marketplace" className="text-primary hover:underline font-medium">السوق</Link> لاستعراض الفرص الحقيقية عند توفرها.
              </p>
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
                        <span className={`text-xs px-2 py-0.5 rounded-md ${item.condition === "جيدة" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
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

            <DealCheckPanel listing={listing} />
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-card rounded-2xl p-6 shadow-soft sticky top-20">
              <h2 className="text-xl font-medium mb-1">{listing.title || listing.business_activity || "فرصة تقبيل"}</h2>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                <MapPin size={14} strokeWidth={1.3} />
                {listing.district && `${listing.district}, `}{listing.city || "—"}
              </div>

              <div className="text-2xl font-medium gradient-text mb-6">
                {listing.price ? `${Number(listing.price).toLocaleString("en-US")}` : "—"} <span className="text-sm">ر.س</span>
              </div>

              <div className="space-y-3 mb-6">
                <InfoRow label="نوع الصفقة" value={primaryConfig?.label || listing.deal_type || "—"} />
                {listing.annual_rent && <InfoRow label="الإيجار السنوي" value={`${Number(listing.annual_rent).toLocaleString("en-US")} ر.س`} />}
                {listing.lease_duration && <InfoRow label="مدة العقد" value={listing.lease_duration} />}
                {listing.lease_remaining && <InfoRow label="المتبقي" value={listing.lease_remaining} />}
                {listing.municipality_license && <InfoRow label="رخصة البلدية" value={listing.municipality_license} />}
                {listing.civil_defense_license && <InfoRow label="الدفاع المدني" value={listing.civil_defense_license} />}
                {listing.surveillance_cameras && <InfoRow label="كاميرات المراقبة" value={listing.surveillance_cameras} />}
                {listing.liabilities && <InfoRow label="الالتزامات" value={listing.liabilities} />}
              </div>

              {listing.disclosure_score !== null && listing.disclosure_score > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full gradient-primary" style={{ width: `${listing.disclosure_score}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">إفصاح {listing.disclosure_score}%</span>
                </div>
              )}

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

              {!isOwner && (
                <Button
                  onClick={handleStartNegotiation}
                  disabled={startingDeal}
                  className="w-full gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]"
                >
                  {startingDeal ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} strokeWidth={1.5} />}
                  ابدأ التفاوض
                </Button>
              )}

              {/* Seller Reviews */}
              {sellerReviews.length > 0 && (
                <SellerReviewsSummary reviews={sellerReviews} className="mt-4" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
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
          <div className="text-xs text-muted-foreground font-medium">خيارات بديلة متاحة</div>
          {alternatives.map((alt, idx) => {
            const config = DEAL_TYPE_MAP[alt.type_id];
            if (!config) return null;
            return (
              <div key={alt.type_id} className="border border-border/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">بديل {idx + 1}</span>
                  <span className="text-sm">{config.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{config.desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ListingDetailsPage;
