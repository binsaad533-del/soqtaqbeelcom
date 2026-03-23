import { useState, useEffect, useCallback } from "react";
import { Shield, AlertTriangle, CheckCircle2, Clock, FileCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import AiStar from "./AiStar";
import DealRiskIndicator from "./DealRiskIndicator";
import { DEAL_TYPE_MAP, type DealTypeConfig } from "@/lib/dealStructureConfig";
import { useLegalConfirmation, CONFIRMATION_LABELS } from "@/hooks/useLegalConfirmation";
import { useAuthContext } from "@/contexts/AuthContext";
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
}

interface Props {
  deal: DealData;
  listing: ListingData | null;
  onConfirmed: () => void;
}

const LegalConfirmationPanel = ({ deal, listing, onConfirmed }: Props) => {
  const { user } = useAuthContext();
  const { getConfirmations, submitConfirmation, loading, REQUIRED_CONFIRMATIONS } = useLegalConfirmation();

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [buyerConfirmed, setBuyerConfirmed] = useState(false);
  const [sellerConfirmed, setSellerConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<"summary" | "risks" | "confirm">("summary");

  const isBuyer = user?.id === deal.buyer_id;
  const isSeller = user?.id === deal.seller_id;
  const partyRole = isBuyer ? "buyer" : "seller";

  // Resolve deal types
  const primaryTypeId = listing?.primary_deal_type || listing?.deal_type || deal.deal_type || "full_takeover";
  const primaryType = DEAL_TYPE_MAP[primaryTypeId];
  const altTypes: DealTypeConfig[] = [];
  if (listing?.deal_options && Array.isArray(listing.deal_options)) {
    for (const opt of listing.deal_options as any[]) {
      const id = typeof opt === "string" ? opt : opt?.type_id;
      if (id && id !== primaryTypeId && DEAL_TYPE_MAP[id]) altTypes.push(DEAL_TYPE_MAP[id]);
    }
  }

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
  }, [loadStatus]);

  const allChecked = REQUIRED_CONFIRMATIONS.every(c => checked[c]);

  const handleSubmit = async () => {
    const snapshot = {
      deal_type: primaryTypeId,
      price: deal.agreed_price || listing?.price,
      listing_title: listing?.title || listing?.business_activity,
      risk_score: deal.risk_score,
      includes: primaryType?.includes,
      excludes: primaryType?.excludes,
    };

    const result = await submitConfirmation(
      deal.id,
      partyRole as "buyer" | "seller",
      Object.keys(checked).filter(k => checked[k]),
      snapshot,
    );

    if (!result.error) {
      setSubmitted(true);
      await loadStatus();
    }
  };

  const toggleCheck = (key: string) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));

  // Risk warnings
  const warnings: string[] = [];
  if (deal.risk_score && deal.risk_score >= 50) warnings.push(`هذه الصفقة مصنفة كمخاطرة ${deal.risk_score >= 70 ? "عالية" : "متوسطة"}`);
  if (deal.fraud_flags && Array.isArray(deal.fraud_flags) && deal.fraud_flags.length > 0) warnings.push("تم رصد مؤشرات احتيال محتملة");
  if (primaryType?.cautionNotes) warnings.push(...primaryType.cautionNotes);

  // If deal is already locked
  if (deal.locked || deal.status === "finalized") {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-soft border border-primary/20 text-center">
        <CheckCircle2 size={40} className="text-primary mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">تمت الموافقة النهائية</h2>
        <p className="text-sm text-muted-foreground">تمت موافقة الطرفين وتم قفل الصفقة بنجاح.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-base">التأكيد القانوني الذكي</h2>
            <p className="text-xs text-muted-foreground">يجب على الطرفين إتمام هذه الخطوة قبل إنهاء الصفقة</p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2">
          {(["summary", "risks", "confirm"] as const).map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={cn(
                "flex-1 text-center py-2 rounded-xl text-xs font-medium transition-all",
                step === s
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              )}
            >
              {i + 1}. {s === "summary" ? "ملخص الصفقة" : s === "risks" ? "المخاطر والتحذيرات" : "التأكيد والموافقة"}
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Deal Summary */}
      {step === "summary" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/30">
            <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
              <FileCheck size={16} className="text-primary" />
              ملخص الصفقة
            </h3>
            <div className="space-y-3">
              <Row label="الفرصة" value={listing?.title || listing?.business_activity || "—"} />
              <Row label="نوع الصفقة الأساسي" value={primaryType?.label || primaryTypeId} highlight />
              <Row label="السعر" value={
                (deal.agreed_price || listing?.price)
                  ? `${Number(deal.agreed_price || listing?.price).toLocaleString("en-US")} ر.س`
                  : "غير محدد"
              } />
              <Row label="الموقع" value={`${listing?.district || ""} ${listing?.city || ""}`.trim() || "—"} />
              {listing?.lease_duration && <Row label="مدة الإيجار" value={listing.lease_duration} />}
              {listing?.annual_rent && <Row label="الإيجار السنوي" value={`${listing.annual_rent.toLocaleString("en-US")} ر.س`} />}
            </div>
          </div>

          {/* Included / Excluded */}
          {primaryType && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-primary/10">
                <h4 className="text-xs font-medium text-primary mb-3">✓ مشمول في الصفقة</h4>
                <ul className="space-y-1.5">
                  {primaryType.includes.map((item, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                      <CheckCircle2 size={12} className="text-primary mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-destructive/10">
                <h4 className="text-xs font-medium text-destructive mb-3">✗ غير مشمول</h4>
                {primaryType.excludes.length > 0 ? (
                  <ul className="space-y-1.5">
                    {primaryType.excludes.map((item, i) => (
                      <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                        <AlertTriangle size={12} className="text-destructive mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">لا يوجد استثناءات — يشمل كل شيء</p>
                )}
              </div>
            </div>
          )}

          {/* Alternative deal types */}
          {altTypes.length > 0 && (
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
              <h4 className="text-xs font-medium mb-3 flex items-center gap-2">
                <Info size={14} className="text-muted-foreground" />
                خيارات بديلة متاحة
              </h4>
              <div className="space-y-2">
                {altTypes.map(alt => (
                  <div key={alt.id} className="bg-muted/30 rounded-xl px-4 py-2.5">
                    <span className="text-xs font-medium">{alt.label}</span>
                    <p className="text-[11px] text-muted-foreground">{alt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={() => setStep("risks")} className="w-full rounded-xl">
            التالي — المخاطر والتحذيرات
          </Button>
        </div>
      )}

      {/* Step 2: Risks */}
      {step === "risks" && (
        <div className="space-y-4">
          {/* AI Warnings */}
          {warnings.length > 0 && (
            <div className="bg-card rounded-2xl p-6 shadow-soft border border-amber-500/20">
              <div className="flex items-center gap-2 mb-4">
                <AiStar size={18} />
                <h3 className="font-medium text-sm">تحذيرات الذكاء الاصطناعي</h3>
              </div>
              <div className="space-y-2.5">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-amber-500/5 rounded-xl px-4 py-3">
                    <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <span className="text-xs leading-relaxed">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deal risk indicator */}
          {deal.risk_score !== null && deal.risk_score !== undefined && (
            <DealRiskIndicator riskScore={deal.risk_score} riskFactors={deal.risk_factors || []} />
          )}

          {/* Mandatory disclosures */}
          {primaryType && primaryType.mandatoryDisclosures.length > 0 && (
            <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/30">
              <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Shield size={14} className="text-primary" />
                الإفصاحات الإلزامية لهذا النوع
              </h3>
              <ul className="space-y-1.5">
                {primaryType.mandatoryDisclosures.map((d, i) => (
                  <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* General risk notice */}
          <div className="bg-muted/30 rounded-2xl p-5 border border-border/20">
            <div className="flex items-start gap-2.5">
              <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
                <p>• تحليل الذكاء الاصطناعي استشاري فقط ولا يُعد مشورة قانونية.</p>
                <p>• يجب التحقق من حالة الأصول فعلياً قبل الإتمام.</p>
                <p>• المنصة وسيط تقني ولا تتحمل مسؤولية قرارات الأطراف.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("summary")} className="flex-1 rounded-xl">
              السابق
            </Button>
            <Button onClick={() => setStep("confirm")} className="flex-1 rounded-xl">
              التالي — التأكيد النهائي
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === "confirm" && (
        <div className="space-y-4">
          {/* Dual approval status */}
          <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/30">
            <h3 className="font-medium text-sm mb-4">حالة الموافقة</h3>
            <div className="grid grid-cols-2 gap-4">
              <ApprovalCard label="المشتري" confirmed={buyerConfirmed} isYou={isBuyer} />
              <ApprovalCard label="البائع" confirmed={sellerConfirmed} isYou={isSeller} />
            </div>
          </div>

          {/* Checkboxes */}
          {!submitted ? (
            <div className="bg-card rounded-2xl p-6 shadow-soft border border-primary/10">
              <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
                <Shield size={14} className="text-primary" />
                إقرار وموافقة — {isBuyer ? "المشتري" : "البائع"}
              </h3>
              <div className="space-y-4">
                {REQUIRED_CONFIRMATIONS.map(key => (
                  <label
                    key={key}
                    className="flex items-start gap-3 cursor-pointer group"
                    onClick={() => toggleCheck(key)}
                  >
                    <Checkbox
                      checked={!!checked[key]}
                      onCheckedChange={() => toggleCheck(key)}
                      className="mt-0.5"
                    />
                    <span className="text-sm leading-relaxed group-hover:text-foreground transition-colors">
                      {CONFIRMATION_LABELS[key]}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep("risks")} className="flex-1 rounded-xl">
                  السابق
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!allChecked || loading}
                  className="flex-1 rounded-xl gradient-primary text-primary-foreground"
                >
                  {loading ? "جاري التأكيد..." : "تأكيد الموافقة النهائية"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl p-8 shadow-soft border border-primary/20 text-center">
              <CheckCircle2 size={32} className="text-primary mx-auto mb-3" />
              <h3 className="font-medium text-sm mb-1">تم تسجيل موافقتك</h3>
              <p className="text-xs text-muted-foreground">
                {buyerConfirmed && sellerConfirmed
                  ? "تمت الموافقة من الطرفين — سيتم قفل الصفقة وإنشاء العقد تلقائياً."
                  : "في انتظار موافقة الطرف الآخر لإتمام الصفقة."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn("font-medium", highlight && "text-primary")}>{value}</span>
  </div>
);

const ApprovalCard = ({ label, confirmed, isYou }: { label: string; confirmed: boolean; isYou: boolean }) => (
  <div className={cn(
    "rounded-xl p-4 text-center border transition-all",
    confirmed
      ? "bg-primary/5 border-primary/20"
      : "bg-muted/20 border-border/30"
  )}>
    {confirmed
      ? <CheckCircle2 size={20} className="text-primary mx-auto mb-2" />
      : <Clock size={20} className="text-muted-foreground mx-auto mb-2" />
    }
    <p className="text-xs font-medium">{label}{isYou ? " (أنت)" : ""}</p>
    <p className={cn("text-[11px] mt-1", confirmed ? "text-primary" : "text-muted-foreground")}>
      {confirmed ? "تمت الموافقة ✓" : "في الانتظار..."}
    </p>
  </div>
);

export default LegalConfirmationPanel;
