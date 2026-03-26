import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  FileText, Loader2, CheckCircle, Clock,
  DollarSign, Eye, Phone, UserCheck, Shield, Bell,
  Wallet, TrendingUp, ArrowLeft, Mail, Activity,
  MessageSquare, AlertTriangle, Handshake, Store
} from "lucide-react";
import SarSymbol from "@/components/SarSymbol";
import TrustBadge, { getSellerBadges } from "@/components/TrustBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Listing = any;
type Deal = any;
type NegMessage = {
  id: string;
  deal_id: string;
  sender_id: string;
  message: string;
  message_type: string;
  created_at: string;
  sender_type: string;
};

const statusBadge = (s: string) => {
  const m: Record<string, { label: string; cls: string }> = {
    draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
    published: { label: "منشور", cls: "bg-success/15 text-success" },
    under_review: { label: "مراجعة", cls: "bg-warning/15 text-warning" },
    negotiating: { label: "تفاوض", cls: "bg-primary/15 text-primary" },
    completed: { label: "مكتمل", cls: "bg-success/15 text-success" },
    finalized: { label: "مكتمل", cls: "bg-success/15 text-success" },
    cancelled: { label: "ملغية", cls: "bg-destructive/15 text-destructive" },
  };
  return m[s] || { label: s, cls: "bg-muted text-muted-foreground" };
};

const fmtCurrency = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString("en-US");

const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return "—";
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+966")) cleaned = "0" + cleaned.slice(4);
  else if (cleaned.startsWith("00966")) cleaned = "0" + cleaned.slice(5);
  else if (cleaned.startsWith("966") && cleaned.length > 9) cleaned = "0" + cleaned.slice(3);
  if (!cleaned.startsWith("0") && cleaned.length === 9) cleaned = "0" + cleaned;
  return cleaned || "—";
};

const ViewCustomerPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { role } = useAuthContext();
  const { getProfile } = useProfiles();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [messages, setMessages] = useState<NegMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"deals" | "listings" | "chats">("deals");
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [p, { data: l }, { data: d }] = await Promise.all([
        getProfile(userId),
        supabase.from("listings").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
        supabase.from("deals").select("*").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("created_at", { ascending: false }),
      ]);
      setProfile(p);
      setListings(l || []);
      setDeals(d || []);
    } catch (err) {
      console.error("Failed to load customer data:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, getProfile]);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => {
    const active = deals.filter((d: Deal) => !["completed", "finalized", "cancelled"].includes(d.status)).length;
    const completed = deals.filter((d: Deal) => ["completed", "finalized"].includes(d.status)).length;
    const cancelled = deals.filter((d: Deal) => d.status === "cancelled").length;
    const totalVal = deals.reduce((s: number, d: Deal) => s + (Number(d.agreed_price) || 0), 0);
    return { active, completed, cancelled, totalVal };
  }, [deals]);

  const statusPie = useMemo(() => {
    const groups: Record<string, { label: string; color: string }> = {
      active: { label: "نشطة", color: "hsl(var(--primary))" },
      completed: { label: "مكتملة", color: "hsl(var(--success))" },
      cancelled: { label: "ملغية", color: "hsl(var(--destructive))" },
    };
    const counts = {
      active: deals.filter((d: Deal) => !["completed", "finalized", "cancelled"].includes(d.status)).length,
      completed: deals.filter((d: Deal) => ["completed", "finalized"].includes(d.status)).length,
      cancelled: deals.filter((d: Deal) => d.status === "cancelled").length,
    };
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: groups[k].label, value: v, color: groups[k].color }));
  }, [deals]);

  // Only platform_owner can access
  if (role !== "platform_owner") {
    navigate("/unauthorized");
    return null;
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={22} className="animate-spin text-primary" /></div>;
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle size={32} className="text-warning" />
        <p className="text-sm text-muted-foreground">لم يتم العثور على هذا المستخدم</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>العودة للوحة التحكم</Button>
      </div>
    );
  }

  const isPhoneVerified = !!(profile as any)?.phone_verified;

  return (
    <div className="min-h-[80vh] bg-background py-6">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0">
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Eye size={18} className="text-primary" />
                معاينة حساب العميل
              </h1>
              <p className="text-xs text-muted-foreground">وضع القراءة فقط — لا يمكن إجراء تعديلات</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1 border-warning/40 text-warning">
            <Eye size={10} /> للقراءة فقط
          </Badge>
        </div>

        {/* Profile Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl ring-2 ring-background shadow-sm shrink-0 overflow-hidden">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                  : (profile.full_name?.charAt(0) || "؟")}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold truncate block">{profile.full_name || "بدون اسم"}</span>
                <span className={cn(
                  "inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
                  isPhoneVerified ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                )}>
                  {isPhoneVerified
                    ? <><UserCheck size={11} /> موثّق</>
                    : <><Shield size={11} /> غير موثّق</>}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <Mail size={13} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground mb-0.5">البريد الإلكتروني</div>
                  <span className="text-xs" dir="ltr">{profile.email || "—"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <Phone size={13} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground mb-0.5">رقم الجوال</div>
                  <span className="text-xs" dir="ltr">{formatPhone(profile.phone)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <Clock size={13} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground mb-0.5">تاريخ التسجيل</div>
                  <span className="text-xs" dir="ltr">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <Activity size={13} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground mb-0.5">آخر دخول</div>
                  <span className="text-xs" dir="ltr">
                    {profile.last_activity
                      ? new Date(profile.last_activity).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Score */}
          <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
            <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-4">
              <Shield size={13} className="text-primary" /> مستوى الثقة
            </h3>
            <TrustBadge
              score={profile.trust_score}
              verificationLevel={profile.verification_level}
              size="lg"
              showScore
              showBadges
              badges={getSellerBadges(profile as any)}
            />
            <div className="mt-4 space-y-2 text-[11px]">
              <div className="flex justify-between text-muted-foreground">
                <span>صفقات مكتملة</span>
                <span className="font-medium text-foreground">{profile.completed_deals}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>صفقات ملغاة</span>
                <span className="font-medium text-foreground">{profile.cancelled_deals}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>نزاعات</span>
                <span className="font-medium text-foreground">{profile.disputes_count}</span>
              </div>
            </div>
          </div>

          {/* Deal Distribution */}
          <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
            <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-3">
              <Handshake size={13} className="text-success" /> توزيع الصفقات
            </h3>
            {statusPie.length > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                      {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-8">لا توجد صفقات</p>
            )}
            <div className="flex justify-center gap-4 mt-2">
              {statusPie.map((s, i) => (
                <div key={i} className="flex items-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "صفقات نشطة", value: stats.active, icon: TrendingUp, accent: "text-primary" },
            { label: "مكتملة", value: stats.completed, icon: CheckCircle, accent: "text-success" },
            { label: "ملغاة", value: stats.cancelled, icon: AlertTriangle, accent: "text-destructive" },
            { label: "إجمالي القيمة", value: fmtCurrency(stats.totalVal), icon: Wallet, accent: "text-primary", sub: "﷼" },
          ].map((kpi, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-soft border border-border/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-muted-foreground">{kpi.label}</span>
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", `${kpi.accent}/10`)}>
                  <kpi.icon size={14} strokeWidth={1.5} className={kpi.accent} />
                </div>
              </div>
              <div className="text-xl font-bold tracking-tight">
                {kpi.value}
                {"sub" in kpi && <span className="text-xs font-normal text-muted-foreground mr-1">{kpi.sub}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs: Deals / Listings */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 mb-5">
          {([
            { id: "deals" as const, label: "الصفقات", icon: Handshake, count: deals.length },
            { id: "listings" as const, label: "الإعلانات", icon: FileText, count: listings.length },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs whitespace-nowrap transition-all flex-1 justify-center",
                activeTab === tab.id ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
              <tab.icon size={14} strokeWidth={1.3} />
              {tab.label}
              <span className="text-[10px] text-muted-foreground">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Deals List */}
        {activeTab === "deals" && (
          <div className="space-y-2">
            {deals.length === 0 && <p className="text-center text-xs text-muted-foreground py-12">لا توجد صفقات لهذا العميل</p>}
            {deals.map((d: Deal) => {
              const st = statusBadge(d.status);
              const isBuyer = d.buyer_id === userId;
              return (
                <div key={d.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/40 hover:shadow-soft transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Handshake size={14} className="text-muted-foreground" strokeWidth={1.3} />
                    </div>
                    <div>
                      <div className="text-xs font-medium flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">{isBuyer ? "مشتري" : "بائع"}</Badge>
                        {d.agreed_price ? <>{Number(d.agreed_price).toLocaleString("en-US")} <SarSymbol size={9} /></> : "بدون سعر"}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(d.created_at).toLocaleDateString("en-GB")}
                        {d.deal_type && <> · {d.deal_type}</>}
                      </div>
                    </div>
                  </div>
                  <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Listings List */}
        {activeTab === "listings" && (
          <div className="space-y-2">
            {listings.length === 0 && <p className="text-center text-xs text-muted-foreground py-12">لا توجد إعلانات لهذا العميل</p>}
            {listings.map((l: Listing) => {
              const st = statusBadge(l.status);
              return (
                <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/40 hover:shadow-soft transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Store size={14} className="text-muted-foreground" strokeWidth={1.3} />
                    </div>
                    <div>
                      <div className="text-xs font-medium group-hover:text-primary transition-colors">{l.title || l.business_activity || "بدون عنوان"}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {l.city || "—"}
                        {l.price ? <> · {Number(l.price).toLocaleString("en-US")} <SarSymbol size={8} /></> : ""}
                        {" · "}{new Date(l.created_at).toLocaleDateString("en-GB")}
                      </div>
                    </div>
                  </div>
                  <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewCustomerPage;
