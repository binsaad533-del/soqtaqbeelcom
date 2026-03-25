import { useState, useEffect, useCallback, useRef } from "react";
import { Shield, CheckCircle2, Clock, User, Phone, Mail, ImageIcon, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DEAL_TYPE_MAP } from "@/lib/dealStructureConfig";
import { useLegalConfirmation, CONFIRMATION_LABELS, SELLER_CONFIRMATIONS } from "@/hooks/useLegalConfirmation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { COMMISSION_RATE } from "@/hooks/useCommissions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DealData {
  id: string;
  listing_id: string;
  buyer_id: string | null;
  seller_id: string | null;
  status: string;
  deal_type: string | null;
  agreed_price: number | null;
  deal_details: any;
  locked: boolean;
  risk_score?: number | null;
  risk_factors?: any;
  fraud_flags?: any;
}

interface ListingData {
  title?: string | null;
  business_activity?: string | null;
  price?: number | null;
  city?: string | null;
  district?: string | null;
  deal_type?: string;
  deal_options?: any;
  primary_deal_type?: string | null;
  lease_duration?: string | null;
  annual_rent?: number | null;
  lease_remaining?: string | null;
  inventory?: any;
  photos?: any;
  description?: string | null;
  category?: string | null;
  municipality_license?: string | null;
  civil_defense_license?: string | null;
  surveillance_cameras?: string | null;
  liabilities?: string | null;
  overdue_rent?: string | null;
  overdue_salaries?: string | null;
  documents?: any;
}

interface Props {
  deal: DealData;
  listing: ListingData | null;
  onConfirmed: () => void;
}

const LegalConfirmationPanel = ({ deal, listing, onConfirmed }: Props) => {
  const { user } = useAuthContext();
  const { getConfirmations, submitConfirmation, loading, REQUIRED_CONFIRMATIONS } = useLegalConfirmation();
  const { getProfile } = useProfiles();

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [buyerConfirmed, setBuyerConfirmed] = useState(false);
  const [sellerConfirmed, setSellerConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [buyerProfile, setBuyerProfile] = useState<Profile | null>(null);
  const [sellerProfile, setSellerProfile] = useState<Profile | null>(null);
  const [buyerEmail, setBuyerEmail] = useState<string | null>(null);
  const [sellerEmail, setSellerEmail] = useState<string | null>(null);

  const isBuyer = user?.id === deal.buyer_id;
  const isSeller = user?.id === deal.seller_id;
  const partyRole = isBuyer ? "buyer" : "seller";

  const primaryTypeId = listing?.primary_deal_type || listing?.deal_type || deal.deal_type || "full_takeover";
  const primaryType = DEAL_TYPE_MAP[primaryTypeId];

  const agreedPrice = deal.agreed_price || listing?.price;

  // Load profiles + confirmation status
  const loadStatus = useCallback(async () => {
    const confirmations = await getConfirmations(deal.id);
    const bc = confirmations.some(c => c.party_role === "buyer");
    const sc = confirmations.some(c => c.party_role === "seller");
    setBuyerConfirmed(bc);
    setSellerConfirmed(sc);
    if ((isBuyer && bc) || (isSeller && sc)) setSubmitted(true);
    if (bc && sc) onConfirmed();
  }, [deal.id, getConfirmations, isBuyer, isSeller, onConfirmed]);

  useEffect(() => {
    loadStatus();
    // Load both profiles
    if (deal.buyer_id) {
      getProfile(deal.buyer_id).then(p => setBuyerProfile(p));
      supabase.auth.admin?.getUserById?.(deal.buyer_id).catch(() => {});
    }
    if (deal.seller_id) {
      getProfile(deal.seller_id).then(p => setSellerProfile(p));
    }
  }, [deal.buyer_id, deal.seller_id, getProfile, loadStatus]);

  // Get emails from auth context for current user
  useEffect(() => {
    if (user) {
      if (isBuyer) setBuyerEmail(user.email || null);
      if (isSeller) setSellerEmail(user.email || null);
    }
  }, [user, isBuyer, isSeller]);

  const activeConfirmations = isSeller ? SELLER_CONFIRMATIONS : REQUIRED_CONFIRMATIONS;
  const allChecked = activeConfirmations.every(c => checked[c]);

  const [pdfLoading, setPdfLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    const snapshot = {
      deal_type: primaryTypeId,
      price: agreedPrice,
      listing_title: listing?.title || listing?.business_activity,
    };
    const result = await submitConfirmation(
      deal.id,
      partyRole as "buyer" | "seller",
      Object.keys(checked).filter(k => checked[k]),
      snapshot,
    );
    if (result.error) {
      toast.error("حدث خطأ أثناء تسجيل الموافقة، يرجى المحاولة مرة أخرى");
    } else {
      toast.success("تم تسجيل موافقتك بنجاح");
      setSubmitted(true);
      await loadStatus();
    }
  };

  const handleExportPdf = async () => {
    if (!contentRef.current) return;
    setPdfLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const title = listing?.title || listing?.business_activity || "agreement";
      pdf.save(`وثيقة-تأكيد-${title}.pdf`);
      toast.success("تم تحميل الوثيقة بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء إنشاء ملف PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  // Photos
  const photos: string[] = [];
  if (listing?.photos) {
    const p = listing.photos;
    if (typeof p === "object" && !Array.isArray(p)) {
      for (const key of Object.keys(p)) {
        const val = (p as any)[key];
        if (typeof val === "string" && val.startsWith("http")) photos.push(val);
      }
    } else if (Array.isArray(p)) {
      for (const item of p) {
        if (typeof item === "string" && item.startsWith("http")) photos.push(item);
      }
    }
  }

  // Inventory
  const inventory = Array.isArray(listing?.inventory) ? listing.inventory : [];

  // Documents
  const documents = Array.isArray(listing?.documents) ? listing.documents : [];

  if (deal.locked || deal.status === "finalized") {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-soft border border-primary/20 text-center space-y-4">
        <CheckCircle2 size={40} className="text-primary mx-auto" />
        <h2 className="text-lg font-semibold">تمت الموافقة النهائية</h2>
        <p className="text-sm text-muted-foreground">تمت موافقة الطرفين وتم قفل الصفقة بنجاح.</p>
        <Button onClick={handleExportPdf} disabled={pdfLoading} variant="outline" className="rounded-xl gap-2">
          {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          تحميل وثيقة التأكيد PDF
        </Button>
      </div>
    );
  }

  return (
    <div ref={contentRef} className="space-y-5">
      {/* Header */}
      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-base">التأكيد القانوني</h2>
            <p className="text-[11px] text-muted-foreground">مراجعة نهائية قبل إتمام الصفقة</p>
          </div>
        </div>
      </div>

      {/* Parties Info */}
      <div className="grid grid-cols-2 gap-3">
        <PartyCard
          label="البائع"
          profile={sellerProfile}
          email={sellerEmail || (isSeller ? user?.email : null) || null}
          confirmed={sellerConfirmed}
          isYou={isSeller}
        />
        <PartyCard
          label="المشتري"
          profile={buyerProfile}
          email={buyerEmail || (isBuyer ? user?.email : null) || null}
          confirmed={buyerConfirmed}
          isYou={isBuyer}
        />
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/30">
          <h3 className="text-xs font-medium mb-3 flex items-center gap-2">
            <ImageIcon size={14} className="text-muted-foreground" />
            صور الفرصة ({photos.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`صورة ${i + 1}`}
                className="w-full h-24 object-cover rounded-xl border border-border/20"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      )}

      {/* Full Deal Details */}
      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
        <h3 className="text-sm font-medium mb-4">تفاصيل الصفقة</h3>
        <div className="space-y-2.5">
          <Row label="الفرصة" value={listing?.title || listing?.business_activity || "—"} />
          <Row label="نوع الصفقة" value={primaryType?.label || primaryTypeId} highlight />
          {listing?.category && <Row label="التصنيف" value={listing.category} />}
          <Row label="الموقع" value={`${listing?.district || ""} ${listing?.city || ""}`.trim() || "—"} />
          {listing?.description && (
            <div className="pt-1">
              <span className="text-[11px] text-muted-foreground block mb-1">الوصف</span>
              <p className="text-xs text-foreground/80 leading-relaxed">{listing.description}</p>
            </div>
          )}
          {listing?.lease_duration && <Row label="مدة الإيجار" value={listing.lease_duration} />}
          {listing?.lease_remaining && <Row label="المتبقي من الإيجار" value={listing.lease_remaining} />}
          {listing?.annual_rent && <Row label="الإيجار السنوي" value={`${listing.annual_rent.toLocaleString("en-US")} ر.س`} />}
          {listing?.municipality_license && <Row label="رخصة البلدية" value={listing.municipality_license} />}
          {listing?.civil_defense_license && <Row label="رخصة الدفاع المدني" value={listing.civil_defense_license} />}
          {listing?.surveillance_cameras && <Row label="كاميرات المراقبة" value={listing.surveillance_cameras} />}
          {listing?.liabilities && <Row label="الالتزامات" value={listing.liabilities} />}
          {listing?.overdue_rent && <Row label="إيجار متأخر" value={listing.overdue_rent} />}
          {listing?.overdue_salaries && <Row label="رواتب متأخرة" value={listing.overdue_salaries} />}
        </div>
      </div>

      {/* Inventory */}
      {inventory.length > 0 && (
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
          <h3 className="text-xs font-medium mb-3">الأصول والمخزون ({inventory.length})</h3>
          <div className="space-y-2">
            {inventory.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs bg-muted/20 rounded-xl px-3 py-2">
                <span className="text-foreground/80">{item.name || item.item || `عنصر ${i + 1}`}</span>
                <span className="text-muted-foreground">
                  {item.quantity ? `${item.quantity} ×` : ""} {item.price ? `${Number(item.price).toLocaleString("en-US")} ر.س` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
          <h3 className="text-xs font-medium mb-3">المستندات المرفقة ({documents.length})</h3>
          <div className="space-y-1.5">
            {documents.map((doc: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                <CheckCircle2 size={12} className="text-primary shrink-0" />
                <span>{typeof doc === "string" ? doc : doc.name || doc.label || `مستند ${i + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Included / Excluded */}
      {primaryType && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 shadow-soft border border-primary/10">
            <h4 className="text-[11px] font-medium text-primary mb-2">✓ مشمول في الصفقة</h4>
            <ul className="space-y-1">
              {primaryType.includes.map((item, i) => (
                <li key={i} className="text-[11px] text-foreground/80 flex items-start gap-1.5">
                  <CheckCircle2 size={10} className="text-primary mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {primaryType.excludes.length > 0 && (
            <div className="bg-card rounded-2xl p-4 shadow-soft border border-destructive/10">
              <h4 className="text-[11px] font-medium text-destructive mb-2">✗ غير مشمول</h4>
              <ul className="space-y-1">
                {primaryType.excludes.map((item, i) => (
                  <li key={i} className="text-[11px] text-foreground/80 flex items-start gap-1.5">
                    <span className="text-destructive mt-0.5 shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Agreed Price — prominent */}
      <div className="bg-primary/5 rounded-2xl p-5 border border-primary/15 text-center">
        <span className="text-xs text-muted-foreground block mb-1">السعر المتفق عليه</span>
        <span className="text-2xl font-bold text-primary tabular-nums">
          {agreedPrice ? `${Number(agreedPrice).toLocaleString("en-US")} ر.س` : "غير محدد بعد"}
        </span>
      </div>

      {/* Confirmation / Approval */}
      {!submitted ? (
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-primary/10">
          <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
            <Shield size={14} className="text-primary" />
            إقرار وموافقة — {isBuyer ? "المشتري" : "البائع"}
          </h3>
          <div className="space-y-3">
            {activeConfirmations.map(key => (
              <label
                key={key}
                className={cn(
                  "flex items-start gap-3 cursor-pointer group",
                  key === "commission_acknowledged" && "bg-primary/5 rounded-xl p-3 border border-primary/10"
                )}
              >
                <Checkbox
                  checked={!!checked[key]}
                  onCheckedChange={(value) => setChecked(prev => ({ ...prev, [key]: Boolean(value) }))}
                  className="mt-0.5"
                />
                <span className={cn(
                  "text-xs leading-relaxed group-hover:text-foreground transition-colors",
                  key === "commission_acknowledged" && "font-medium"
                )}>
                  {CONFIRMATION_LABELS[key]}
                </span>
              </label>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!allChecked || loading}
            className="w-full mt-5 rounded-xl"
          >
            {loading ? "جاري التأكيد..." : "تأكيد الموافقة النهائية"}
          </Button>
          <Button onClick={handleExportPdf} disabled={pdfLoading} variant="outline" size="sm" className="w-full mt-2 rounded-xl gap-2">
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            تحميل وثيقة التأكيد PDF
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl p-6 shadow-soft border border-primary/20 text-center space-y-3">
          <CheckCircle2 size={28} className="text-primary mx-auto" />
          <h3 className="font-medium text-sm">تم تسجيل موافقتك</h3>
          <p className="text-xs text-muted-foreground">
            {buyerConfirmed && sellerConfirmed
              ? "تمت الموافقة من الطرفين — سيتم قفل الصفقة وإنشاء العقد تلقائياً."
              : "في انتظار موافقة الطرف الآخر لإتمام الصفقة."}
          </p>
          <Button onClick={handleExportPdf} disabled={pdfLoading} variant="outline" size="sm" className="rounded-xl gap-2">
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            تحميل وثيقة التأكيد PDF
          </Button>
        </div>
      )}

      {/* Commission — subtle footer */}
      {agreedPrice && (
        <div className="text-center pt-1">
          <p className="text-[10px] text-muted-foreground/50">
            عمولة المنصة {COMMISSION_RATE * 100}% = {Math.round(Number(agreedPrice) * COMMISSION_RATE).toLocaleString("en-US")} ر.س
          </p>
        </div>
      )}
    </div>
  );
};

/* ─── Sub-components ─── */

const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn("font-medium", highlight && "text-primary")}>{value}</span>
  </div>
);

const PartyCard = ({
  label,
  profile,
  email,
  confirmed,
  isYou,
}: {
  label: string;
  profile: Profile | null;
  email: string | null;
  confirmed: boolean;
  isYou: boolean;
}) => (
  <div className={cn(
    "rounded-2xl p-4 border transition-all",
    confirmed ? "bg-primary/5 border-primary/20" : "bg-card border-border/30"
  )}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] font-medium">{label}{isYou ? " (أنت)" : ""}</span>
      {confirmed
        ? <CheckCircle2 size={14} className="text-primary" />
        : <Clock size={14} className="text-muted-foreground" />
      }
    </div>
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs">
        <User size={11} className="text-muted-foreground shrink-0" />
        <span className="truncate">{profile?.full_name || "—"}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <Phone size={11} className="text-muted-foreground shrink-0" />
        <span className="truncate" dir="ltr">{profile?.phone || "—"}</span>
      </div>
      {email && (
        <div className="flex items-center gap-1.5 text-xs">
          <Mail size={11} className="text-muted-foreground shrink-0" />
          <span className="truncate" dir="ltr">{email}</span>
        </div>
      )}
    </div>
    <p className={cn("text-[10px] mt-2", confirmed ? "text-primary" : "text-muted-foreground")}>
      {confirmed ? "تمت الموافقة ✓" : "في الانتظار..."}
    </p>
  </div>
);

export default LegalConfirmationPanel;
