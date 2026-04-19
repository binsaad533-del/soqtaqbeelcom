import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings } from "@/hooks/useListings";
import { useSEO } from "@/hooks/useSEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Store, ShoppingBag, Pause, Users, Handshake, CheckCircle2,
  TrendingUp, ArrowLeft, Plus, MessageSquare, Percent, ExternalLink, Eye, Trash2, BarChart3, Sparkles, Link2, Edit3,
} from "lucide-react";
import SarSymbol from "@/components/SarSymbol";
import { toast } from "sonner";
import PromoteListingDialog from "@/components/PromoteListingDialog";

interface SellerStats {
  activeListings: number;
  soldListings: number;
  suspendedListings: number;
  interestedBuyers: number;
  ongoingDeals: number;
  completedDeals: number;
  totalRevenue: number;
  totalCommission: number;
}

interface ListingRow {
  id: string;
  title: string | null;
  status: string;
  price: number | null;
  city: string | null;
  created_at: string;
  deal_type: string;
}

const StatCard = ({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    published: "نشط", sold: "مُباع", suspended: "معلّق", draft: "مسودة",
  };
  return map[s] || s;
};

const statusColor = (s: string) => {
  if (s === "published") return "bg-success/10 text-success border-success/20";
  if (s === "sold") return "bg-primary/10 text-primary border-primary/20";
  if (s === "suspended") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-muted text-muted-foreground border-border";
};

const SellerDashboardPage = () => {
  const { user } = useAuthContext();
  const { softDeleteListing } = useListings();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [promoteTitle, setPromoteTitle] = useState<string | null>(null);

  useSEO({ title: "لوحة تحكم البائع | سوق تقبيل", description: "إحصائيات نشاطك كبائع في سوق تقبيل", canonical: "/seller-dashboard" });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [listingsRes, dealsRes, offersRes] = await Promise.all([
        supabase.from("listings").select("id, title, status, price, city, created_at, deal_type").eq("owner_id", user.id).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("deals").select("id, status, agreed_price, buyer_id, created_at").eq("seller_id", user.id),
        supabase.from("listing_offers").select("id, buyer_id, listing_id").in("listing_id",
          (await supabase.from("listings").select("id").eq("owner_id", user.id).is("deleted_at", null)).data?.map(l => l.id) || ["__none__"]
        ),
      ]);

      const allListings = listingsRes.data || [];
      const deals = dealsRes.data || [];
      const offers = offersRes.data || [];

      const buyerIds = new Set<string>();
      offers.forEach(o => { if (o.buyer_id) buyerIds.add(o.buyer_id); });
      deals.forEach(d => { if (d.buyer_id) buyerIds.add(d.buyer_id); });

      const completedRevenue = deals
        .filter(d => d.status === "completed" || d.status === "finalized")
        .reduce((sum, d) => sum + (Number(d.agreed_price) || 0), 0);

      setStats({
        activeListings: allListings.filter(l => l.status === "published").length,
        soldListings: allListings.filter(l => l.status === "sold").length,
        suspendedListings: allListings.filter(l => l.status === "suspended" || l.status === "draft").length,
        interestedBuyers: buyerIds.size,
        ongoingDeals: deals.filter(d => !["completed", "finalized", "cancelled", "rejected"].includes(d.status)).length,
        completedDeals: deals.filter(d => d.status === "completed" || d.status === "finalized").length,
        totalRevenue: completedRevenue,
        totalCommission: completedRevenue * 0.01,
      });
      setListings(allListings);
    } catch (err) {
      console.error("[SellerDashboard] load error", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleDelete = useCallback(async (id: string, title: string | null) => {
    if (!confirm(`هل تريد حذف "${title || "بدون عنوان"}"؟`)) return;
    try {
      const { error } = await softDeleteListing(id);
      if (error) {
        console.error("[SellerDashboard] Delete failed:", error);
        toast.error(`فشل حذف الإعلان: ${error instanceof Error ? error.message : "يرجى المحاولة مرة أخرى"}`);
      } else {
        toast.success("تم حذف الإعلان بنجاح");
        setListings(prev => prev.filter(l => l.id !== id));
      }
    } catch (err) {
      console.error("[SellerDashboard] Delete unexpected error:", err);
      toast.error("حدث خطأ غير متوقع أثناء الحذف — يرجى تحديث الصفحة والمحاولة مرة أخرى");
    }
  }, [softDeleteListing]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="py-8 container max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">لوحة تحكم البائع</h1>
            <p className="text-xs text-muted-foreground mt-1">إحصائيات نشاطك وإعلاناتك</p>
          </div>
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft size={12} /> الرئيسية
          </Link>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { label: "إضافة إعلان", icon: Plus, to: "/create-listing?new=1", color: "bg-primary text-primary-foreground" },
            { label: "التحليلات", icon: BarChart3, to: "/seller-analytics", color: "bg-secondary text-secondary-foreground" },
            { label: "المحادثات", icon: MessageSquare, to: "/messages", color: "bg-secondary text-secondary-foreground" },
            { label: "صفقاتي", icon: Handshake, to: "/deal-pipeline", color: "bg-secondary text-secondary-foreground" },
            { label: "الإحالات", icon: Link2, to: "/referrals", color: "bg-secondary text-secondary-foreground" },
          ].map(link => (
            <Link key={link.to} to={link.to} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 ${link.color}`}>
              <link.icon size={13} strokeWidth={2} />
              {link.label}
              <ExternalLink size={10} className="opacity-50" />
            </Link>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard icon={Store} label="إعلانات نشطة" value={stats?.activeListings ?? 0} color="bg-primary/10 text-primary" />
          <StatCard icon={ShoppingBag} label="إعلانات مُباعة" value={stats?.soldListings ?? 0} color="bg-success/10 text-success" />
          <StatCard icon={Pause} label="معلقة / مسودة" value={stats?.suspendedListings ?? 0} color="bg-warning/10 text-warning" />
          <StatCard icon={Users} label="مشترون مهتمون" value={stats?.interestedBuyers ?? 0} color="bg-accent text-accent-foreground" />
          <StatCard icon={Handshake} label="صفقات جارية" value={stats?.ongoingDeals ?? 0} color="bg-primary/10 text-primary" />
          <StatCard icon={CheckCircle2} label="صفقات مكتملة" value={stats?.completedDeals ?? 0} color="bg-success/10 text-success" />
          <StatCard icon={TrendingUp} label="إجمالي المبيعات" value={stats?.totalRevenue ? `${stats.totalRevenue.toLocaleString("en-US")}` : "0"} color="bg-emerald-500/10 text-emerald-600" />
          <StatCard icon={Percent} label="العمولات المستحقة (1%)" value={stats?.totalCommission ? `${stats.totalCommission.toLocaleString("en-US")}` : "0"} color="bg-orange-500/10 text-orange-600" />
        </div>

        {/* Listings Table */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">إعلاناتي ({listings.length})</h2>
          {listings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                لا توجد إعلانات بعد —{" "}
                <Link to="/create-listing?new=1" className="text-primary underline">أضف إعلانك الأول</Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">العنوان</TableHead>
                      <TableHead className="text-right">المدينة</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-center w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.map(listing => (
                      <TableRow key={listing.id}>
                        <TableCell className="font-medium text-foreground max-w-[200px] truncate">
                          {listing.title || "بدون عنوان"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{listing.city || "—"}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {listing.price ? (
                            <span className="font-semibold">{Number(listing.price).toLocaleString("en-US")} <SarSymbol size={9} /></span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{listing.deal_type === "full" ? "بيع كامل" : listing.deal_type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[9px] ${statusColor(listing.status)}`}>
                            {statusLabel(listing.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(listing.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link to={`/listing/${listing.id}`} className="text-muted-foreground hover:text-foreground transition-colors" title="عرض الإعلان">
                              <Eye size={14} />
                            </Link>
                            {(listing.status === "published" || listing.status === "suspended") && (
                              <Link
                                to={`/listing/${listing.id}?edit=1`}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                title="تعديل الإعلان"
                              >
                                <Edit3 size={13} />
                              </Link>
                            )}
                            {listing.status === "published" && (
                              <button
                                onClick={() => { setPromoteId(listing.id); setPromoteTitle(listing.title); }}
                                className="text-muted-foreground hover:text-amber-500 transition-colors"
                                title="ترقية الإعلان"
                              >
                                <Sparkles size={13} />
                              </button>
                            )}
                            {(listing.status === "draft" || listing.status === "suspended" || listing.status === "published") && (
                              <button
                                onClick={() => handleDelete(listing.id, listing.title)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                title="حذف الإعلان"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>

        <PromoteListingDialog
          open={!!promoteId}
          onOpenChange={(o) => { if (!o) { setPromoteId(null); setPromoteTitle(null); } }}
          listingId={promoteId || ""}
          listingTitle={promoteTitle}
        />
      </div>
    </div>
  );
};

export default SellerDashboardPage;
