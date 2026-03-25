import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import PhoneVerificationFlow from "@/components/PhoneVerificationFlow";
import { cn } from "@/lib/utils";
import {
  Plus, FileText, MessageSquare, AlertCircle,
  CheckCircle, Loader2, Activity, ChevronLeft,
  Wallet, Clock, DollarSign, Pause,
  Eye, Mail, Camera, Pencil, Check, X as XIcon,
  Phone, UserCheck, Shield, Bell, ArrowUpLeft,
  LayoutDashboard, Store
} from "lucide-react";
import { toast } from "sonner";
import { toEnglishNumerals, toDigitsOnly } from "@/lib/arabicNumerals";

/* ── Helpers ── */
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
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString();

const CustomerDashboardPage = () => {
  const { profile, user } = useAuthContext();
  const navigate = useNavigate();
  const { getMyListings, updateListing } = useListings();
  const { getMyDeals } = useDeals();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<"deals" | "listings">("deals");

  /* ── Profile editing ── */
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

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
  useEffect(() => {
    (async () => {
      setLoading(true);
      const errs: string[] = [];
      let l: Listing[] = [], d: Deal[] = [];
      try { l = await getMyListings(); } catch { errs.push("الإعلانات"); }
      try { d = await getMyDeals(); } catch { errs.push("الصفقات"); }
      setListings(l); setDeals(d);
      if (errs.length) setLoadError(`فشل تحميل: ${errs.join("، ")}`);
      setLoading(false);
    })();
  }, [getMyListings, getMyDeals]);

  /* ── Live feed ── */
  const [feed, setFeed] = useState<{ id: string; text: string; time: string }[]>([]);
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("dash-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, (p) => {
        const d = p.new as any;
        if (d?.buyer_id === user.id || d?.seller_id === user.id)
          setFeed(prev => [{ id: crypto.randomUUID(), text: p.eventType === "INSERT" ? "صفقة جديدة" : "تحديث صفقة", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 5));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "negotiation_messages" }, () => {
        setFeed(prev => [{ id: crypto.randomUUID(), text: "رسالة تفاوض جديدة", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 5));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const active = deals.filter(d => !["completed", "finalized", "cancelled"].includes(d.status)).length;
    const waiting = deals.filter(d => ["under_review", "review"].includes(d.status)).length;
    const completed = deals.filter(d => ["completed", "finalized"].includes(d.status)).length;
    const totalVal = deals.reduce((s, d) => s + (d.agreed_price || 0), 0);
    return { active, waiting, completed, totalVal, commission: totalVal * 0.01 };
  }, [deals]);

  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    return Math.round(([profile.full_name, profile.phone, profile.avatar_url, hasRealEmail, isPhoneVerified].filter(Boolean).length / 5) * 100);
  }, [profile, hasRealEmail, isPhoneVerified]);

  const dealLink = (d: Deal) => ["completed", "finalized"].includes(d.status) ? `/agreement/${d.id}` : `/negotiate/${d.id}`;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long" })
    : "—";

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={22} className="animate-spin text-primary" /></div>;
  }

  const kpis = [
    { label: "صفقات نشطة", value: stats.active, icon: Activity, accent: "text-primary bg-primary/10" },
    { label: "بانتظار الرد", value: stats.waiting, icon: Pause, accent: "text-warning bg-warning/10" },
    { label: "مكتملة", value: stats.completed, icon: CheckCircle, accent: "text-success bg-success/10" },
    { label: "إجمالي القيمة", value: `${fmtCurrency(stats.totalVal)} ر.س`, icon: Wallet, accent: "text-primary bg-primary/10" },
    { label: "عمولة المنصة (1%)", value: `${fmtCurrency(stats.commission)} ر.س`, icon: DollarSign, accent: "text-muted-foreground bg-muted" },
  ];

  return (
    <div className="min-h-[80vh] bg-background">
      <div className="container max-w-7xl py-6 md:py-8">

        {loadError && (
          <div className="p-3 rounded-lg bg-destructive/10 flex items-center justify-between mb-5">
            <div className="flex items-center gap-2"><AlertCircle size={14} className="text-destructive" /><span className="text-xs text-destructive">{loadError}</span></div>
            <button onClick={() => window.location.reload()} className="text-xs text-destructive hover:underline">إعادة المحاولة</button>
          </div>
        )}

        {/* ═══ HEADER ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <label className="relative w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm cursor-pointer group overflow-hidden shrink-0 ring-2 ring-background shadow-sm">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                : (profile?.full_name?.charAt(0) || "؟")}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera size={12} className="text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={saving} />
            </label>
            <div>
              <h1 className="text-lg font-semibold leading-tight">مرحباً، {profile?.full_name || "مستخدم"}</h1>
              <p className="text-xs text-muted-foreground">لوحة التحكم · عضو منذ {memberSince}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/create-listing" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              <Plus size={14} />
              إعلان جديد
            </Link>
          </div>
        </div>

        {/* ═══ KPI CARDS ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-soft hover:shadow-soft-lg transition-shadow">
              <div className="flex items-center gap-2.5 mb-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", kpi.accent)}>
                  <kpi.icon size={15} strokeWidth={1.5} />
                </div>
              </div>
              <div className="text-xl font-bold">{kpi.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ PROFILE COMPLETION ═══ */}
        {profileCompleteness < 100 && (
          <div className="bg-card rounded-xl p-4 mb-6 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">اكتمال الملف الشخصي</span>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                profileCompleteness >= 75 ? "bg-success/15 text-success" : profileCompleteness >= 50 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
              )}>{profileCompleteness}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-2">
              <div className={cn("h-full rounded-full transition-all", profileCompleteness >= 75 ? "bg-success" : profileCompleteness >= 50 ? "bg-warning" : "bg-destructive")} style={{ width: `${profileCompleteness}%` }} />
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {!profile?.full_name && <span className="px-2 py-0.5 rounded-md bg-warning/10 text-warning">الاسم مطلوب</span>}
              {!profile?.phone && <span className="px-2 py-0.5 rounded-md bg-warning/10 text-warning">رقم الجوال</span>}
              {!hasRealEmail && <span className="px-2 py-0.5 rounded-md bg-warning/10 text-warning">البريد الإلكتروني</span>}
              {!profile?.avatar_url && <span className="px-2 py-0.5 rounded-md bg-warning/10 text-warning">الصورة الشخصية</span>}
              {!isPhoneVerified && profile?.phone && <span className="px-2 py-0.5 rounded-md bg-warning/10 text-warning">توثيق الجوال</span>}
            </div>
            {!isPhoneVerified && profile?.phone && (
              <div className="mt-3 pt-3 border-t border-border/20">
                <PhoneVerificationFlow initialPhone={profile.phone} onVerified={() => window.location.reload()} />
              </div>
            )}
          </div>
        )}

        {/* ═══ MAIN GRID ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT: Main content (2 cols) ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Tab bar */}
            <div className="bg-card rounded-xl shadow-soft overflow-hidden">
              <div className="flex border-b border-border/20">
                <button onClick={() => setTab("deals")} className={cn("flex-1 px-4 py-3 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                  tab === "deals" ? "text-primary border-b-2 border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
                )}>
                  <MessageSquare size={13} strokeWidth={1.5} />
                  صفقاتي
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", tab === "deals" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{deals.length}</span>
                </button>
                <button onClick={() => setTab("listings")} className={cn("flex-1 px-4 py-3 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                  tab === "listings" ? "text-primary border-b-2 border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
                )}>
                  <FileText size={13} strokeWidth={1.5} />
                  إعلاناتي
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", tab === "listings" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{listings.length}</span>
                </button>
              </div>

              {/* Deals */}
              {tab === "deals" && (
                deals.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <MessageSquare size={32} className="mx-auto mb-3 text-muted-foreground/20" strokeWidth={1} />
                    <p className="text-sm text-muted-foreground mb-2">لا توجد صفقات بعد</p>
                    <Link to="/marketplace" className="text-xs text-primary hover:underline">تصفح السوق وابدأ أول صفقة</Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border/10">
                    {deals.map(deal => {
                      const st = statusBadge(deal.status);
                      return (
                        <Link key={deal.id} to={dealLink(deal)} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group">
                          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", st.cls)}>
                            <MessageSquare size={14} strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">صفقة #{deal.id.slice(0, 6)}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {deal.agreed_price ? `${Number(deal.agreed_price).toLocaleString()} ر.س` : "بدون سعر"}
                              <span className="mx-1.5">·</span>
                              {new Date(deal.updated_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                            </div>
                          </div>
                          <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium shrink-0", st.cls)}>{st.label}</span>
                          <ChevronLeft size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                )
              )}

              {/* Listings */}
              {tab === "listings" && (
                <>
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border/10 bg-muted/20">
                    <span className="text-[11px] text-muted-foreground">{listings.length} إعلان</span>
                    <Link to="/create-listing" className="text-[11px] text-primary hover:underline flex items-center gap-1"><Plus size={11} /> إضافة</Link>
                  </div>
                  {listings.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <FileText size={32} className="mx-auto mb-3 text-muted-foreground/20" strokeWidth={1} />
                      <p className="text-sm text-muted-foreground mb-2">لا توجد إعلانات</p>
                      <Link to="/create-listing" className="text-xs text-primary hover:underline">أنشئ إعلانك الأول</Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/10">
                      {listings.map(listing => {
                        const st = statusBadge(listing.status);
                        return (
                          <Link key={listing.id} to={`/listing/${listing.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group">
                            <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                              <Store size={14} strokeWidth={1.5} className="text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{listing.title || "بدون عنوان"}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {listing.city || "—"}
                                {listing.price ? <><span className="mx-1.5">·</span>{Number(listing.price).toLocaleString()} ر.س</> : null}
                              </div>
                            </div>
                            <span className={cn("text-[10px] px-2.5 py-1 rounded-lg font-medium shrink-0", st.cls)}>{st.label}</span>
                            <ChevronLeft size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── RIGHT: Sidebar ── */}
          <div className="space-y-4">

            {/* Profile Card */}
            <div className="bg-card rounded-xl p-5 shadow-soft">
              <h3 className="text-xs font-semibold text-muted-foreground mb-4">الملف الشخصي</h3>

              <div className="space-y-3">
                {/* Name */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">الاسم</span>
                  {editingField === "full_name" ? (
                    <div className="flex items-center gap-1">
                      <input className="text-xs bg-muted/50 rounded-md px-2 py-1 w-28 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                      <button onClick={() => saveField("full_name", editValue)} disabled={saving} className="text-success hover:text-success/80"><Check size={12} /></button>
                      <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground"><XIcon size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit("full_name", profile?.full_name || "")} className="text-xs font-medium flex items-center gap-1 hover:text-primary transition-colors group/n">
                      {profile?.full_name || <span className="text-warning">لم يُضاف</span>}
                      <Pencil size={10} className="text-muted-foreground/30 group-hover/n:text-primary" />
                    </button>
                  )}
                </div>

                {/* Email */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">البريد</span>
                  {editingField === "email" ? (
                    <div className="flex items-center gap-1">
                      <input type="email" dir="ltr" className="text-xs bg-muted/50 rounded-md px-2 py-1 w-36 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                      <button onClick={() => saveField("email", editValue)} disabled={saving} className="text-success hover:text-success/80"><Check size={12} /></button>
                      <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground"><XIcon size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit("email", hasRealEmail ? (userEmail || "") : "")} className="text-xs flex items-center gap-1 hover:text-primary transition-colors group/e" dir="ltr">
                      {hasRealEmail ? <span className="truncate max-w-[140px]">{userEmail}</span> : <span className="text-warning">لم يُضاف</span>}
                      <Pencil size={10} className="text-muted-foreground/30 group-hover/e:text-primary" />
                    </button>
                  )}
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">الجوال</span>
                  {editingField === "phone" ? (
                    <div className="flex items-center gap-1">
                      <input dir="ltr" inputMode="numeric" className="text-xs bg-muted/50 rounded-md px-2 py-1 w-28 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(toDigitsOnly(e.target.value))} autoFocus />
                      <button onClick={() => saveField("phone", editValue)} disabled={saving} className="text-success hover:text-success/80"><Check size={12} /></button>
                      <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground"><XIcon size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit("phone", profile?.phone || "")} className="text-xs flex items-center gap-1 hover:text-primary transition-colors group/p" dir="ltr">
                      {profile?.phone ? toEnglishNumerals(profile.phone) : <span className="text-warning">لم يُضاف</span>}
                      <Pencil size={10} className="text-muted-foreground/30 group-hover/p:text-primary" />
                    </button>
                  )}
                </div>

                {/* Verification */}
                <div className="flex items-center justify-between pt-2 border-t border-border/15">
                  <span className="text-[11px] text-muted-foreground">الحالة</span>
                  <span className={cn("text-[11px] flex items-center gap-1 font-medium",
                    isPhoneVerified ? "text-success" : "text-warning"
                  )}>
                    {isPhoneVerified ? <><UserCheck size={12} /> موثّق</> : <><Shield size={12} /> غير موثّق</>}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Activity */}
            <div className="bg-card rounded-xl p-5 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold flex items-center gap-1.5">
                  <Activity size={13} className="text-success" />
                  النشاط المباشر
                </h3>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] text-muted-foreground">مباشر</span>
                </span>
              </div>
              {feed.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">لا يوجد نشاط حالياً</p>
              ) : (
                <div className="space-y-2.5">
                  {feed.map(f => (
                    <div key={f.id} className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-xs text-muted-foreground flex-1 truncate">{f.text}</span>
                      <span className="text-[10px] text-muted-foreground/40 shrink-0">{f.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="bg-card rounded-xl p-5 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <Bell size={13} />
                    الإشعارات
                    {unreadCount > 0 && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                  </h3>
                  {unreadCount > 0 && <button onClick={markAllAsRead} className="text-[10px] text-primary hover:underline">قراءة الكل</button>}
                </div>
                <div className="space-y-1.5">
                  {notifications.slice(0, 4).map(n => (
                    <button key={n.id} onClick={() => markAsRead(n.id)} className={cn("w-full text-right px-3 py-2.5 rounded-lg transition-all text-xs", !n.is_read ? "bg-primary/[0.04] hover:bg-primary/[0.07]" : "hover:bg-muted/30")}>
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate text-[11px]">{n.title}</div>
                          {n.body && <div className="text-muted-foreground text-[10px] truncate mt-0.5">{n.body}</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-card rounded-xl p-5 shadow-soft">
              <h3 className="text-xs font-semibold mb-3">إجراءات سريعة</h3>
              <div className="space-y-1.5">
                <Link to="/marketplace" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                  <Eye size={14} className="text-muted-foreground" />
                  <span className="text-xs">تصفح السوق</span>
                </Link>
                <Link to="/contact" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                  <Mail size={14} className="text-muted-foreground" />
                  <span className="text-xs">تواصل مع الدعم</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
