import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import AiStar from "@/components/AiStar";
import TrustBadge from "@/components/TrustBadge";
import { cn } from "@/lib/utils";
import {
  Users, FileText, Handshake, Shield, Settings, BarChart3,
  Eye, CheckCircle, ChevronLeft, Search, Activity, Loader2, ShieldAlert, AlertTriangle
} from "lucide-react";
import SecurityIncidentPanel from "@/components/SecurityIncidentPanel";

const tabs = [
  { label: "نظرة عامة", icon: BarChart3 },
  { label: "المستخدمون", icon: Users },
  { label: "الإعلانات", icon: FileText },
  { label: "الصفقات", icon: Handshake },
  { label: "المشرفون", icon: Shield },
  { label: "الأمان", icon: ShieldAlert },
  { label: "الإعدادات", icon: Settings },
];

const OwnerDashboardPage = () => {
  const { profile, signOut } = useAuthContext();
  const { getAllListings } = useListings();
  const { getAllDeals } = useDeals();
  const { getAllProfiles, getAllRoles, updateProfile } = useProfiles();

  const [activeTab, setActiveTab] = useState(0);
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [l, d, p, r] = await Promise.all([getAllListings(), getAllDeals(), getAllProfiles(), getAllRoles()]);
      setListings(l);
      setDeals(d);
      setProfiles(p);
      setRoles(r);
      setLoading(false);
    };
    load();
  }, [getAllListings, getAllDeals, getAllProfiles, getAllRoles]);

  const getUserRole = (userId: string) => roles.find((r: any) => r.user_id === userId)?.role || "customer";
  const supervisors = profiles.filter(p => getUserRole(p.user_id) === "supervisor");
  const customers = profiles.filter(p => getUserRole(p.user_id) === "customer");
  const filteredProfiles = profiles.filter(p => !searchQuery || p.full_name?.includes(searchQuery) || p.phone?.includes(searchQuery));

  const toggleSuspend = async (p: Profile) => {
    await updateProfile(p.user_id, { is_suspended: !p.is_suspended });
    setProfiles(prev => prev.map(pr => pr.user_id === p.user_id ? { ...pr, is_suspended: !pr.is_suspended } : pr));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={24} className="animate-spin text-primary" /></div>;

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <AiStar size={28} />
            <div>
              <h1 className="text-xl font-medium">لوحة تحكم المنصة</h1>
              <p className="text-sm text-muted-foreground">مرحباً {profile?.full_name}</p>
            </div>
          </div>
          <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground transition-colors">خروج</button>
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
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "المستخدمون", value: profiles.length, icon: Users, color: "text-primary" },
                { label: "الإعلانات", value: listings.length, icon: FileText, color: "text-accent-foreground" },
                { label: "المنشورة", value: listings.filter(l => l.status === "published").length, icon: Eye, color: "text-success" },
                { label: "الصفقات", value: deals.length, icon: Handshake, color: "text-warning" },
                { label: "مكتملة", value: deals.filter(d => d.status === "completed").length, icon: CheckCircle, color: "text-success" },
                { label: "تفاوض نشط", value: deals.filter(d => d.status === "negotiating").length, icon: Activity, color: "text-primary" },
                { label: "المشرفون", value: supervisors.length, icon: Shield, color: "text-accent-foreground" },
                { label: "العملاء", value: customers.length, icon: Users, color: "text-foreground" },
              ].map((s, i) => (
                <div key={i} className="bg-card rounded-xl p-4 shadow-soft">
                  <s.icon size={18} className={cn("mb-2", s.color)} strokeWidth={1.3} />
                  <div className="text-lg font-medium">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-medium mb-3">آخر الإعلانات</h3>
              <div className="space-y-2">
                {listings.slice(0, 5).map(l => (
                  <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-all">
                    <div>
                      <div className="text-sm">{l.title || "بدون عنوان"}</div>
                      <div className="text-xs text-muted-foreground">{l.city} — {l.price ? `${Number(l.price).toLocaleString()} ر.س` : "—"}</div>
                    </div>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-md", l.status === "published" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{l.status === "published" ? "منشور" : "مسودة"}</span>
                  </Link>
                ))}
                {listings.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">لا توجد إعلانات</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.3} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث بالاسم أو الجوال..." className="w-full pr-9 pl-4 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:border-primary/30" />
            </div>
            <div className="space-y-2">
              {filteredProfiles.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm text-primary font-medium">{p.full_name?.charAt(0) || "?"}</div>
                    <div>
                      <div className="text-sm font-medium">{p.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.phone || "—"} • {getUserRole(p.user_id) === "supervisor" ? "مشرف" : "عميل"}</div>
                    </div>
                  </div>
                  <button onClick={() => toggleSuspend(p)} className={cn("text-[10px] px-2 py-0.5 rounded-md", p.is_suspended ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive")}>
                    {p.is_suspended ? "معلّق" : "تعليق"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div className="space-y-3">
            <h2 className="font-medium mb-2">جميع الإعلانات ({listings.length})</h2>
            {listings.map(l => (
              <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-all">
                <div className="flex-1">
                  <div className="text-sm">{l.title || "بدون عنوان"}</div>
                  <div className="text-xs text-muted-foreground">{l.city} • {l.business_activity || "—"}</div>
                </div>
                <ChevronLeft size={14} className="text-muted-foreground" strokeWidth={1.3} />
              </Link>
            ))}
          </div>
        )}

        {activeTab === 3 && (
          <div className="space-y-3">
            <h2 className="font-medium mb-2">جميع الصفقات ({deals.length})</h2>
            {deals.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card">
                <div>
                  <div className="text-sm">صفقة #{d.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">{d.agreed_price ? `${Number(d.agreed_price).toLocaleString()} ر.س` : "—"}</div>
                </div>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-md", d.status === "completed" ? "bg-success/10 text-success" : "bg-primary/10 text-primary")}>{d.status === "completed" ? "مكتملة" : "تفاوض"}</span>
              </div>
            ))}
            {deals.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">لا توجد صفقات</p>}
          </div>
        )}

        {activeTab === 4 && (
          <div className="space-y-3">
            <h2 className="font-medium mb-2">المشرفون ({supervisors.length})</h2>
            {supervisors.length === 0 ? <p className="text-center text-sm text-muted-foreground py-12">لا يوجد مشرفون</p> : supervisors.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-medium">{s.full_name?.charAt(0) || "?"}</div>
                  <div>
                    <div className="text-sm font-medium">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground">{s.phone || "—"}</div>
                  </div>
                </div>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-md", s.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{s.is_active ? "نشط" : "غير نشط"}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 5 && (
          <SecurityIncidentPanel />
        )}

        {activeTab === 6 && (
          <div className="space-y-3">
            <h2 className="font-medium mb-2">الإعدادات</h2>
            {["إعدادات عامة", "إعدادات العلامة التجارية", "إعدادات الإشعارات", "إعدادات الذكاء الاصطناعي", "إعدادات الأمان"].map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card">
                <span className="text-sm">{s}</span>
                <ChevronLeft size={14} className="text-muted-foreground" strokeWidth={1.3} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboardPage;
