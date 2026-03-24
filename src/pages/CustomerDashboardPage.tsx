import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useNotifications } from "@/hooks/useNotifications";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import {
  Bell, Plus, FileText, MessageSquare, Shield, HelpCircle, AlertCircle,
  ChevronLeft, Eye, CheckCircle, Upload, Loader2
} from "lucide-react";

const tabs = [
  { label: "إعلاناتي", icon: FileText },
  { label: "المفاوضات", icon: MessageSquare },
  { label: "الاتفاقيات", icon: Shield },
  { label: "الملفات", icon: Upload },
  { label: "الدعم", icon: HelpCircle },
];

const CustomerDashboardPage = () => {
  const { profile, signOut, user } = useAuthContext();
  const { getMyListings } = useListings();
  const { getMyDeals } = useDeals();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState(0);
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const errors: string[] = [];

      let l: Listing[] = [];
      let d: Deal[] = [];

      try {
        l = await getMyListings();
      } catch (err: any) {
        console.error("[CustomerDashboard] Listings load failed:", err);
        errors.push("الإعلانات");
      }

      try {
        d = await getMyDeals();
      } catch (err: any) {
        console.error("[CustomerDashboard] Deals load failed:", err);
        errors.push("الصفقات");
      }

      setListings(l);
      setDeals(d);

      if (errors.length > 0) {
        setLoadError(`فشل تحميل: ${errors.join("، ")} — يرجى تحديث الصفحة`);
      }

      console.log("[CustomerDashboard] Loaded:", { listings: l.length, deals: d.length, errors });
      setLoading(false);
    };
    load();
  }, [getMyListings, getMyDeals]);

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      draft: { label: "مسودة", color: "bg-muted text-muted-foreground" },
      published: { label: "منشور", color: "bg-success/10 text-success" },
      under_review: { label: "قيد المراجعة", color: "bg-warning/10 text-warning" },
      negotiating: { label: "تفاوض", color: "bg-primary/10 text-primary" },
      completed: { label: "مكتمل", color: "bg-success/10 text-success" },
      rejected: { label: "مرفوض", color: "bg-destructive/10 text-destructive" },
    };
    return map[s] || { label: s, color: "bg-muted text-muted-foreground" };
  };

  return (
    <div className="py-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-medium">مرحباً {profile?.full_name || "بك"}</h1>
            <p className="text-sm text-muted-foreground">لوحة التحكم الخاصة بك</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl hover:bg-muted transition-colors" onClick={() => setActiveTab(-1)}>
              <Bell size={18} strokeWidth={1.3} className="text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <AiStar size={20} />
            <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground transition-colors">خروج</button>
          </div>
        </div>

        {/* Error Banner */}
        {loadError && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-destructive shrink-0" />
              <span className="text-sm text-destructive">{loadError}</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-destructive font-medium hover:underline whitespace-nowrap"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "إعلاناتي", value: listings.length, icon: FileText },
            { label: "المنشورة", value: listings.filter(l => l.status === "published").length, icon: Eye },
            { label: "المفاوضات", value: deals.length, icon: MessageSquare },
            { label: "المكتملة", value: deals.filter(d => d.status === "completed").length, icon: CheckCircle },
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-soft text-center">
              <stat.icon size={18} className="mx-auto mb-2 text-primary" strokeWidth={1.3} />
              <div className="text-lg font-medium">{loading ? "—" : stat.value}</div>
              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs whitespace-nowrap transition-all",
                activeTab === i ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon size={14} strokeWidth={1.3} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications */}
        {activeTab === -1 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium">الإشعارات</h2>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">تحديد الكل كمقروء</button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">لا توجد إشعارات</div>
            ) : notifications.map((n) => (
              <button key={n.id} onClick={() => markAsRead(n.id)} className={cn("w-full text-right p-3 rounded-xl border transition-all", n.is_read ? "border-border/30 bg-card" : "border-primary/20 bg-primary/[0.03]")}>
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1"><div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString("en-US")}</div></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Listings */}
        {activeTab === 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-medium">إعلاناتي</h2>
              <Link to="/create-listing" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus size={14} strokeWidth={1.3} />
                إعلان جديد
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-primary" /></div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={32} className="mx-auto mb-3 text-muted-foreground/50" strokeWidth={1} />
                <p className="text-sm text-muted-foreground mb-3">لم تنشئ أي إعلانات بعد</p>
                <Link to="/create-listing" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-xs">
                  <Plus size={14} /> أنشئ إعلانك الأول
                </Link>
              </div>
            ) : listings.map((listing) => {
              const st = statusLabel(listing.status);
              return (
                <Link key={listing.id} to={`/listing/${listing.id}`} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-all">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{listing.title || "بدون عنوان"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{listing.city && `${listing.city} — `}{listing.price ? `${Number(listing.price).toLocaleString()} ر.س` : "بدون سعر"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-md", st.color)}>{st.label}</span>
                    <ChevronLeft size={14} className="text-muted-foreground" strokeWidth={1.3} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Negotiations */}
        {activeTab === 1 && (
          <div className="space-y-3">
            <h2 className="font-medium mb-2">المفاوضات</h2>
            {deals.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">لا توجد مفاوضات حالياً</div>
            ) : deals.filter(d => d.status === "negotiating").map((deal) => (
              <Link key={deal.id} to={`/negotiate/${deal.id}`} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-all">
                <div className="flex-1">
                  <div className="text-sm font-medium">صفقة #{deal.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5"><div className="text-xs text-muted-foreground mt-0.5">{new Date(deal.created_at).toLocaleDateString("en-US")}</div></div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary">نشطة</span>
              </Link>
            ))}
          </div>
        )}

        {/* Agreements */}
        {activeTab === 2 && (
          <div className="space-y-3">
            <h2 className="font-medium mb-2">الاتفاقيات</h2>
            {deals.filter(d => d.status === "completed").length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">لا توجد اتفاقيات مكتملة</div>
            ) : deals.filter(d => d.status === "completed").map((deal) => (
              <Link key={deal.id} to={`/agreement/${deal.id}`} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-all">
                <div className="flex-1">
                  <div className="text-sm font-medium">اتفاقية #{deal.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5"><div className="text-xs text-muted-foreground mt-0.5">{deal.completed_at ? new Date(deal.completed_at).toLocaleDateString("en-US") : "—"}</div></div>
                </div>
                <Shield size={14} className="text-success" strokeWidth={1.3} />
              </Link>
            ))}
          </div>
        )}

        {/* Files */}
        {activeTab === 3 && (
          <div className="text-center py-12">
            <Upload size={32} className="mx-auto mb-3 text-muted-foreground/50" strokeWidth={1} />
            <p className="text-sm text-muted-foreground">ارفع ملفاتك من صفحة إنشاء الإعلان</p>
            <Link to="/create-listing" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-xs">إنشاء إعلان</Link>
          </div>
        )}

        {/* Support */}
        {activeTab === 4 && (
          <div className="text-center py-12">
            <HelpCircle size={32} className="mx-auto mb-3 text-muted-foreground/50" strokeWidth={1} />
            <p className="text-sm text-muted-foreground mb-2">هل تحتاج مساعدة؟</p>
            <p className="text-xs text-muted-foreground">استخدم المساعد الذكي أو تواصل معنا</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
