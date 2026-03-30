import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/useSEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Store,
  ShoppingBag,
  Pause,
  Users,
  Handshake,
  CheckCircle2,
  TrendingUp,
  ArrowLeft,
  FileText,
} from "lucide-react";
import SarSymbol from "@/components/SarSymbol";

interface SellerStats {
  activeListings: number;
  soldListings: number;
  suspendedListings: number;
  interestedBuyers: number;
  ongoingDeals: number;
  completedDeals: number;
  totalRevenue: number;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
  linkTo,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  linkTo?: string;
}) => {
  const content = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }
  return content;
};

const SellerDashboardPage = () => {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentDeals, setRecentDeals] = useState<any[]>([]);

  useSEO({
    title: "لوحة تحكم البائع | سوق تقبيل",
    description: "إحصائيات نشاطك كبائع في سوق تقبيل",
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Parallel fetches
      const [listingsRes, dealsRes, offersRes] = await Promise.all([
        supabase.from("listings").select("id, status, price").eq("owner_id", user.id).is("deleted_at", null),
        supabase.from("deals").select("id, status, agreed_price, listing_id, buyer_id, created_at, completed_at").eq("seller_id", user.id).order("created_at", { ascending: false }),
        supabase.from("listing_offers").select("id, listing_id, buyer_id").in("listing_id",
          (await supabase.from("listings").select("id").eq("owner_id", user.id).is("deleted_at", null)).data?.map(l => l.id) || []
        ),
      ]);

      const listings = listingsRes.data || [];
      const deals = dealsRes.data || [];
      const offers = offersRes.data || [];

      const activeListings = listings.filter(l => l.status === "published").length;
      const soldListings = listings.filter(l => l.status === "sold").length;
      const suspendedListings = listings.filter(l => l.status === "suspended" || l.status === "draft").length;

      // Unique interested buyers from offers + deals
      const buyerIds = new Set<string>();
      offers.forEach(o => { if (o.buyer_id) buyerIds.add(o.buyer_id); });
      deals.forEach(d => { if (d.buyer_id) buyerIds.add(d.buyer_id); });

      const ongoingDeals = deals.filter(d => !["completed", "finalized", "cancelled", "rejected"].includes(d.status)).length;
      const completedDeals = deals.filter(d => d.status === "completed" || d.status === "finalized").length;
      const totalRevenue = deals
        .filter(d => d.status === "completed" || d.status === "finalized")
        .reduce((sum, d) => sum + (Number(d.agreed_price) || 0), 0);

      setStats({
        activeListings,
        soldListings,
        suspendedListings,
        interestedBuyers: buyerIds.size,
        ongoingDeals,
        completedDeals,
        totalRevenue,
      });

      setRecentDeals(deals.slice(0, 5));
    } catch (err) {
      console.error("[SellerDashboard] load error", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="py-8 container max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const dealStatusLabel = (s: string) => {
    if (s === "negotiating") return "تفاوض";
    if (s === "confirmed") return "اتفاق";
    if (s === "completed" || s === "finalized") return "مكتمل";
    if (s === "cancelled") return "ملغاة";
    if (s === "suspended") return "معلّقة";
    return s;
  };

  const dealStatusColor = (s: string) => {
    if (s === "negotiating" || s === "confirmed") return "bg-primary/10 text-primary";
    if (s === "completed" || s === "finalized") return "bg-success/10 text-success";
    if (s === "cancelled") return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="py-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">لوحة تحكم البائع</h1>
            <p className="text-xs text-muted-foreground mt-1">إحصائيات نشاطك وإعلاناتك</p>
          </div>
          <Link
            to="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft size={12} />
            لوحة التحكم الرئيسية
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          <StatCard
            icon={Store}
            label="إعلانات نشطة"
            value={stats?.activeListings ?? 0}
            color="bg-primary/10 text-primary"
            linkTo="/dashboard"
          />
          <StatCard
            icon={ShoppingBag}
            label="إعلانات مُباعة"
            value={stats?.soldListings ?? 0}
            color="bg-success/10 text-success"
          />
          <StatCard
            icon={Pause}
            label="معلقة / مسودة"
            value={stats?.suspendedListings ?? 0}
            color="bg-warning/10 text-warning"
          />
          <StatCard
            icon={Users}
            label="مشترون مهتمون"
            value={stats?.interestedBuyers ?? 0}
            color="bg-accent text-accent-foreground"
          />
          <StatCard
            icon={Handshake}
            label="صفقات جارية"
            value={stats?.ongoingDeals ?? 0}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            icon={CheckCircle2}
            label="صفقات مكتملة"
            value={stats?.completedDeals ?? 0}
            color="bg-success/10 text-success"
          />
          <StatCard
            icon={TrendingUp}
            label="إجمالي المبيعات"
            value={
              stats?.totalRevenue
                ? `${stats.totalRevenue.toLocaleString("en-US")}`
                : "0"
            }
            color="bg-emerald-500/10 text-emerald-600"
          />
        </div>

        {/* Recent Deals */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText size={14} className="text-primary" />
            آخر الصفقات
          </h2>
          {recentDeals.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                لا توجد صفقات بعد
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentDeals.map((deal) => (
                <Link key={deal.id} to={`/negotiate/${deal.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                          <Handshake size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            صفقة #{deal.id.slice(0, 8)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(deal.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {deal.agreed_price && (
                          <span className="text-xs font-semibold text-foreground">
                            {Number(deal.agreed_price).toLocaleString("en-US")} <SarSymbol size={10} />
                          </span>
                        )}
                        <Badge variant="secondary" className={`text-[9px] ${dealStatusColor(deal.status)}`}>
                          {dealStatusLabel(deal.status)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerDashboardPage;
