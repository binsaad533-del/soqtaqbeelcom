import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2, Handshake, ChevronLeft, Search } from "lucide-react";
import AiStar from "@/components/AiStar";
import SarSymbol from "@/components/SarSymbol";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface DealRow {
  id: string;
  listing_id: string;
  buyer_id: string | null;
  seller_id: string | null;
  status: string;
  escrow_status: string;
  agreed_price: number | null;
  deal_type: string | null;
  created_at: string;
}

interface ProfileMap {
  [userId: string]: string;
}

interface ListingMap {
  [listingId: string]: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "negotiating", label: "قيد التفاوض" },
  { value: "agreed", label: "تم الاتفاق" },
  { value: "finalized", label: "مؤكدة" },
  { value: "completed", label: "مكتملة" },
  { value: "suspended", label: "معلّقة" },
  { value: "cancelled", label: "ملغاة" },
];

const STATUS_STYLES: Record<string, string> = {
  negotiating: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  agreed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  finalized: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  suspended: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  negotiating: "قيد التفاوض",
  agreed: "تم الاتفاق",
  finalized: "مؤكدة",
  completed: "مكتملة",
  suspended: "معلّقة",
  cancelled: "ملغاة",
};

const ESCROW_LABELS: Record<string, string> = {
  none: "بدون",
  awaiting_deposit: "بانتظار الإيداع",
  deposited: "تم الإيداع",
  transferring: "جاري النقل",
  confirmed: "تم التأكيد",
  released: "مكتمل",
};

const AdminDealsPage = () => {
  const { user } = useAuthContext();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [listings, setListings] = useState<ListingMap>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [dealsRes, profilesRes, listingsRes] = await Promise.all([
        supabase.from("deals").select("id, listing_id, buyer_id, seller_id, status, escrow_status, agreed_price, deal_type, created_at").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name"),
        supabase.from("listings").select("id, title"),
      ]);

      setDeals((dealsRes.data as DealRow[]) || []);

      const pMap: ProfileMap = {};
      (profilesRes.data || []).forEach((p: any) => { pMap[p.user_id] = p.full_name || "—"; });
      setProfiles(pMap);

      const lMap: ListingMap = {};
      (listingsRes.data || []).forEach((l: any) => { lMap[l.id] = l.title || "بدون عنوان"; });
      setListings(lMap);

      setLoading(false);
    };
    load();
  }, []);

  const changeStatus = useCallback(async (dealId: string, newStatus: string) => {
    if (!user) return;
    setChangingStatus(dealId);
    const { error } = await supabase.from("deals").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", dealId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: newStatus } : d));
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: newStatus === "suspended" ? "deal_suspended" : newStatus === "cancelled" ? "deal_deleted_by_admin" : "deal_activated",
        resource_type: "deal",
        resource_id: dealId,
        details: { new_status: newStatus },
      });
      toast({ title: "تم التحديث", description: `تم تغيير حالة الصفقة إلى "${STATUS_LABELS[newStatus] || newStatus}"` });
    }
    setChangingStatus(null);
  }, [user]);

  const filtered = useMemo(() => {
    let result = deals;
    if (filter !== "all") result = result.filter(d => d.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(d =>
        d.id.toLowerCase().includes(q) ||
        (profiles[d.seller_id || ""] || "").toLowerCase().includes(q) ||
        (profiles[d.buyer_id || ""] || "").toLowerCase().includes(q) ||
        (listings[d.listing_id] || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [deals, filter, search, profiles, listings]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={24} className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="py-8">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <AiStar size={28} />
          <div>
            <h1 className="text-xl font-medium">إدارة الصفقات</h1>
            <p className="text-sm text-muted-foreground">{deals.length} صفقة في النظام</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الصفقة..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-sm bg-muted/50 rounded-xl border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-all",
                  filter === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl shadow-soft border border-border/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-muted-foreground text-[11px] bg-muted/20">
                  <th className="text-right py-3 pr-4">الإعلان</th>
                  <th className="text-right py-3">البائع</th>
                  <th className="text-right py-3">المشتري</th>
                  <th className="text-right py-3">المبلغ</th>
                  <th className="text-right py-3">الحالة</th>
                  <th className="text-right py-3">الضمان</th>
                  <th className="text-right py-3">التاريخ</th>
                  <th className="text-right py-3 pl-4">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">
                      <Handshake size={24} className="mx-auto mb-2 text-muted-foreground/30" />
                      لا توجد صفقات مطابقة
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, 50).map(deal => {
                    const st = STATUS_LABELS[deal.status] || deal.status;
                    const stStyle = STATUS_STYLES[deal.status] || "bg-muted text-muted-foreground";
                    const escrow = ESCROW_LABELS[deal.escrow_status] || deal.escrow_status;

                    return (
                      <tr key={deal.id} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                        <td className="py-3 pr-4 max-w-[160px]">
                          <Link to={`/listing/${deal.listing_id}`} className="text-xs hover:text-primary transition-colors line-clamp-1">
                            {listings[deal.listing_id] || deal.listing_id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="py-3 text-xs">{profiles[deal.seller_id || ""] || "—"}</td>
                        <td className="py-3 text-xs">{profiles[deal.buyer_id || ""] || "—"}</td>
                        <td className="py-3">
                          {deal.agreed_price ? (
                            <span className="flex items-center gap-1 text-xs font-medium">
                              {Number(deal.agreed_price).toLocaleString("en-US")}
                              <SarSymbol size={8} />
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3">
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-lg font-medium", stStyle)}>{st}</span>
                        </td>
                        <td className="py-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">{escrow}</span>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {new Date(deal.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </td>
                        <td className="py-3 pl-4">
                          <div className="flex items-center gap-1">
                            {deal.status !== "suspended" && deal.status !== "cancelled" && deal.status !== "completed" && (
                              <button
                                disabled={changingStatus === deal.id}
                                onClick={() => changeStatus(deal.id, "suspended")}
                                className="text-[10px] px-2 py-1 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 transition-colors disabled:opacity-50"
                              >
                                تعليق
                              </button>
                            )}
                            {deal.status === "suspended" && (
                              <button
                                disabled={changingStatus === deal.id}
                                onClick={() => changeStatus(deal.id, "negotiating")}
                                className="text-[10px] px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 transition-colors disabled:opacity-50"
                              >
                                تنشيط
                              </button>
                            )}
                            <Link
                              to={`/negotiate/${deal.id}`}
                              className="text-[10px] px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                            >
                              <ChevronLeft size={10} className="inline" /> عرض
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDealsPage;
