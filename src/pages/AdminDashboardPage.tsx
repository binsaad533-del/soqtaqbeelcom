import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import { BarChart3, Users, FileText, Handshake, ChevronLeft, Loader2, Shield, Database, UserPlus } from "lucide-react";
import BackupPanel from "@/components/BackupPanel";
import CommissionAdminPanel from "@/components/CommissionAdminPanel";
import CrmDashboard from "@/components/crm/CrmDashboard";
import BlogAdminPanel from "@/components/BlogAdminPanel";
import { Newspaper } from "lucide-react";

type Tab = "overview" | "crm" | "commissions" | "blog" | "backup";

const AdminDashboardPage = () => {
  const { getAllListings } = useListings();
  const { getAllDeals } = useDeals();
  const { getAllProfiles } = useProfiles();
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [l, d, p] = await Promise.all([getAllListings(), getAllDeals(), getAllProfiles()]);
      setListings(l);
      setDeals(d);
      setProfiles(p);
      setLoading(false);
    };
    load();
  }, [getAllListings, getAllDeals, getAllProfiles]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={24} className="animate-spin text-primary" /></div>;

  return (
    <div className="py-8">
      <div className="container max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <AiStar size={28} />
          <div>
            <h1 className="text-xl font-medium">لوحة الإدارة</h1>
            <p className="text-sm text-muted-foreground">نظرة عامة على المنصة</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-muted/50 rounded-xl p-1 w-fit">
          {[
            { id: "overview" as Tab, label: "نظرة عامة", icon: BarChart3 },
            { id: "crm" as Tab, label: "العملاء المحتملين", icon: UserPlus },
            { id: "commissions" as Tab, label: "العمولات", icon: Database },
            { id: "blog" as Tab, label: "المدونة", icon: Newspaper },
            { id: "backup" as Tab, label: "النسخ الاحتياطي", icon: Shield },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all",
                activeTab === tab.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon size={14} strokeWidth={1.3} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: "المستخدمون", value: profiles.length, icon: Users },
                { label: "الإعلانات", value: listings.length, icon: FileText },
                { label: "الصفقات", value: deals.length, icon: Handshake },
                { label: "المكتملة", value: deals.filter(d => d.status === "completed").length, icon: BarChart3 },
              ].map((s, i) => (
                <div key={i} className="bg-card rounded-xl p-4 shadow-soft text-center">
                  <s.icon size={18} className="mx-auto mb-2 text-primary" strokeWidth={1.3} />
                  <div className="text-lg font-medium">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <h3 className="font-medium mb-3">آخر الإعلانات</h3>
            <div className="space-y-2">
              {listings.slice(0, 10).map(l => (
                <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:shadow-soft transition-all">
                  <div>
                    <div className="text-sm">{l.title || "بدون عنوان"}</div>
                    <div className="text-xs text-muted-foreground">{l.city} • <div className="text-xs text-muted-foreground">{l.city} • {new Date(l.created_at).toLocaleDateString("en-US")}</div></div>
                  </div>
                  <ChevronLeft size={14} className="text-muted-foreground" strokeWidth={1.3} />
                </Link>
              ))}
              {listings.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">لا توجد إعلانات</p>}
            </div>
          </>
        )}

        {activeTab === "crm" && <CrmDashboard />}

        {activeTab === "commissions" && <CommissionAdminPanel />}

        {activeTab === "blog" && <BlogAdminPanel />}

        {activeTab === "backup" && <BackupPanel />}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
