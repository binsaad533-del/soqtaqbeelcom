import { Link, useParams, useNavigate } from "react-router-dom";
import { MapPin, FileText, MessageCircle, Building2, Loader2 } from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import DealCheckPanel from "@/components/DealCheckPanel";
import { useState, useEffect } from "react";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals } from "@/hooks/useDeals";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ListingDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { getListing } = useListings();
  const { createDeal, getMyDeals } = useDeals();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingDeal, setStartingDeal] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const data = await getListing(id);
      setListing(data);
      setLoading(false);
    };
    load();
  }, [id, getListing]);

  const handleStartNegotiation = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!listing) return;

    // Check if deal already exists
    const myDeals = await getMyDeals();
    const existing = myDeals.find(d => d.listing_id === listing.id);
    if (existing) {
      navigate(`/negotiate/${existing.id}`);
      return;
    }

    setStartingDeal(true);
    const { data, error } = await createDeal(listing.id, listing.owner_id);
    if (error) {
      toast.error("حدث خطأ أثناء بدء التفاوض");
    } else if (data) {
      navigate(`/negotiate/${data.id}`);
    }
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

  const dealTypeLabel = listing.deal_type === "full" ? "تقبّل كامل" : listing.deal_type === "partial" ? "تقبّل جزئي" : listing.deal_type || "—";

  return (
    <div className="py-8">
      <div className="container">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/marketplace" className="hover:text-foreground transition-colors">السوق</Link>
          <span>/</span>
          <span className="text-foreground">{listing.title || listing.business_activity || "فرصة تقبّل"}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.length > 0 ? photos.slice(0, 6).map((url, i) => (
                <div key={i} className="aspect-[4/3] bg-card rounded-xl shadow-soft overflow-hidden">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              )) : [1, 2, 3].map(i => (
                <div key={i} className="aspect-[4/3] bg-card rounded-xl gradient-hero flex items-center justify-center shadow-soft">
                  <Building2 size={24} strokeWidth={1} className="text-muted-foreground/20" />
                </div>
              ))}
            </div>

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

            {/* AI Deal Check Panel */}
            <DealCheckPanel listing={listing} />
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-card rounded-2xl p-6 shadow-soft sticky top-20">
              <h2 className="text-xl font-medium mb-1">{listing.title || listing.business_activity || "فرصة تقبّل"}</h2>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                <MapPin size={14} strokeWidth={1.3} />
                {listing.district && `${listing.district}, `}{listing.city || "—"}
              </div>

              <div className="text-2xl font-medium gradient-text mb-6">
                {listing.price ? `${Number(listing.price).toLocaleString("en-US")}` : "—"} <span className="text-sm">ر.س</span>
              </div>

              <div className="space-y-3 mb-6">
                <InfoRow label="نوع الصفقة" value={dealTypeLabel} />
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

              {!isOwner && (
                <Button
                  onClick={handleStartNegotiation}
                  disabled={startingDeal}
                  className="w-full gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]"
                >
                  {startingDeal ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <MessageCircle size={16} strokeWidth={1.5} />
                  )}
                  ابدأ التفاوض
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

export default ListingDetailsPage;
