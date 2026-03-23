import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import { FileText, MessageSquare, AlertTriangle, CheckCircle, Clock, ChevronLeft, Loader2, Eye } from "lucide-react";

const tabs = [
  { label: "نظرة عامة", icon: Eye },
  { label: "الإعلانات", icon: FileText },
  { label: "المفاوضات", icon: MessageSquare },
  { label: "الشكاوى", icon: AlertTriangle },
];

const SupervisorDashboardPage = () => {
  const { profile, signOut } = useAuthContext();
  const { getAllListings } = useListings();
  const { getAllDeals } = useDeals();
  const [activeTab, setActiveTab] = useState(0);
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [l, d] = await Promise.all([getAllListings(), getAllDeals()]);
      setListings(l);
      setDeals(d);
      setLoading(false);
    };
    load();
  }, [getAllListings, getAllDeals]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={24} className="animate-spin text-primary" /></div>;

  return (
    <div className="py-8">
      <div className="container max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <AiStar size={24} />
            <div>
              <h1 className="text-xl font-medium">لوحة المشرف</h1>
              <p className="text-sm text-muted-foreground">مرحباً {profile?.full_name}</p>
            </div>
          </div>
          <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground transition-colors">خروج</button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "الإعلانات", value: listings.length, icon: FileText },
            { label: "الصفقات", value: deals.length, icon: MessageSquare },
            { label: "مكتملة", value: deals.filter(d => d.status === "completed").length, icon: CheckCircle },
            { label: "قيد التفاوض", value: deals.filter(d => d.status === "negotiating").length, icon: Clock },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-soft text-center">
              <s.icon size={18} className="mx-auto mb-2 text-primary" strokeWidth={1.3} />
              <div className="text-lg font-medium">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button key={i} onClick={() => setActiveTab(i)} className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs whitespace-nowrap transition-all", activeTab === i ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
              <tab.icon size={14} strokeWidth={1.3} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">آخر الإعلانات</h3>
            {listings.slice(0, 8).map(l => (
              <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-all">
                <div>
                  <div className="text-sm">{l.title || "بدون عنوان"}</div>
                  <div className="text-xs text-muted-foreground">{l.city} • {new Date(l.created_at).toLocaleDateString("ar-SA")}</div>
                </div>
                <ChevronLeft size={14} className="text-muted-foreground" strokeWidth={1.3} />
              </Link>
            ))}
          </div>
        )}

        {activeTab === 1 && (
          <div className="space-y-3">
            {listings.map(l => (
              <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-all">
                <div className="flex-1">
                  <div className="text-sm">{l.title || "بدون عنوان"}</div>
                  <div className="text-xs text-muted-foreground">{l.business_activity || "—"} • {l.city}</div>
                </div>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-md", l.status === "published" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{l.status === "published" ? "منشور" : l.status}</span>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 2 && (
          <div className="space-y-3">
            {deals.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card">
                <div>
                  <div className="text-sm">صفقة #{d.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString("ar-SA")}</div>
                </div>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-md", d.status === "completed" ? "bg-success/10 text-success" : "bg-primary/10 text-primary")}>{d.status === "completed" ? "مكتملة" : "تفاوض"}</span>
              </div>
            ))}
            {deals.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">لا توجد صفقات</p>}
          </div>
        )}

        {activeTab === 3 && (
          <div className="text-center py-12">
            <AlertTriangle size={32} className="mx-auto mb-3 text-muted-foreground/50" strokeWidth={1} />
            <p className="text-sm text-muted-foreground">لا توجد شكاوى حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboardPage;
