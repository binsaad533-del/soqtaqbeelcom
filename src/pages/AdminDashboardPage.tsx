import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import { Mail } from "lucide-react";
import { BarChart3, Users, FileText, Handshake, ChevronLeft, Loader2, Shield, Database, UserPlus, ShieldAlert, Newspaper } from "lucide-react";
import BackupPanel from "@/components/BackupPanel";
import CommissionAdminPanel from "@/components/CommissionAdminPanel";
import CrmDashboard from "@/components/crm/CrmDashboard";
import BlogAdminPanel from "@/components/BlogAdminPanel";
import EmailMonitorPanel from "@/components/EmailMonitorPanel";
import SarSymbol from "@/components/SarSymbol";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

type Tab = "overview" | "crm" | "commissions" | "blog" | "emails" | "backup" | "actions";

interface AuditLog {
  id: string;
  action: string;
  resource_id: string | null;
  details: any;
  created_at: string;
  user_id: string | null;
}

const AdminDashboardPage = () => {
  useSEO({ title: "لوحة الإدارة", description: "لوحة إدارة المنصة — سوق تقبيل", canonical: "/admin-dashboard" });
  const { getAllListings } = useListings();
  const { getAllDeals } = useDeals();
  const { getAllProfiles } = useProfiles();
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [actionLogs, setActionLogs] = useState<AuditLog[]>([]);

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

  useEffect(() => {
    if (activeTab !== "actions") return;
    const loadLogs = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .in("action", ["deal_suspended", "deal_activated", "deal_deleted_by_admin"])
        .order("created_at", { ascending: false })
        .limit(50);
      setActionLogs((data as AuditLog[]) || []);
    };
    loadLogs();
  }, [activeTab]);

  const getProfileName = (userId: string | null) => {
    if (!userId) return "—";
    return profiles.find(p => p.user_id === userId)?.full_name || userId.slice(0, 6);
  };

  const suspendedDeals = deals.filter(d => d.status === "suspended");
  const cancelledDeals = deals.filter(d => d.status === "cancelled");

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

        <div className="flex items-center gap-1 mb-6 bg-muted/50 rounded-xl p-1 w-fit flex-wrap">
          {[
            { id: "overview" as Tab, label: "نظرة عامة", icon: BarChart3, badge: 0 },
            { id: "actions" as Tab, label: "الإجراءات", icon: ShieldAlert, badge: suspendedDeals.length },
            { id: "crm" as Tab, label: "العملاء المحتملين", icon: UserPlus, badge: 0 },
            { id: "commissions" as Tab, label: "العمولات", icon: Database, badge: 0 },
            { id: "blog" as Tab, label: "المدونة", icon: Newspaper, badge: 0 },
            { id: "backup" as Tab, label: "النسخ الاحتياطي", icon: Shield, badge: 0 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all relative",
                activeTab === tab.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon size={14} strokeWidth={1.3} />
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-warning text-[9px] text-warning-foreground flex items-center justify-center font-bold">
                  {tab.badge}
                </span>
              )}
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
                    <div className="text-xs text-muted-foreground">{l.city} • {new Date(l.created_at).toLocaleDateString("en-US")}</div>
                  </div>
                  <ChevronLeft size={14} className="text-muted-foreground" strokeWidth={1.3} />
                </Link>
              ))}
              {listings.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">لا توجد إعلانات</p>}
            </div>
          </>
        )}

        {activeTab === "actions" && (
          <div className="space-y-6">
            {/* Suspended Deals */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-warning/20">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
                  <ShieldAlert size={14} className="text-warning" strokeWidth={1.5} />
                </div>
                الصفقات المعلّقة
                {suspendedDeals.length > 0 && <span className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full">{suspendedDeals.length}</span>}
              </h3>
              {suspendedDeals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">لا توجد صفقات معلّقة حالياً</p>
              ) : (
                <div className="space-y-2">
                  {suspendedDeals.map(d => {
                    const adminAction = (d.deal_details as any)?.admin_action;
                    return (
                      <Link key={d.id} to={`/negotiate/${d.id}`} className="flex items-center justify-between p-3 rounded-xl bg-warning/5 border border-warning/10 hover:bg-warning/10 transition-all">
                        <div>
                          <div className="text-xs font-medium">صفقة #{d.id.slice(0, 8)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {getProfileName(d.seller_id)} ← {getProfileName(d.buyer_id)}
                            {d.agreed_price ? <> · {Number(d.agreed_price).toLocaleString("en-US")} <SarSymbol size={8} /></> : ""}
                          </div>
                          {adminAction?.reason && (
                            <div className="text-[10px] text-warning mt-1">السبب: {adminAction.reason}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-warning/10 text-warning font-medium">معلّقة</span>
                          <ChevronLeft size={12} className="text-muted-foreground/40" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cancelled Deals */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-destructive/20">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Shield size={14} className="text-destructive" strokeWidth={1.5} />
                </div>
                الصفقات الملغاة
                {cancelledDeals.length > 0 && <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">{cancelledDeals.length}</span>}
              </h3>
              {cancelledDeals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">لا توجد صفقات ملغاة</p>
              ) : (
                <div className="space-y-2">
                  {cancelledDeals.map(d => {
                    const adminAction = (d.deal_details as any)?.admin_action;
                    return (
                      <Link key={d.id} to={`/negotiate/${d.id}`} className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/10 hover:bg-destructive/10 transition-all">
                        <div>
                          <div className="text-xs font-medium">صفقة #{d.id.slice(0, 8)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {getProfileName(d.seller_id)} ← {getProfileName(d.buyer_id)}
                            {d.agreed_price ? <> · {Number(d.agreed_price).toLocaleString("en-US")} <SarSymbol size={8} /></> : ""}
                          </div>
                          {adminAction?.reason && (
                            <div className="text-[10px] text-destructive mt-1">السبب: {adminAction.reason}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-destructive/10 text-destructive font-medium">ملغاة</span>
                          <ChevronLeft size={12} className="text-muted-foreground/40" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Audit Trail */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/20">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                  <FileText size={14} className="text-muted-foreground" strokeWidth={1.5} />
                </div>
                سجل الإجراءات الإدارية
              </h3>
              {actionLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">لا توجد إجراءات مسجلة</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {actionLogs.map(log => (
                    <div key={log.id} className="flex items-start justify-between p-3 rounded-xl bg-muted/30 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] font-medium",
                            log.action === "deal_suspended" ? "bg-warning/10 text-warning" :
                            log.action === "deal_activated" ? "bg-success/10 text-success" :
                            "bg-destructive/10 text-destructive"
                          )}>
                            {log.action === "deal_suspended" ? "تعليق" :
                             log.action === "deal_activated" ? "تنشيط" : "إلغاء"}
                          </span>
                          <span className="text-muted-foreground">بواسطة: {getProfileName(log.user_id)}</span>
                        </div>
                        {log.details?.reason && (
                          <div className="text-muted-foreground mt-1">السبب: {log.details.reason}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                          صفقة #{log.resource_id?.slice(0, 8)} · {new Date(log.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                        </div>
                      </div>
                      {log.resource_id && (
                        <Link to={`/negotiate/${log.resource_id}`} className="text-[10px] text-primary hover:underline shrink-0">عرض</Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
