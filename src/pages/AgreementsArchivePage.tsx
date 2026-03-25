import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings } from "@/hooks/useListings";
import { useCommissions, type Commission } from "@/hooks/useCommissions";
import { generateAgreementPdf } from "@/lib/generateAgreementPdf";
import { t, DEAL_TYPE_LABELS } from "@/lib/translations";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText, Search, Download, Filter, Loader2, Lock, CheckCircle2,
  Clock, ArrowRight, ChevronDown, X, Archive
} from "lucide-react";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";

interface AgreementRow {
  id: string;
  deal_id: string;
  version: number;
  agreement_number: string;
  status: string;
  buyer_name: string | null;
  seller_name: string | null;
  buyer_contact: string | null;
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
  amendment_reason: string | null;
  created_at: string;
}

const statusOptions = [
  { value: "all", label: "الكل" },
  { value: "approved", label: "معتمدة" },
  { value: "pending", label: "بانتظار الاعتماد" },
];

const AgreementsArchivePage = () => {
  const { user } = useAuthContext();
  const { getListing } = useListings();
  const { getCommission } = useCommissions();

  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadAgreements = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("deal_agreements")
        .select("*")
        .order("created_at", { ascending: false });
      setAgreements((data || []) as unknown as AgreementRow[]);
    } catch {
      toast.error("فشل تحميل الأرشيف");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAgreements(); }, [loadAgreements]);

  const filtered = useMemo(() => {
    let result = agreements;
    if (statusFilter === "approved") {
      result = result.filter(a => a.buyer_approved && a.seller_approved);
    } else if (statusFilter === "pending") {
      result = result.filter(a => !a.buyer_approved || !a.seller_approved);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(a =>
        (a.agreement_number || "").toLowerCase().includes(q) ||
        (a.deal_title || "").toLowerCase().includes(q) ||
        (a.buyer_name || "").toLowerCase().includes(q) ||
        (a.seller_name || "").toLowerCase().includes(q) ||
        (a.business_activity || "").toLowerCase().includes(q) ||
        (a.location || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [agreements, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = agreements.length;
    const approved = agreements.filter(a => a.buyer_approved && a.seller_approved).length;
    const pending = total - approved;
    const totalValue = agreements.reduce((s, a) => s + (Number(a.financial_terms?.agreedPrice) || 0), 0);
    return { total, approved, pending, totalValue };
  }, [agreements]);

  const handleDownloadPdf = async (agreement: AgreementRow) => {
    setDownloadingId(agreement.id);
    try {
      const { data: dealData } = await supabase
        .from("deals").select("*").eq("id", agreement.deal_id).maybeSingle();

      let assetPhotos: string[] = [];
      try {
        if (dealData?.listing_id) {
          const listing = await getListing(dealData.listing_id);
          if (listing?.photos) {
            assetPhotos = Object.values(listing.photos).flat().filter(Boolean) as string[];
          }
        }
      } catch {}

      let commission: Commission | null = null;
      try { commission = await getCommission(agreement.deal_id); } catch {}

      await generateAgreementPdf({
        agreementNumber: agreement.agreement_number,
        version: agreement.version,
        createdAt: agreement.created_at,
        dealTitle: agreement.deal_title,
        dealType: t(agreement.deal_type, DEAL_TYPE_LABELS),
        location: agreement.location,
        businessActivity: agreement.business_activity,
        buyerName: agreement.buyer_name,
        buyerContact: agreement.buyer_contact,
        sellerName: agreement.seller_name,
        sellerContact: agreement.seller_contact,
        financialTerms: agreement.financial_terms,
        includedAssets: (agreement.included_assets || []) as string[],
        excludedAssets: (agreement.excluded_assets || []) as string[],
        leaseDetails: agreement.lease_details,
        liabilities: agreement.liabilities,
        licenseStatus: agreement.license_status,
        documentsReferenced: (agreement.documents_referenced || []) as string[],
        declarations: agreement.declarations,
        importantNotes: (agreement.important_notes || []) as string[],
        amendmentReason: agreement.amendment_reason,
        buyerApproved: agreement.buyer_approved,
        buyerApprovedAt: agreement.buyer_approved_at,
        sellerApproved: agreement.seller_approved,
        sellerApprovedAt: agreement.seller_approved_at,
        assetPhotos,
        commissionAmount: commission?.commission_amount ?? null,
        commissionRate: commission?.commission_rate ?? null,
        dealAmount: commission?.deal_amount ?? null,
      });
      toast.success("تم تحميل الوثيقة بنجاح");
    } catch {
      toast.error("فشل تحميل الوثيقة");
    }
    setDownloadingId(null);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-4">
        <AiStar size={32} />
        <Loader2 size={24} className="text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">جاري تحميل الأرشيف...</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowRight size={12} strokeWidth={1.3} />
            لوحة التحكم
          </Link>
          <span className="text-border">|</span>
          <span>أرشيف الاتفاقيات</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Archive size={20} strokeWidth={1.3} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">أرشيف الاتفاقيات</h1>
              <p className="text-xs text-muted-foreground">جميع الاتفاقيات والوثائق المحفوظة</p>
            </div>
          </div>
          <AiStar size={24} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "إجمالي الاتفاقيات", value: stats.total, icon: FileText },
            { label: "معتمدة", value: stats.approved, icon: CheckCircle2, cls: "text-success" },
            { label: "بانتظار الاعتماد", value: stats.pending, icon: Clock, cls: "text-warning" },
            { label: "إجمالي القيمة", value: <>{stats.totalValue.toLocaleString("en-US")} <SarSymbol size={10} /></>, icon: Lock },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-3.5 shadow-soft border border-border/10">
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon size={13} strokeWidth={1.3} className={cn("text-muted-foreground", s.cls)} />
                <span className="text-[11px] text-muted-foreground">{s.label}</span>
              </div>
              <span className={cn("text-lg font-semibold", s.cls)}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث برقم الاتفاقية، العنوان، اسم الطرف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-4 py-2.5 rounded-xl bg-muted/50 border border-border/20 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                  statusFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Agreements List */}
        {filtered.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-soft p-10 text-center">
            <Archive size={36} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all" ? "لا توجد نتائج مطابقة" : "لا توجد اتفاقيات بعد"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(agreement => {
              const bothApproved = agreement.buyer_approved && agreement.seller_approved;
              const price = Number(agreement.financial_terms?.agreedPrice || 0);
              return (
                <div
                  key={agreement.id}
                  className="bg-card rounded-xl shadow-soft border border-border/10 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                          bothApproved ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        )}>
                          {bothApproved ? <><Lock size={10} />معتمدة</> : <><Clock size={10} />بانتظار الاعتماد</>}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">{agreement.agreement_number}</span>
                      </div>
                      <Link to={`/agreement/${agreement.deal_id}`} className="text-sm font-medium hover:text-primary transition-colors line-clamp-1">
                        {agreement.deal_title || "اتفاقية صفقة"}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                        {agreement.deal_type && <span>{t(agreement.deal_type, DEAL_TYPE_LABELS)}</span>}
                        {agreement.location && <span>{agreement.location}</span>}
                        <span>
                          {new Date(agreement.created_at).toLocaleDateString("en-US", {
                            year: "numeric", month: "short", day: "numeric"
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px]">
                        <span className="text-muted-foreground">البائع: <span className="text-foreground">{agreement.seller_name || "—"}</span></span>
                        <span className="text-border">|</span>
                        <span className="text-muted-foreground">المشتري: <span className="text-foreground">{agreement.buyer_name || "—"}</span></span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {price > 0 ? <>{price.toLocaleString("en-US")} <SarSymbol size={11} /></> : "—"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg text-[11px] h-7 px-2.5"
                          asChild
                        >
                          <Link to={`/agreement/${agreement.deal_id}`}>
                            <FileText size={12} strokeWidth={1.3} />
                            عرض
                          </Link>
                        </Button>
                        {bothApproved && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg text-[11px] h-7 px-2.5"
                            disabled={downloadingId === agreement.id}
                            onClick={() => handleDownloadPdf(agreement)}
                          >
                            {downloadingId === agreement.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Download size={12} strokeWidth={1.3} />
                            }
                            PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Count */}
        {filtered.length > 0 && (
          <p className="text-center text-[11px] text-muted-foreground mt-4">
            عرض {filtered.length} من {agreements.length} اتفاقية
          </p>
        )}
      </div>
    </div>
  );
};

export default AgreementsArchivePage;
