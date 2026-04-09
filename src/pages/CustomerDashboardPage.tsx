import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import PhoneVerificationFlow from "@/components/PhoneVerificationFlow";
import { cn } from "@/lib/utils";
import {
  Plus, FileText, MessageSquare, AlertCircle,
  CheckCircle, Loader2, Activity, Clock,
  DollarSign, Camera, Pencil,
  Check, X as XIcon, Phone, UserCheck, Shield, Bell,
  Store, Briefcase, ChevronLeft, Wallet, TrendingUp, Trash2,
  ArrowUpRight, Mail, Search, ShoppingCart, Heart, User, Settings, Bot, Brain
} from "lucide-react";
import { toast } from "sonner";
import SarSymbol from "@/components/SarSymbol";
import { toEnglishNumerals, toDigitsOnly } from "@/lib/arabicNumerals";
import SecuritySettingsPanel from "@/components/SecuritySettingsPanel";
import NotificationPreferencesPanel from "@/components/NotificationPreferencesPanel";
import BuyerOffersTab from "@/components/dashboard/BuyerOffersTab";
import SavedListingsTab from "@/components/dashboard/SavedListingsTab";
import AccountSettingsPanel from "@/components/AccountSettingsPanel";
import MoqbilAgentPanel from "@/components/MoqbilAgentPanel";
import MoqbilDashboard from "@/components/MoqbilDashboard";

/* ── Status helpers ── */
const statusBadge = (s: string) => {
  const m: Record<string, { label: string; cls: string }> = {
    draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
    published: { label: "منشور", cls: "bg-success/15 text-success" },
    under_review: { label: "مراجعة", cls: "bg-warning/15 text-warning" },
    negotiating: { label: "تفاوض", cls: "bg-primary/15 text-primary" },
    completed: { label: "مكتمل", cls: "bg-success/15 text-success" },
    finalized: { label: "مكتمل", cls: "bg-success/15 text-success" },
    new: { label: "جديدة", cls: "bg-muted text-muted-foreground" },
    agreement: { label: "اتفاقية", cls: "bg-accent text-accent-foreground" },
    cancelled: { label: "ملغية", cls: "bg-destructive/15 text-destructive" },
  };
  return m[s] || { label: s, cls: "bg-muted text-muted-foreground" };
};

const fmtCurrency = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString("en-US");

const CustomerDashboardPage = () => {
  useSEO({ title: "لوحة العميل", description: "لوحة تحكم العميل — تابع إعلاناتك وصفقاتك على سوق تقبيل", canonical: "/dashboard" });
  const { profile, user } = useAuthContext();
  const { getMyListings, softDeleteListing } = useListings();
  const { getMyDeals } = useDeals();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  type TabId = "deals" | "listings" | "offers" | "saved" | "notifications" | "security" | "account" | "agent" | "intelligence";
  const hashToTab: Record<string, TabId> = { "#profile": "account", "#account": "account", "#deals": "deals", "#listings": "listings", "#offers": "offers", "#saved": "saved", "#notifications": "notifications", "#security": "security", "#agent": "agent", "#intelligence": "intelligence" };
  const initialTab = hashToTab[location.hash] || "deals";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const [searchQuery, setSearchQuery] = useState("");
  const [dealStatusFilter, setDealStatusFilter] = useState<string>("all");
  const [listingStatusFilter, setListingStatusFilter] = useState<string>("all");
  /* ── Profile editing ── */
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPhoneVerify, setShowPhoneVerify] = useState(false);

  const userEmail = user?.email || null;
  const hasRealEmail = !!(userEmail && !userEmail.endsWith("@phone.souqtaqbeel.app"));
  const isPhoneVerified = !!(profile as any)?.phone_verified;

  const startEdit = (field: string, val: string) => { setEditingField(field); setEditValue(val || ""); };
  const cancelEdit = () => { setEditingField(null); setEditValue(""); };

  const saveField = useCallback(async (field: string, value: string) => {
    if (!profile?.user_id) return;
    setSaving(true);
    try {
      if (field === "email") {
        const { error } = await supabase.auth.updateUser({ email: value });
        if (error) throw error;
        toast.success("تم إرسال رابط التحقق إلى بريدك الجديد");
      } else {
        const { error } = await supabase.from("profiles").update({ [field]: field === "phone" ? toDigitsOnly(value) : value }).eq("user_id", profile.user_id);
        if (error) throw error;
        toast.success("تم التحديث");
      }
    } catch (err: any) { toast.error(err?.message || "فشل التحديث"); }
    finally { setSaving(false); cancelEdit(); }
  }, [profile?.user_id]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.user_id) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("الحد الأقصى 5 ميغا"); return; }
    setSaving(true);
    try {
      const path = `avatars/${profile.user_id}.${file.name.split(".").pop()}`;
      await supabase.storage.from("listings").upload(path, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("listings").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", profile.user_id);
      toast.success("تم تحديث الصورة");
    } catch (err: any) { toast.error(err?.message || "فشل الرفع"); }
    finally { setSaving(false); }
  }, [profile?.user_id]);

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const errs: string[] = [];
    let l: Listing[] = [], d: Deal[] = [];
    try { l = await getMyListings(); } catch { errs.push("الإعلانات"); }
    try { d = await getMyDeals(); } catch { errs.push("الصفقات"); }
    setListings(l); setDeals(d);
    if (errs.length) setLoadError(`فشل تحميل: ${errs.join("، ")}`);
    setLoading(false);
  }, [getMyListings, getMyDeals]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Realtime sync ── */
  /* ── Removed aggressive realtime for customer dashboard. Use manual refresh ── */
  const [feed] = useState<{ id: string; text: string; time: string }[]>([]);

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const active = deals.filter(d => !["completed", "finalized", "cancelled"].includes(d.status)).length;
    const waiting = deals.filter(d => ["under_review", "review"].includes(d.status)).length;
    const completed = deals.filter(d => ["completed", "finalized"].includes(d.status)).length;
    const totalVal = deals.reduce((s, d) => s + (Number(d.agreed_price) || 0), 0);
    return { active, waiting, completed, totalVal, commission: totalVal * 0.01 };
  }, [deals]);

  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    return Math.round(([profile.full_name, profile.phone, profile.avatar_url, hasRealEmail, isPhoneVerified].filter(Boolean).length / 5) * 100);
  }, [profile, hasRealEmail, isPhoneVerified]);

  const dealLink = (d: Deal) => ["completed", "finalized"].includes(d.status) ? `/agreement/${d.id}` : `/negotiate/${d.id}`;

  /* ── Filtered data ── */
  const filteredDeals = useMemo(() => {
    let result = deals;
    if (dealStatusFilter !== "all") {
      if (dealStatusFilter === "active") result = result.filter(d => ["negotiating", "new"].includes(d.status));
      else if (dealStatusFilter === "waiting") result = result.filter(d => ["under_review", "review", "agreement"].includes(d.status));
      else if (dealStatusFilter === "completed") result = result.filter(d => ["completed", "finalized"].includes(d.status));
      else if (dealStatusFilter === "cancelled") result = result.filter(d => d.status === "cancelled");
      else result = result.filter(d => d.status === dealStatusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(d => d.id.toLowerCase().includes(q) || String(d.agreed_price || "").includes(q) || (d.deal_type || "").toLowerCase().includes(q));
    }
    return result;
  }, [deals, dealStatusFilter, searchQuery]);

  const filteredListings = useMemo(() => {
    let result = listings;
    if (listingStatusFilter !== "all") result = result.filter(l => l.status === listingStatusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(l => (l.title || "").toLowerCase().includes(q) || (l.city || "").toLowerCase().includes(q) || (l.business_activity || "").toLowerCase().includes(q));
    }
    return result;
  }, [listings, listingStatusFilter, searchQuery]);

  const monthlyChart = useMemo(() => {
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const now = new Date();
    const data: { name: string; total: number; completed: number; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const inMonth = deals.filter(deal => { const c = new Date(deal.created_at); return c.getMonth() === m && c.getFullYear() === y; });
      const comp = inMonth.filter(deal => ["completed", "finalized"].includes(deal.status));
      data.push({ name: months[m], total: inMonth.length, completed: comp.length, value: inMonth.reduce((s, deal) => s + (Number(deal.agreed_price) || 0), 0) });
    }
    return data;
  }, [deals]);

  /* ── Pie chart data ── */
  const statusPie = useMemo(() => {
    const groups: Record<string, { label: string; color: string }> = {
      active: { label: "نشطة", color: "hsl(var(--primary))" },
      waiting: { label: "بانتظار", color: "hsl(var(--warning))" },
      completed: { label: "مكتملة", color: "hsl(var(--success))" },
      cancelled: { label: "ملغية", color: "hsl(var(--destructive))" },
    };
    const counts = {
      active: deals.filter(d => ["negotiating", "new"].includes(d.status)).length,
      waiting: deals.filter(d => ["under_review", "review", "agreement"].includes(d.status)).length,
      completed: deals.filter(d => ["completed", "finalized"].includes(d.status)).length,
      cancelled: deals.filter(d => d.status === "cancelled").length,
    };
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: groups[k].label, value: v, color: groups[k].color }));
  }, [deals]);

  /* ── Smart suggestions ── */
  const suggestions = useMemo(() => {
    const s: { text: string; link: string; icon: any; priority: "high" | "medium" }[] = [];
    if (profileCompleteness < 100) s.push({ text: "أكمل ملفك الشخصي لزيادة الثقة", link: "#account", icon: UserCheck, priority: "high" });
    if (deals.some(d => d.status === "negotiating")) s.push({ text: "لديك صفقات بانتظار ردك", link: "#", icon: MessageSquare, priority: "high" });
    if (listings.length === 0) s.push({ text: "أنشئ أول إعلان لك", link: "/create-listing", icon: Plus, priority: "medium" });
    if (listings.some(l => l.status === "draft")) s.push({ text: "لديك إعلانات مسودة - انشرها", link: "#", icon: FileText, priority: "medium" });
    if (stats.completed > 0) s.push({ text: "أرشيف الاتفاقيات", link: "/agreements-archive", icon: FileText, priority: "medium" });
    return s.slice(0, 4);
  }, [profileCompleteness, deals, listings, stats.completed]);

  const handleDeleteListing = useCallback(async (e: React.MouseEvent, id: string, title: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`هل تريد حذف "${title || "بدون عنوان"}"؟`)) return;
    const { error } = await softDeleteListing(id);
    if (error) { toast.error("فشل حذف الإعلان"); return; }
    toast.success("تم حذف الإعلان");
    setListings(prev => prev.filter(l => l.id !== id));
  }, [softDeleteListing]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={22} className="animate-spin text-primary" /></div>;
  }


  return (
    <div className="min-h-[80vh] bg-background py-6">
      <div className="container max-w-6xl">

        {loadError && (
          <div className="p-3 rounded-xl bg-destructive/10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><AlertCircle size={14} className="text-destructive" /><span className="text-xs text-destructive">{loadError}</span></div>
            <button onClick={loadData} className="text-xs text-destructive hover:underline">إعادة المحاولة</button>
          </div>
        )}

        {/* ═══ DRAFT REMINDERS ═══ */}
        {listings.filter(l => l.status === "draft").length > 0 && (
          <div className="mb-5 animate-reveal" style={{ animationDelay: '60ms' }}>
            {listings.filter(l => l.status === "draft").map(draft => {
              const daysSince = Math.floor((Date.now() - new Date(draft.updated_at).getTime()) / 86400000);
              const timeLabel = daysSince === 0 ? "اليوم" : daysSince === 1 ? "أمس" : `منذ ${daysSince} يوم`;
              return (
                <Link key={draft.id} to="/create-listing" className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border/40 hover:bg-muted/70 transition-all group mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <FileText size={16} className="text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {draft.business_activity || draft.title || "إعلان غير مكتمل"}
                        <span className="text-[10px] text-muted-foreground mr-2">({timeLabel})</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {draft.city ? `${draft.city} · ` : ""}
                        {draft.price ? <>{Number(draft.price).toLocaleString("en-US")} <SarSymbol size={9} /></> : "بدون سعر بعد"}
                        {" — "}
                        أكمل بيانات الإعلان وانشره 🚀
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteListing(e, draft.id, draft.business_activity || draft.title || null)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="حذف الإعلان"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                    <span className="text-xs text-warning font-medium group-hover:underline">أكمل الإعلان</span>
                    <ChevronLeft size={14} className="text-warning/50" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ═══ PROFILE & QUICK INFO BAR ═══ */}
        <h1 className="sr-only">لوحة تحكم العميل</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 animate-reveal" style={{ animationDelay: '80ms' }}>
          {/* Personal Info Card */}
          <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 sm:col-span-2 lg:col-span-1 relative">
            {/* Settings shortcut */}
            <button
              onClick={() => { setActiveTab("account"); setSearchQuery(""); }}
              className="absolute top-3 left-3 p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              title="إعدادات الحساب"
            >
              <Settings size={15} />
            </button>
            {/* Avatar + Name + Badge */}
            <div className="flex items-center gap-3 mb-5">
              <label className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl cursor-pointer group overflow-hidden ring-2 ring-background shadow-sm shrink-0">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" loading="lazy" className="w-full h-full object-cover rounded-full" />
                  : (profile?.full_name?.charAt(0) || "؟")}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <Camera size={16} className="text-white" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={saving} />
              </label>
              <div className="flex-1 min-w-0">
                {editingField === "full_name" ? (
                  <div className="flex items-center gap-1.5">
                    <input className="bg-muted/50 rounded-lg px-2 py-1 w-full border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                    <button onClick={() => saveField("full_name", editValue)} disabled={saving} className="text-success"><Check size={14} /></button>
                    <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => startEdit("full_name", profile?.full_name || "")} className="flex items-center gap-1.5 group/name">
                    <span className="text-sm font-semibold truncate">{profile?.full_name || "أضف اسمك"}</span>
                    <Pencil size={10} className="text-muted-foreground opacity-0 group-hover/name:opacity-60 transition-opacity shrink-0" />
                  </button>
                )}
                <span className={cn(
                  "inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
                  (isPhoneVerified && hasRealEmail) ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                )}>
                  {(isPhoneVerified && hasRealEmail)
                    ? <><UserCheck size={11} /> موثّق</>
                    : <><Shield size={11} /> غير موثّق</>}
                </span>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-3">
              {/* Email */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <Mail size={13} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground mb-0.5">البريد الإلكتروني</div>
                  {editingField === "email" ? (
                    <div className="flex items-center gap-1.5">
                      <input type="email" dir="ltr" lang="en" className="bg-muted/50 rounded-lg px-2 py-1 w-full border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(toEnglishNumerals(e.target.value))} autoFocus />
                      <button onClick={() => saveField("email", editValue)} disabled={saving} className="text-success"><Check size={13} /></button>
                      <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={13} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit("email", hasRealEmail ? (userEmail || "") : "")} className="flex items-center gap-1.5 group/email text-xs" dir="ltr">
                      {hasRealEmail
                        ? <span className="truncate max-w-[180px]">{userEmail}</span>
                        : <span className="text-warning">أضف بريدك الإلكتروني</span>}
                      <Pencil size={9} className="text-muted-foreground opacity-0 group-hover/email:opacity-60 transition-opacity shrink-0" />
                      {hasRealEmail && <CheckCircle size={11} className="text-success shrink-0" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <Phone size={13} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground mb-0.5">رقم الجوال</div>
                  {editingField === "phone" ? (
                    <div className="flex items-center gap-1.5">
                      <input dir="ltr" lang="en" inputMode="numeric" className="bg-muted/50 rounded-lg px-2 py-1 w-full border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(toDigitsOnly(e.target.value))} autoFocus />
                      <button onClick={() => saveField("phone", editValue)} disabled={saving} className="text-success"><Check size={13} /></button>
                      <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={13} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => startEdit("phone", profile?.phone || "")} className="flex items-center gap-1.5 group/phone text-xs" dir="ltr">
                        {profile?.phone
                          ? <span>{toEnglishNumerals(profile.phone)}</span>
                          : <span className="text-warning">أضف رقم جوالك</span>}
                        <Pencil size={9} className="text-muted-foreground opacity-0 group-hover/phone:opacity-60 transition-opacity shrink-0" />
                      </button>
                      {isPhoneVerified && <CheckCircle size={11} className="text-success shrink-0" />}
                      {!isPhoneVerified && profile?.phone && (
                        <button
                          onClick={() => setShowPhoneVerify(v => !v)}
                          className="text-[10px] text-primary hover:underline"
                        >
                          توثيق
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone verification (collapsible) */}
              {!isPhoneVerified && profile?.phone && showPhoneVerify && (
                <div className="pr-10 pt-1">
                  <PhoneVerificationFlow initialPhone={profile.phone} onVerified={() => window.location.reload()} mode="inline" skipPhoneStep />
                </div>
              )}


              {/* Registration date */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <Clock size={13} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground mb-0.5">تاريخ التسجيل</div>
                  <span className="text-xs" dir="ltr">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </span>
                </div>
              </div>

              {/* Last activity */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <Activity size={13} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground mb-0.5">آخر دخول</div>
                  <span className="text-xs" dir="ltr">
                    {profile?.last_activity
                      ? new Date(profile.last_activity).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold flex items-center gap-1.5">
                <Bell size={13} /> الإشعارات
                {unreadCount > 0 && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
              </h3>
              {unreadCount > 0 && <button onClick={markAllAsRead} className="text-[10px] text-primary hover:underline">قراءة الكل</button>}
            </div>
            {notifications.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-4">لا توجد إشعارات</p>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 5).map(n => (
                  <button key={n.id} onClick={() => markAsRead(n.id)} className="w-full text-right flex items-start gap-2 text-[11px] hover:bg-muted/30 p-2 rounded-lg transition-colors">
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className={cn("block truncate", n.is_read ? "text-muted-foreground" : "text-foreground font-medium", n.type === "deal" && "text-success")}>{n.title}</span>
                      {n.body && <span className="text-[10px] text-muted-foreground truncate block">{n.body}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Messages shortcut */}
          <Link to="/messages" className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 flex items-center gap-3 hover:bg-muted/20 transition-colors group">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquare size={16} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold">رسائلي</h3>
              <p className="text-[10px] text-muted-foreground">عرض جميع المحادثات</p>
            </div>
            <ChevronLeft size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>

          {/* Activity feed */}
          <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold flex items-center gap-1.5">
                <Activity size={13} className="text-success" /> النشاط المباشر
              </h3>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[9px] text-muted-foreground">مباشر</span>
              </span>
            </div>
            {feed.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-4">لا يوجد نشاط حالياً</p>
            ) : (
              <div className="space-y-2.5">
                {feed.slice(0, 5).map(f => (
                  <div key={f.id} className="flex items-center gap-2 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-muted-foreground flex-1 truncate">{f.text}</span>
                    <span className="text-[9px] text-muted-foreground/40 shrink-0">{f.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══ KPI ROW ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "صفقات نشطة", value: stats.active, icon: TrendingUp, accent: "text-primary" },
            { label: "بانتظار الرد", value: stats.waiting, icon: Clock, accent: "text-warning" },
            { label: "مكتملة", value: stats.completed, icon: CheckCircle, accent: "text-success" },
            { label: "إجمالي القيمة", value: fmtCurrency(stats.totalVal), icon: Wallet, accent: "text-primary", sub: "﷼" },
            { label: "العمولة (1%)", value: fmtCurrency(stats.commission), icon: DollarSign, accent: "text-muted-foreground", sub: "﷼" },
          ].map((kpi, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-200 animate-reveal" style={{ animationDelay: `${i * 60}ms` }}>
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

        {/* ═══ CHARTS — COMPACT SINGLE CARD ═══ */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 mb-6 animate-reveal" style={{ animationDelay: '320ms' }}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <h3 className="text-[10px] font-medium text-muted-foreground mb-2">الصفقات الشهرية</h3>
              <div className="h-[110px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyChart} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} width={25} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 10, direction: 'rtl' }} />
                    <Area type="monotone" dataKey="total" name="إجمالي" stroke="hsl(var(--primary))" fill="url(#fillTotal)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="completed" name="مكتملة" stroke="hsl(var(--success))" fill="url(#fillCompleted)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-medium text-muted-foreground mb-2">قيمة الصفقات (﷼)</h3>
              <div className="h-[110px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyChart} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} width={30} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 10, direction: 'rtl' }} formatter={(v: number) => [v.toLocaleString('en-US') + ' ﷼', 'القيمة']} />
                    <Area type="monotone" dataKey="value" name="القيمة" stroke="hsl(var(--warning))" fill="url(#fillValue)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <h3 className="text-[10px] font-medium text-muted-foreground mb-2 self-end">توزيع الحالات</h3>
              <div className="h-[90px] w-[90px]">
                {statusPie.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center pt-8">لا توجد</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPie} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" paddingAngle={3} strokeWidth={0}>
                        {statusPie.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 10, direction: 'rtl' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-1">
                {statusPie.map((s, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-[9px] text-muted-foreground">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SMART SUGGESTIONS ═══ */}
        {suggestions.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 animate-reveal" style={{ animationDelay: '350ms' }}>
            {suggestions.map((s, i) => (
              <Link key={i} to={s.link} onClick={() => { const tab = hashToTab[s.link]; if (tab) setActiveTab(tab); }} className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs whitespace-nowrap transition-all shrink-0",
                s.priority === "high" ? "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}>
                <s.icon size={13} strokeWidth={1.5} />
                {s.text}
                <ArrowUpRight size={11} className="opacity-50" />
              </Link>
            ))}
          </div>
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="space-y-5 animate-reveal" style={{ animationDelay: '420ms' }}>

            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit overflow-x-auto max-w-full scrollbar-hide">
                {[
                  { id: "deals" as const, label: "صفقاتي", icon: Briefcase, count: deals.length, desc: "تابع جميع صفقاتك الجارية والمكتملة" },
                  { id: "listings" as const, label: "إعلاناتي", icon: Store, count: listings.length, desc: "إدارة إعلاناتك ومسوداتك" },
                  { id: "offers" as const, label: "عروضي", icon: ShoppingCart, count: undefined, desc: "العروض التي قدمتها على إعلانات أخرى" },
                  { id: "saved" as const, label: "المحفوظة", icon: Heart, count: undefined, desc: "الإعلانات التي حفظتها للمراجعة لاحقاً" },
                  { id: "notifications" as const, label: "الإشعارات", icon: Bell, count: undefined, desc: "تفضيلات التنبيهات والإشعارات" },
                  { id: "agent" as const, label: "وكيل مقبل", icon: Bot, count: undefined, desc: "مساعدك الذكي الذي يعمل بالنيابة عنك" },
                  { id: "intelligence" as const, label: "ذكاء مقبل", icon: Brain, count: undefined, desc: "تحليلات وتوصيات ذكية لصفقاتك" },
                  { id: "security" as const, label: "الأمان", icon: Shield, count: undefined, desc: "إعدادات الحماية وأمان الحساب" },
                  { id: "account" as const, label: "حسابي", icon: User, count: undefined, desc: "تعديل بياناتك الشخصية وكلمة المرور" },
                ].map(tab => (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }} className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all",
                    activeTab === tab.id ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                  )}>
                    <tab.icon size={13} strokeWidth={1.3} />
                    {tab.label}
                    {tab.count !== undefined && <span className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-md">{tab.count}</span>}
                  </button>
                ))}
              </div>
              {(activeTab === "deals" || activeTab === "listings") && (
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={activeTab === "deals" ? "ابحث في الصفقات..." : "ابحث في الإعلانات..."}
                  className="w-full bg-muted/40 border-0 rounded-lg py-2 pr-9 pl-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              )}
            </div>

            {/* Status filter chips */}
            {activeTab === "deals" && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: "all", label: "الكل" },
                  { id: "active", label: "نشطة" },
                  { id: "waiting", label: "بانتظار" },
                  { id: "completed", label: "مكتملة" },
                  { id: "cancelled", label: "ملغية" },
                ].map(f => (
                  <button key={f.id} onClick={() => setDealStatusFilter(f.id)} className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap transition-all",
                    dealStatusFilter === f.id ? "bg-primary/10 text-primary font-medium" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  )}>{f.label}</button>
                ))}
              </div>
            )}
            {activeTab === "listings" && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: "all", label: "الكل" },
                  { id: "draft", label: "مسودة" },
                  { id: "published", label: "منشور" },
                  { id: "under_review", label: "مراجعة" },
                ].map(f => (
                  <button key={f.id} onClick={() => setListingStatusFilter(f.id)} className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap transition-all",
                    listingStatusFilter === f.id ? "bg-primary/10 text-primary font-medium" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  )}>{f.label}</button>
                ))}
              </div>
            )}

            {/* Deals list */}
            {activeTab === "deals" && (
              <div className="space-y-2">
                {filteredDeals.length === 0 ? (
                  <div className="bg-card rounded-2xl p-12 shadow-soft border border-border/30 text-center">
                    <MessageSquare size={32} className="mx-auto mb-3 text-muted-foreground/20" strokeWidth={1} />
                    <p className="text-sm text-muted-foreground mb-2">{deals.length === 0 ? "لا توجد صفقات بعد" : "لا توجد نتائج"}</p>
                    {deals.length === 0 && <Link to="/marketplace" className="text-xs text-primary hover:underline">تصفح السوق وابدأ أول صفقة</Link>}
                  </div>
                ) : (
                  filteredDeals.map(deal => {
                    const st = statusBadge(deal.status);
                    return (
                      <Link key={deal.id} to={dealLink(deal)} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/30 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-200 group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                            <Briefcase size={16} className="text-muted-foreground" strokeWidth={1.3} />
                          </div>
                          <div>
                            <div className="text-sm font-medium group-hover:text-primary transition-colors">صفقة #{deal.id.slice(0, 6)}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {deal.agreed_price ? <>{Number(deal.agreed_price).toLocaleString("en-US")} <SarSymbol size={9} /></> : "بدون سعر"}
                              {" · "}
                              {new Date(deal.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                          <ChevronLeft size={14} className="text-muted-foreground/40" />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}

            {/* Listings list */}
            {activeTab === "listings" && (
              <div className="space-y-2">
                {filteredListings.length === 0 ? (
                  <div className="bg-card rounded-2xl p-12 shadow-soft border border-border/30 text-center">
                    <Store size={32} className="mx-auto mb-3 text-muted-foreground/20" strokeWidth={1} />
                    <p className="text-sm text-muted-foreground mb-2">{listings.length === 0 ? "لا توجد إعلانات" : "لا توجد نتائج"}</p>
                    {listings.length === 0 && <Link to="/create-listing?new=1" className="text-xs text-primary hover:underline">أنشئ أول إعلان</Link>}
                  </div>
                ) : (
                  filteredListings.map(listing => {
                    const st = statusBadge(listing.status);
                    const isDraft = listing.status === "draft";
                    return (
                      <Link key={listing.id} to={isDraft ? "/create-listing" : `/listing/${listing.id}`} className={cn(
                        "flex items-center justify-between p-4 rounded-xl border hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-200 group",
                        isDraft ? "bg-primary/[0.03] border-primary/20" : "bg-card border-border/30"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isDraft ? "bg-primary/10" : "bg-muted/50")}>
                            <Store size={16} className={isDraft ? "text-primary" : "text-muted-foreground"} strokeWidth={1.3} />
                          </div>
                          <div>
                            <div className="text-sm font-medium group-hover:text-primary transition-colors">{listing.title || listing.business_activity || "بدون عنوان"}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {listing.city || "—"}
                              {listing.price ? <> · {Number(listing.price).toLocaleString("en-US")} <SarSymbol size={9} /></> : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {(isDraft || listing.status === "suspended") && (
                            <button
                              onClick={(e) => handleDeleteListing(e, listing.id, listing.title || listing.business_activity || null)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="حذف الإعلان"
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                            </button>
                          )}
                          {isDraft ? (
                            <span className="text-[10px] px-2.5 py-1 rounded-lg font-medium bg-primary/10 text-primary">أكمل الإعلان</span>
                          ) : (
                            <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium", st.cls)}>{st.label}</span>
                          )}
                          <ChevronLeft size={14} className="text-muted-foreground/40" />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
            {activeTab === "offers" && <BuyerOffersTab />}
            {activeTab === "saved" && <SavedListingsTab />}
            {activeTab === "notifications" && <NotificationPreferencesPanel />}
            {activeTab === "agent" && <MoqbilAgentPanel />}
            {activeTab === "intelligence" && <MoqbilDashboard />}
            {activeTab === "security" && <SecuritySettingsPanel />}
            {activeTab === "account" && <AccountSettingsPanel />}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
