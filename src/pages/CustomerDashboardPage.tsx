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
  Eye, Mail, TrendingUp, Edit3, Camera,
  Pencil, Check, X as XIcon, Phone, UserCheck, Shield
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
    agreement: { label: "اتفاقية", cls: "bg-accent/20 text-accent-foreground" },
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

  return (
    <div className="py-6 md:py-8">
      <div className="container max-w-6xl">

        {loadError && (
          <div className="p-3 rounded-lg bg-destructive/10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><AlertCircle size={14} className="text-destructive" /><span className="text-xs text-destructive">{loadError}</span></div>
            <button onClick={() => window.location.reload()} className="text-xs text-destructive hover:underline">إعادة المحاولة</button>
          </div>
        )}

        {/* ═══ TOP: Stats Row ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {([
            { label: "صفقات نشطة", value: stats.active, icon: Activity, color: "text-primary" },
            { label: "بانتظار الرد", value: stats.waiting, icon: Pause, color: "text-warning" },
            { label: "مكتملة", value: stats.completed, icon: CheckCircle, color: "text-success" },
            { label: "إجمالي القيمة", value: `${fmtCurrency(stats.totalVal)} ر.س`, icon: Wallet, color: "text-primary" },
            { label: "عمولة المنصة", value: `${fmtCurrency(stats.commission)} ر.س`, icon: DollarSign, color: "text-muted-foreground" },
          ] as const).map((kpi, i) => (
            <div key={i} className="rounded-xl bg-card p-4 flex items-start gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", i < 3 ? "bg-primary/8" : "bg-muted/50")}>
                <kpi.icon size={16} strokeWidth={1.4} className={kpi.color} />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold leading-tight truncate">{kpi.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ MAIN LAYOUT: Content + Sidebar ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">

          {/* ── MAIN CONTENT ── */}
          <div className="space-y-5 min-w-0">

            {/* Profile completion banner */}
            {profileCompleteness < 100 && (
              <div className="rounded-xl bg-warning/[0.04] border border-warning/15 p-4 flex items-center gap-4">
                <label className="relative w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold cursor-pointer group overflow-hidden shrink-0">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    : (profile?.full_name?.charAt(0) || "؟")}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera size={13} className="text-white" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={saving} />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium">أكمل ملفك الشخصي</span>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                      profileCompleteness >= 60 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                    )}>{profileCompleteness}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-muted overflow-hidden mb-1.5">
                    <div className={cn("h-full rounded-full transition-all", profileCompleteness >= 75 ? "bg-success" : profileCompleteness >= 50 ? "bg-warning" : "bg-destructive")} style={{ width: `${profileCompleteness}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-muted-foreground">
                    {!profile?.full_name && <span className="text-warning">· الاسم</span>}
                    {!profile?.phone && <span className="text-warning">· الجوال</span>}
                    {!hasRealEmail && <span className="text-warning">· البريد</span>}
                    {!profile?.avatar_url && <span className="text-warning">· الصورة</span>}
                    {!isPhoneVerified && profile?.phone && <span className="text-warning">· توثيق الجوال</span>}
                  </div>
                  {!isPhoneVerified && profile?.phone && (
                    <div className="mt-2"><PhoneVerificationFlow initialPhone={profile.phone} onVerified={() => window.location.reload()} /></div>
                  )}
                </div>
              </div>
            )}

            {/* Tabs: Deals / Listings */}
            <div className="flex items-center gap-1 border-b border-border/30 pb-px">
              <button onClick={() => setTab("deals")} className={cn("px-4 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px",
                tab === "deals" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
                <MessageSquare size={12} className="inline ml-1.5 -mt-0.5" />
                صفقاتي ({deals.length})
              </button>
              <button onClick={() => setTab("listings")} className={cn("px-4 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px",
                tab === "listings" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
                <FileText size={12} className="inline ml-1.5 -mt-0.5" />
                إعلاناتي ({listings.length})
              </button>
            </div>

            {/* ── Deals Tab ── */}
            {tab === "deals" && (
              <div className="rounded-xl bg-card overflow-hidden">
                {deals.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare size={28} className="mx-auto mb-2 text-muted-foreground/15" strokeWidth={1} />
                    <p className="text-sm text-muted-foreground mb-1">لا توجد صفقات بعد</p>
                    <Link to="/marketplace" className="text-xs text-primary hover:underline">تصفح السوق</Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/15 text-[10px] text-muted-foreground">
                          <th className="text-right px-4 py-2.5 font-medium">الصفقة</th>
                          <th className="text-right px-4 py-2.5 font-medium">السعر</th>
                          <th className="text-right px-4 py-2.5 font-medium">الحالة</th>
                          <th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">آخر تحديث</th>
                          <th className="px-4 py-2.5 w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {deals.map(deal => {
                          const st = statusBadge(deal.status);
                          return (
                            <tr key={deal.id} className="border-b border-border/8 last:border-0 hover:bg-muted/20 transition-colors text-xs">
                              <td className="px-4 py-3 font-medium">#{deal.id.slice(0, 6)}</td>
                              <td className="px-4 py-3 text-muted-foreground">{deal.agreed_price ? `${Number(deal.agreed_price).toLocaleString()} ر.س` : "—"}</td>
                              <td className="px-4 py-3"><span className={cn("text-[9px] px-2 py-0.5 rounded-md", st.cls)}>{st.label}</span></td>
                              <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{new Date(deal.updated_at).toLocaleDateString("en-GB")}</td>
                              <td className="px-4 py-3">
                                <Link to={dealLink(deal)} className="text-[10px] text-primary hover:underline">عرض ←</Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Listings Tab ── */}
            {tab === "listings" && (
              <div className="rounded-xl bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/10">
                  <span className="text-xs text-muted-foreground">{listings.length} إعلان</span>
                  <Link to="/create-listing" className="text-[10px] text-primary hover:underline flex items-center gap-1"><Plus size={10} /> إعلان جديد</Link>
                </div>
                {listings.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText size={28} className="mx-auto mb-2 text-muted-foreground/15" strokeWidth={1} />
                    <p className="text-sm text-muted-foreground mb-1">لا توجد إعلانات</p>
                    <Link to="/create-listing" className="text-xs text-primary hover:underline">أنشئ إعلانك الأول</Link>
                  </div>
                ) : (
                  <div>
                    {listings.map(listing => {
                      const st = statusBadge(listing.status);
                      return (
                        <Link key={listing.id} to={`/listing/${listing.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-border/8 last:border-0 hover:bg-muted/20 transition-colors group">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{listing.title || "بدون عنوان"}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {listing.city || "—"} · {listing.price ? `${Number(listing.price).toLocaleString()} ر.س` : "بدون سعر"}
                            </div>
                          </div>
                          <span className={cn("text-[9px] px-2 py-0.5 rounded-md shrink-0", st.cls)}>{st.label}</span>
                          <ChevronLeft size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <div className="space-y-4">

            {/* Profile card */}
            <div className="rounded-xl bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <label className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm cursor-pointer group overflow-hidden shrink-0">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    : (profile?.full_name?.charAt(0) || "؟")}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera size={11} className="text-white" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={saving} />
                </label>
                <div className="min-w-0">
                  {editingField === "full_name" ? (
                    <div className="flex items-center gap-1">
                      <input className="text-xs font-medium bg-muted/50 rounded px-1.5 py-0.5 w-28 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                      <button onClick={() => saveField("full_name", editValue)} disabled={saving} className="text-success"><Check size={11} /></button>
                      <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={11} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group/n">
                      <span className="text-xs font-semibold truncate">{profile?.full_name || "مستخدم"}</span>
                      <button onClick={() => startEdit("full_name", profile?.full_name || "")} className="opacity-0 group-hover/n:opacity-100 text-muted-foreground hover:text-primary"><Pencil size={9} /></button>
                    </div>
                  )}
                  <span className={cn("inline-flex items-center gap-1 text-[9px] mt-0.5",
                    profileCompleteness >= 100 ? "text-success" : "text-warning"
                  )}>
                    {profileCompleteness >= 100 ? <><UserCheck size={10} /> موثّق</> : <><Shield size={10} /> غير موثّق</>}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-[10px] text-muted-foreground">
                {/* Email */}
                <div className="flex items-center gap-2">
                  <Mail size={11} className="shrink-0" />
                  {editingField === "email" ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input type="email" dir="ltr" className="bg-muted/50 rounded px-1.5 py-0.5 flex-1 border border-border/50 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                      <button onClick={() => saveField("email", editValue)} disabled={saving} className="text-success"><Check size={11} /></button>
                      <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={11} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-1 min-w-0 group/e">
                      <span className="truncate" dir="ltr">{hasRealEmail ? userEmail : <span className="text-warning">لم يُضاف</span>}</span>
                      <button onClick={() => startEdit("email", hasRealEmail ? (userEmail || "") : "")} className="opacity-0 group-hover/e:opacity-100 text-primary"><Pencil size={9} /></button>
                    </div>
                  )}
                </div>
                {/* Phone */}
                <div className="flex items-center gap-2">
                  <Phone size={11} className="shrink-0" />
                  {editingField === "phone" ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input dir="ltr" inputMode="numeric" className="bg-muted/50 rounded px-1.5 py-0.5 w-24 border border-border/50 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(toDigitsOnly(e.target.value))} autoFocus />
                      <button onClick={() => saveField("phone", editValue)} disabled={saving} className="text-success"><Check size={11} /></button>
                      <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={11} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-1 group/p">
                      <span dir="ltr">{profile?.phone ? toEnglishNumerals(profile.phone) : <span className="text-warning">لم يُضاف</span>}</span>
                      <button onClick={() => startEdit("phone", profile?.phone || "")} className="opacity-0 group-hover/p:opacity-100 text-primary"><Pencil size={9} /></button>
                    </div>
                  )}
                </div>
                {/* Member since */}
                <div className="flex items-center gap-2">
                  <Clock size={11} className="shrink-0" />
                  <span>عضو منذ {memberSince}</span>
                </div>
              </div>
            </div>

            {/* Activity */}
            <div className="rounded-xl bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold flex items-center gap-1.5">
                  <Activity size={12} className="text-success" />
                  النشاط
                </h3>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[9px] text-muted-foreground">مباشر</span>
                </div>
              </div>
              {feed.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-3">لا يوجد نشاط حتى الآن</p>
              ) : (
                <div className="space-y-2">
                  {feed.map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-[10px]">
                      <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                      <span className="text-muted-foreground flex-1 truncate">{f.text}</span>
                      <span className="text-[8px] text-muted-foreground/50 shrink-0">{f.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="rounded-xl bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold">
                    الإشعارات {unreadCount > 0 && <span className="text-[9px] text-primary mr-1">({unreadCount})</span>}
                  </h3>
                  {unreadCount > 0 && <button onClick={markAllAsRead} className="text-[9px] text-primary hover:underline">قراءة الكل</button>}
                </div>
                <div className="space-y-1">
                  {notifications.slice(0, 4).map(n => (
                    <button key={n.id} onClick={() => markAsRead(n.id)} className={cn("w-full text-right p-2 rounded-lg transition-all text-[10px]", !n.is_read && "bg-primary/[0.03]")}>
                      <div className="flex items-start gap-1.5">
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{n.title}</div>
                          {n.body && <div className="text-muted-foreground text-[9px] truncate">{n.body}</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="rounded-xl bg-card p-4 space-y-1.5">
              <h3 className="text-xs font-semibold mb-2">إجراءات سريعة</h3>
              <Link to="/create-listing" className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
                <Plus size={13} className="text-primary" />
                <span className="text-[10px] font-medium">إعلان جديد</span>
              </Link>
              <Link to="/marketplace" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <Eye size={13} className="text-muted-foreground" />
                <span className="text-[10px]">تصفح السوق</span>
              </Link>
              <Link to="/contact" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <Mail size={13} className="text-muted-foreground" />
                <span className="text-[10px]">تواصل مع الدعم</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
