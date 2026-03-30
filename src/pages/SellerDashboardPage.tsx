import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/useSEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Store, ShoppingBag, Pause, Users, Handshake, CheckCircle2,
  TrendingUp, ArrowLeft, FileText, Plus, MessageSquare,
  Bell, Percent, ExternalLink,
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
  totalCommission: number;
}

const StatCard = ({ icon: Icon, label, value, color, linkTo }: {
  icon: React.ElementType; label: string; value: number | string; color: string; linkTo?: string;
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
  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
};

const SellerDashboardPage = () => {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentDeals, setRecentDeals] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useSEO({ title: "لوحة تحكم البائع | سوق تقبيل", description: "إحصائيات نشاطك كبائع في سوق تقبيل" });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const myListingIds = (await supabase.from("listings").select("id").eq("owner_id", user.id).is("deleted_at", null)).data?.map(l => l.id) || [];

      const [listingsRes, dealsRes, offersRes, notifRes] = await Promise.all([
        supabase.from("listings").select("id, status, price").eq("owner_id", user.id).is("deleted_at", null),
        supabase.from("deals").select("id, status, agreed_price, listing_id, buyer_id, created_at, completed_at").eq("seller_id", user.id).order("created_at", { ascending: false }),
        supabase.from("listing_offers").select("id, listing_id, buyer_id").in("listing_id", myListingIds.length ? myListingIds : ["__none__"]),
        supabase.from("notifications").select("id, title, body, type, created_at, is_read, reference_type").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
      ]);

      const listings = listingsRes.data || [];
      const deals = dealsRes.data || [];
      const offers = offersRes.data || [];

      const buyerIds = new Set<string>();
      offers.forEach(o => { if (o.buyer_id) buyerIds.add(o.buyer_id); });
      deals.forEach(d => { if (d.buyer_id) buyerIds.add(d.buyer_id); });

      const completedRevenue = deals
        .filter(d => d.status === "completed" || d.status === "finalized")
        .reduce((sum, d) => sum + (Number(d.agreed_price) || 0), 0);

      setStats({
        activeListings: listings.filter(l => l.status === "published").length,
        soldListings: listings.filter(l => l.status === "sold").length,
        suspendedListings: listings.filter(l => l.status === "suspended" || l.status === "draft").length,
        interestedBuyers: buyerIds.size,
        ongoingDeals: deals.filter(d => !["completed", "finalized", "cancelled", "rejected"].includes(d.status)).length,
        completedDeals: deals.filter(d => d.status === "completed" || d.status === "finalized").length,
        totalRevenue: completedRevenue,
        totalCommission: completedRevenue * 0.01,
      });
      setRecentDeals(deals.slice(0, 5));
      setNotifications(notifRes.data || []);
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const dealStatusLabel = (s: string) => {
    if (s === "negotiating") return "تفاوض";
    if (s === "confirmed") return "اتفاق";
    if (s === "completed" || s === "finalized") return "مكتمل";
    if (s === "cancelled") return "ملغاة";
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
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft size={12} /> لوحة التحكم الرئيسية
          </Link>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { label: "إضافة إعلان", icon: Plus, to: "/create-listing", color: "bg-primary text-primary-foreground" },
            { label: "المحادثات", icon: MessageSquare, to: "/messages", color: "bg-secondary text-secondary-foreground" },
            { label: "صفقاتي", icon: Handshake, to: "/deal-pipeline", color: "bg-secondary text-secondary-foreground" },
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
          <StatCard icon={Store} label="إعلانات نشطة" value={stats?.activeListings ?? 0} color="bg-primary/10 text-primary" linkTo="/dashboard" />
          <StatCard icon={ShoppingBag} label="إعلانات مُباعة" value={stats?.soldListings ?? 0} color="bg-success/10 text-success" />
          <StatCard icon={Pause} label="معلقة / مسودة" value={stats?.suspendedListings ?? 0} color="bg-warning/10 text-warning" />
          <StatCard icon={Users} label="مشترون مهتمون" value={stats?.interestedBuyers ?? 0} color="bg-accent text-accent-foreground" />
          <StatCard icon={Handshake} label="صفقات جارية" value={stats?.ongoingDeals ?? 0} color="bg-primary/10 text-primary" />
          <StatCard icon={CheckCircle2} label="صفقات مكتملة" value={stats?.completedDeals ?? 0} color="bg-success/10 text-success" />
          <StatCard
            icon={TrendingUp}
            label="إجمالي المبيعات"
            value={stats?.totalRevenue ? `${stats.totalRevenue.toLocaleString("en-US")}` : "0"}
            color="bg-emerald-500/10 text-emerald-600"
          />
          <StatCard
            icon={Percent}
            label="العمولات المستحقة (1%)"
            value={stats?.totalCommission ? `${stats.totalCommission.toLocaleString("en-US")}` : "0"}
            color="bg-orange-500/10 text-orange-600"
          />
        </div>

        {/* Two-column layout: Recent Deals + Notifications */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Deals */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText size={14} className="text-primary" /> آخر الصفقات
            </h2>
            {recentDeals.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لا توجد صفقات بعد</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {recentDeals.map(deal => (
                  <Link key={deal.id} to={`/negotiate/${deal.id}`}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                            <Handshake size={14} className="text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground">صفقة #{deal.id.slice(0, 8)}</p>
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

          {/* Recent Notifications */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Bell size={14} className="text-primary" /> آخر الإشعارات
            </h2>
            {notifications.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لا توجد إشعارات</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <Card key={n.id} className={`transition-shadow ${!n.is_read ? "border-primary/20" : ""}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? "bg-muted" : "bg-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{n.title}</p>
                          {n.body && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                          <p className="text-[9px] text-muted-foreground/60 mt-1">
                            {new Date(n.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}{" "}
                            {new Date(n.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboardPage;
