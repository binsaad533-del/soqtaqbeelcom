import { useState, useEffect } from "react";
import { t, DEAL_TYPE_LABELS } from "@/lib/translations";
import { useParams, Link } from "react-router-dom";
import {
  Check, Download, ArrowRight, FileText, Shield, Clock, AlertTriangle,
  Lock, History, ChevronDown, ChevronUp, Loader2, Copy, CheckCircle2
} from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings } from "@/hooks/useListings";
import { useCommissions, type Commission } from "@/hooks/useCommissions";
import CommissionBanner from "@/components/CommissionBanner";
import CommissionPaymentPanel from "@/components/CommissionPaymentPanel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AgreementRecord {
  id: string;
  deal_id: string;
  version: number;
  agreement_number: string;
  status: string;
  buyer_name: string | null;
  buyer_contact: string | null;
  seller_name: string | null;
  seller_contact: string | null;
  deal_title: string | null;
  deal_type: string | null;
  location: string | null;
  business_activity: string | null;
  included_assets: any[];
  excluded_assets: any[];
  financial_terms: Record<string, any>;
  declarations: Record<string, any>;
  documents_referenced: any[];
  liabilities: Record<string, any>;
  important_notes: any[];
  license_status: Record<string, any>;
  lease_details: Record<string, any>;
  buyer_approved: boolean;
  buyer_approved_at: string | null;
  seller_approved: boolean;
  seller_approved_at: string | null;
  pdf_path: string | null;
  previous_version_id: string | null;
  amendment_reason: string | null;
  created_at: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  actor_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

const AgreementPage = () => {
  const { id } = useParams(); // deal ID
  const { user } = useAuthContext();
  const { getListing } = useListings();
  const { getCommission } = useCommissions();
  const [agreement, setAgreement] = useState<AgreementRecord | null>(null);
  const [allVersions, setAllVersions] = useState<AgreementRecord[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [deal, setDeal] = useState<any>(null);
  const [commission, setCommission] = useState<Commission | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Load deal
      const { data: dealData } = await supabase
        .from("deals")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setDeal(dealData);

      // Load agreements
      const { data: agreements } = await supabase
        .from("deal_agreements")
        .select("*")
        .eq("deal_id", id)
        .order("version", { ascending: false });

      if (agreements && agreements.length > 0) {
        setAgreement(agreements[0] as unknown as AgreementRecord);
        setAllVersions(agreements as unknown as AgreementRecord[]);
      }

      // Load history
      const { data: historyData } = await supabase
        .from("deal_history")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false });
      if (historyData) setHistory(historyData as unknown as HistoryEntry[]);

      // Load commission
      const commData = await getCommission(id);
      setCommission(commData);

    } catch (e) {
      console.error("Failed to load agreement:", e);
    }
    setLoading(false);
  };

  const generateAgreement = async () => {
    if (!deal) return;
    setGenerating(true);
    try {
      // Load listing data for context
      const listing = await getListing(deal.listing_id);

      // Get profiles for buyer/seller
      const { data: buyerProfile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", deal.buyer_id)
        .maybeSingle();
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", deal.seller_id)
        .maybeSingle();

      const agreementData = {
        dealId: id,
        agreementData: {
          actorId: user?.id,
          buyerName: buyerProfile?.full_name || "المشتري",
          buyerContact: buyerProfile?.phone || "",
          sellerName: sellerProfile?.full_name || "البائع",
          sellerContact: sellerProfile?.phone || "",
          dealTitle: listing?.title || listing?.business_activity || "صفقة تقبيل",
          dealType: listing?.deal_type || "full",
          location: `${listing?.district || ""}, ${listing?.city || ""}`.replace(/^, |, $/, ""),
          businessActivity: listing?.business_activity || "",
          includedAssets: (listing?.inventory || []).map((i: any) => `${i.name} (${i.qty})`),
          excludedAssets: [],
          financialTerms: {
            agreedPrice: deal.agreed_price || listing?.price || 0,
            currency: "ر.س",
            paymentNote: "حسب الاتفاق بين الطرفين",
          },
          declarations: {
            buyerDeclares: "أقر بمراجعة جميع البيانات المقدمة والموافقة عليها",
            sellerDeclares: "أقر بصحة المعلومات المقدمة حسب علمي",
            platformNote: "المنصة وسيط تقني فقط — الاتفاق بين الطرفين مباشرة",
          },
          documentsReferenced: (listing?.documents || []).filter((d: any) => d.status === "مرفق").map((d: any) => d.name),
          liabilities: {
            financialLiabilities: listing?.liabilities || "لا توجد",
            delayedSalaries: listing?.overdue_salaries || "لا يوجد",
            unpaidRent: listing?.overdue_rent || "لا يوجد",
          },
          importantNotes: [],
          licenseStatus: {
            municipality: listing?.municipality_license || "—",
            civilDefense: listing?.civil_defense_license || "—",
            cameras: listing?.surveillance_cameras || "—",
          },
          leaseDetails: {
            annualRent: listing?.annual_rent ? `${Number(listing.annual_rent).toLocaleString("en-US")} ر.س` : "—",
            remaining: listing?.lease_remaining || "—",
          },
        },
      };

      const { data, error } = await supabase.functions.invoke("generate-agreement", {
        body: agreementData,
      });
      if (error) throw error;
      if (data?.agreement) {
        setAgreement(data.agreement as AgreementRecord);
        setAllVersions([data.agreement as AgreementRecord]);
        toast.success("تم إنشاء الاتفاقية بنجاح");
      }
    } catch (e: any) {
      toast.error(e.message || "فشل إنشاء الاتفاقية");
    }
    setGenerating(false);
  };

  const sendDealCompletionEmail = async (recipientEmail: string, recipientName: string, role: string, otherPartyName: string) => {
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "deal-completed",
          recipientEmail,
          idempotencyKey: `deal-completed-${agreement?.deal_id}-${role}`,
          templateData: {
            recipientName,
            dealTitle: agreement?.deal_title || "",
            agreementNumber: agreement?.agreement_number || "",
            agreedPrice: agreement?.financial_terms?.agreedPrice
              ? Number(agreement.financial_terms.agreedPrice).toLocaleString("en-US")
              : "",
            otherPartyName,
            role,
          },
        },
      });
    } catch (e) {
      console.error("Failed to send deal completion email:", e);
    }
  };

  const handleApprove = async (side: "buyer" | "seller") => {
    if (!agreement) return;
    setApproving(true);
    try {
      const updateField = side === "buyer"
        ? { buyer_approved: true, buyer_approved_at: new Date().toISOString() }
        : { seller_approved: true, seller_approved_at: new Date().toISOString() };

      const { error } = await supabase
        .from("deal_agreements")
        .update(updateField)
        .eq("id", agreement.id);
      if (error) throw error;

      const updatedAgreement = { ...agreement, ...updateField };
      setAgreement(updatedAgreement);

      await supabase.from("deal_history").insert({
        deal_id: agreement.deal_id,
        action: `${side}_approved`,
        actor_id: user?.id,
        details: { agreement_id: agreement.id, version: agreement.version },
      });

      // If both parties have now approved, send completion emails
      if (updatedAgreement.buyer_approved && updatedAgreement.seller_approved && deal) {
        // Get both profiles
        const [buyerProfile, sellerProfile] = await Promise.all([
          supabase.from("profiles").select("full_name, user_id").eq("user_id", deal.buyer_id).maybeSingle(),
          supabase.from("profiles").select("full_name, user_id").eq("user_id", deal.seller_id).maybeSingle(),
        ]);

        // Get emails from auth (user metadata)
        const buyerName = buyerProfile.data?.full_name || "المشتري";
        const sellerName = sellerProfile.data?.full_name || "البائع";

        // Send to current user at minimum
        if (user?.email) {
          const currentRole = user.id === deal.buyer_id ? "buyer" : "seller";
          const otherName = currentRole === "buyer" ? sellerName : buyerName;
          await sendDealCompletionEmail(user.email, currentRole === "buyer" ? buyerName : sellerName, currentRole, otherName);
        }
      }

      toast.success(side === "buyer" ? "تم اعتماد المشتري" : "تم اعتماد البائع");
    } catch (e: any) {
      toast.error(e.message || "فشل الاعتماد");
    }
    setApproving(false);
  };

  const copyAgreementNumber = () => {
    const num = agreement?.agreement_number || "";
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBuyer = user?.id === deal?.buyer_id;
  const isSeller = user?.id === deal?.seller_id;

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-4">
        <AiStar size={32} />
        <Loader2 size={24} className="text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">جاري تحميل الاتفاقية...</p>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="py-20 text-center">
        <AiStar size={32} className="mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">الصفقة غير موجودة</p>
        <Button asChild variant="outline" className="mt-4 rounded-xl">
          <Link to="/dashboard">العودة للوحة التحكم</Link>
        </Button>
      </div>
    );
  }

  // No agreement yet
  if (!agreement) {
    return (
      <div className="py-8">
        <div className="container max-w-2xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to={`/negotiate/${id}`} className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowRight size={14} strokeWidth={1.3} />
              العودة للتفاوض
            </Link>
          </div>
          <div className="bg-card rounded-2xl shadow-soft p-8 text-center">
            <AiStar size={40} className="mx-auto mb-4" />
            <h2 className="text-lg font-medium mb-2">لم يتم إنشاء الاتفاقية بعد</h2>
            <p className="text-sm text-muted-foreground mb-6">عند الاتفاق على شروط الصفقة، يمكنك إنشاء الاتفاقية الرسمية</p>
            <Button onClick={generateAgreement} disabled={generating} className="gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]">
              {generating ? (
                <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />جاري إنشاء الاتفاقية...</span>
              ) : (
                <><Check size={16} strokeWidth={1.5} />إنشاء الاتفاقية</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const bothApproved = agreement.buyer_approved && agreement.seller_approved;

  return (
    <div className="py-8">
      <div className="container max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to={`/negotiate/${id}`} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowRight size={14} strokeWidth={1.3} />
            العودة للتفاوض
          </Link>
        </div>

        {bothApproved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Lock size={18} strokeWidth={1.3} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800">الاتفاقية مكتملة ومحفوظة</p>
              <p className="text-xs text-emerald-600">هذه الاتفاقية محفوظة بشكل دائم ولا يمكن حذفها أو تعديلها</p>
            </div>
          </div>
        )}

        <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border/20 bg-gradient-to-l from-primary/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <AiStar size={28} />
                <div>
                  <h1 className="text-lg font-medium">اتفاقية الصفقة</h1>
                  <p className="text-xs text-muted-foreground">{agreement.deal_title} — {agreement.location}</p>
                </div>
              </div>
              {bothApproved && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Shield size={16} strokeWidth={1.3} className="text-emerald-600" />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <button onClick={copyAgreementNumber} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                {copied ? <CheckCircle2 size={11} className="text-emerald-500" /> : <Copy size={11} />}
                <span className="font-mono">{agreement.agreement_number}</span>
              </button>
              <span className="text-muted-foreground">الإصدار {agreement.version}</span>
              <span className="text-muted-foreground">
                {new Date(agreement.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Approval Status */}
            <div className="grid grid-cols-2 gap-3">
              <ApprovalCard
                label="المشتري" name={agreement.buyer_name}
                approved={agreement.buyer_approved} approvedAt={agreement.buyer_approved_at}
                onApprove={() => handleApprove("buyer")} loading={approving}
                disabled={bothApproved || !isBuyer || agreement.buyer_approved}
              />
              <ApprovalCard
                label="البائع" name={agreement.seller_name}
                approved={agreement.seller_approved} approvedAt={agreement.seller_approved_at}
                onApprove={() => handleApprove("seller")} loading={approving}
                disabled={bothApproved || !isSeller || agreement.seller_approved}
              />
            </div>

            <Section title="أطراف الاتفاقية">
              <InfoRow label="المشتري" value={agreement.buyer_name || "—"} />
              <InfoRow label="تواصل المشتري" value={agreement.buyer_contact || "—"} />
              <InfoRow label="البائع" value={agreement.seller_name || "—"} />
              <InfoRow label="تواصل البائع" value={agreement.seller_contact || "—"} />
            </Section>

            <Section title="تفاصيل الصفقة">
              <InfoRow label="عنوان الصفقة" value={agreement.deal_title || "—"} />
              <InfoRow label="نوع الصفقة" value={t(agreement.deal_type, DEAL_TYPE_LABELS)} />
              <InfoRow label="الموقع" value={agreement.location || "—"} />
              <InfoRow label="النشاط التجاري" value={agreement.business_activity || "—"} />
            </Section>

            <Section title="الشروط المالية">
              <InfoRow label="السعر المتفق عليه" value={`${(agreement.financial_terms?.agreedPrice || 0).toLocaleString("en-US")} ${agreement.financial_terms?.currency || "ر.س"}`} />
              {agreement.financial_terms?.paymentNote && (
                <InfoRow label="ملاحظة الدفع" value={agreement.financial_terms.paymentNote} />
              )}
            </Section>

            {(agreement.included_assets || []).length > 0 && (
              <Section title="الأصول المشمولة">
                <ul className="space-y-1.5">
                  {(agreement.included_assets as string[]).map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {(agreement.excluded_assets || []).length > 0 && (
              <Section title="المستثنى من الصفقة">
                <ul className="space-y-1.5">
                  {(agreement.excluded_assets as string[]).map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="تفاصيل الإيجار">
              <InfoRow label="الإيجار السنوي" value={agreement.lease_details?.annualRent || "—"} />
              <InfoRow label="المتبقي من العقد" value={agreement.lease_details?.remaining || "—"} />
            </Section>

            <Section title="الالتزامات المفصح عنها">
              <InfoRow label="التزامات مالية" value={agreement.liabilities?.financialLiabilities || "—"} />
              <InfoRow label="رواتب متأخرة" value={agreement.liabilities?.delayedSalaries || "—"} />
              <InfoRow label="إيجار متأخر" value={agreement.liabilities?.unpaidRent || "—"} />
            </Section>

            <Section title="حالة التراخيص">
              <InfoRow label="رخصة البلدية" value={agreement.license_status?.municipality || "—"} />
              <InfoRow label="الدفاع المدني" value={agreement.license_status?.civilDefense || "—"} />
              <InfoRow label="كاميرات المراقبة" value={agreement.license_status?.cameras || "—"} />
            </Section>

            {(agreement.documents_referenced || []).length > 0 && (
              <Section title="المستندات المرجعية">
                <div className="space-y-1.5">
                  {(agreement.documents_referenced as string[]).map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText size={14} strokeWidth={1.3} />
                      {doc}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Declarations */}
            <Section title="الإقرارات">
              <div className="space-y-3">
                {agreement.declarations?.buyerDeclares && (
                  <div className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-3">
                    <span className="text-xs text-foreground font-medium block mb-1">إقرار المشتري:</span>
                    {agreement.declarations.buyerDeclares}
                  </div>
                )}
                {agreement.declarations?.sellerDeclares && (
                  <div className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-3">
                    <span className="text-xs text-foreground font-medium block mb-1">إقرار البائع:</span>
                    {agreement.declarations.sellerDeclares}
                  </div>
                )}
                {agreement.declarations?.platformNote && (
                  <div className="text-sm text-muted-foreground bg-primary/5 rounded-xl p-3 border border-primary/10">
                    <span className="text-xs text-primary font-medium block mb-1">ملاحظة المنصة:</span>
                    {agreement.declarations.platformNote}
                  </div>
                )}
              </div>
            </Section>

            {(agreement.important_notes || []).length > 0 && (
              <Section title="ملاحظات مهمة">
                <ul className="space-y-1.5">
                  {(agreement.important_notes as string[]).map((note, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <AlertTriangle size={13} strokeWidth={1.3} className="text-amber-500 mt-0.5 shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {agreement.amendment_reason && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-medium text-amber-800 mb-1">سبب التعديل:</p>
                <p className="text-sm text-amber-700">{agreement.amendment_reason}</p>
              </div>
            )}

            <div className="pt-4 border-t border-border/20 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <AiStar size={16} animate={false} />
                <span className="text-sm font-medium gradient-text">سوق تقبيل</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                منصة ذكية لتقبيل المشاريع والأعمال التجارية في المملكة العربية السعودية
              </p>
            </div>
          </div>

          {/* Version History */}
          {allVersions.length > 1 && (
            <div className="border-t border-border/20">
              <button onClick={() => setVersionsOpen(!versionsOpen)} className="w-full flex items-center justify-between p-4 hover:bg-accent/20 transition-colors">
                <span className="text-sm font-medium flex items-center gap-2">
                  <History size={15} strokeWidth={1.3} className="text-primary/60" />
                  إصدارات الاتفاقية ({allVersions.length})
                </span>
                {versionsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {versionsOpen && (
                <div className="px-4 pb-4 space-y-2">
                  {allVersions.map(v => (
                    <div key={v.id} className={cn(
                      "flex items-center justify-between py-2 px-3 rounded-xl text-sm",
                      v.id === agreement.id ? "bg-primary/5 border border-primary/10" : "bg-muted/30"
                    )}>
                      <div>
                        <span className="font-medium">الإصدار {v.version}</span>
                        {v.amendment_reason && <span className="text-xs text-muted-foreground mr-2">— {v.amendment_reason}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground"><span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString("en-US")}</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deal History */}
          {history.length > 0 && (
            <div className="border-t border-border/20">
              <button onClick={() => setHistoryOpen(!historyOpen)} className="w-full flex items-center justify-between p-4 hover:bg-accent/20 transition-colors">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Clock size={15} strokeWidth={1.3} className="text-primary/60" />
                  سجل الصفقة ({history.length})
                </span>
                {historyOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {historyOpen && (
                <div className="px-4 pb-4 space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/30 text-sm">
                      <span className="text-muted-foreground">{ACTION_LABELS[h.action] || h.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Commission Section */}
          {commission && (
            <div className="border-t border-border/20 p-5">
              <CommissionPaymentPanel
                commission={commission}
                isSeller={isSeller}
                onUpdate={loadData}
              />
            </div>
          )}
          {!commission && deal?.agreed_price && (
            <div className="border-t border-border/20 p-5">
              <CommissionBanner dealAmount={deal.agreed_price} showDetails />
            </div>
          )}

          {/* Actions */}
          <div className="p-5 border-t border-border/20 flex gap-3">
            {!bothApproved && isBuyer && !agreement.buyer_approved && (
              <Button onClick={() => handleApprove("buyer")} disabled={approving} className="flex-1 gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]">
                <Check size={16} strokeWidth={1.5} />
                اعتماد الاتفاقية (مشتري)
              </Button>
            )}
            {!bothApproved && isSeller && !agreement.seller_approved && (
              <Button onClick={() => handleApprove("seller")} disabled={approving} className="flex-1 gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]">
                <Check size={16} strokeWidth={1.5} />
                اعتماد الاتفاقية (بائع)
              </Button>
            )}
            <Button variant="outline" className="rounded-xl active:scale-[0.98]">
              <Download size={16} strokeWidth={1.5} />
              تنزيل PDF
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/60">
          <Shield size={12} strokeWidth={1.3} />
          <span>هذه الاتفاقية محفوظة بشكل دائم ولا يمكن حذفها أو تعديلها — أي تغيير ينشئ إصدار جديد</span>
        </div>
      </div>
    </div>
  );
};

const ACTION_LABELS: Record<string, string> = {
  agreement_created: "تم إنشاء الاتفاقية",
  agreement_amended: "تم تعديل الاتفاقية",
  buyer_approved: "اعتماد المشتري",
  seller_approved: "اعتماد البائع",
  negotiation_started: "بدء التفاوض",
  deal_completed: "اكتمال الصفقة",
};

const ApprovalCard = ({
  label, name, approved, approvedAt, onApprove, loading, disabled,
}: {
  label: string; name: string | null; approved: boolean; approvedAt: string | null;
  onApprove: () => void; loading: boolean; disabled: boolean;
}) => (
  <div className={cn(
    "rounded-xl p-3 border text-center transition-colors",
    approved ? "bg-emerald-50 border-emerald-200" : "bg-muted/30 border-border/30"
  )}>
    <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
    <p className="text-sm font-medium mb-2">{name || "—"}</p>
    {approved ? (
      <div className="flex items-center justify-center gap-1 text-emerald-600">
        <CheckCircle2 size={14} strokeWidth={1.3} />
        <span className="text-xs">تم الاعتماد</span>
      </div>
    ) : (
      <Button size="sm" variant="outline" onClick={onApprove} disabled={loading || disabled} className="text-xs rounded-lg h-7 px-3">
        {loading ? <Loader2 size={12} className="animate-spin" /> : "اعتماد"}
      </Button>
    )}
    {approvedAt && (
      <p className="text-[10px] text-muted-foreground mt-1">
        {new Date(approvedAt).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}
      </p>
    )}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="font-medium text-sm mb-3">{title}</h3>
    {children}
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm py-1">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

export default AgreementPage;
