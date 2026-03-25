import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import PhoneVerificationFlow from "@/components/PhoneVerificationFlow";
import { cn } from "@/lib/utils";
import {
  Plus, FileText, MessageSquare, AlertCircle,
  CheckCircle, Loader2, Activity, Wallet, Clock,
  DollarSign, Pause, Eye, Mail, Camera, Pencil,
  Check, X as XIcon, Phone, UserCheck, Shield, Bell,
  Store, ArrowUpLeft, Search, Briefcase
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

/* ── Tile wrapper ── */
const Tile = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={cn(
      "bg-card rounded-2xl shadow-soft p-4 flex flex-col justify-between overflow-hidden",
      onClick && "cursor-pointer hover:shadow-soft-lg transition-shadow",
      className
    )}
  >
    {children}
  </div>
);

const CustomerDashboardPage = () => {
  const { profile, user } = useAuthContext();
  const { getMyListings } = useListings();
  const { getMyDeals } = useDeals();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);

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
          setFeed(prev => [{ id: crypto.randomUUID(), text: p.eventType === "INSERT" ? "صفقة جديدة" : "تحديث صفقة", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 4));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "negotiation_messages" }, () => {
        setFeed(prev => [{ id: crypto.randomUUID(), text: "رسالة تفاوض جديدة", time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 4));
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

  const stages = [
    { key: "new", label: "جديدة", icon: Briefcase, count: deals.filter(d => d.status === "new").length },
    { key: "under_review", label: "مراجعة", icon: Search, count: deals.filter(d => d.status === "under_review").length },
    { key: "negotiating", label: "تفاوض", icon: MessageSquare, count: deals.filter(d => d.status === "negotiating").length },
    { key: "agreement", label: "اتفاقية", icon: FileText, count: deals.filter(d => d.status === "agreement").length },
    { key: "completed", label: "مغلقة", icon: CheckCircle, count: deals.filter(d => ["completed", "finalized"].includes(d.status)).length },
  ];

  const displayDeals = stageFilter
    ? deals.filter(d => stageFilter === "completed" ? ["completed", "finalized"].includes(d.status) : d.status === stageFilter)
    : deals;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={22} className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-[80vh] bg-background py-5 md:py-7">
      <div className="container max-w-[1200px]">

        {loadError && (
          <div className="p-3 rounded-lg bg-destructive/10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><AlertCircle size={14} className="text-destructive" /><span className="text-xs text-destructive">{loadError}</span></div>
            <button onClick={() => window.location.reload()} className="text-xs text-destructive hover:underline">إعادة المحاولة</button>
          </div>
        )}

        {/* ═══ TILE GRID ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[minmax(140px,1fr)]">

          {/* ── KPI tiles (5) ── */}
          {([
            { label: "صفقات نشطة", value: stats.active, icon: Activity, accent: "text-primary" },
            { label: "بانتظار الرد", value: stats.waiting, icon: Pause, accent: "text-warning" },
            { label: "مكتملة", value: stats.completed, icon: CheckCircle, accent: "text-success" },
            { label: "إجمالي القيمة", value: `${fmtCurrency(stats.totalVal)}`, icon: Wallet, accent: "text-primary", sub: "ر.س" },
            { label: "العمولة (1%)", value: `${fmtCurrency(stats.commission)}`, icon: DollarSign, accent: "text-muted-foreground", sub: "ر.س" },
          ] as const).map((kpi, i) => (
            <Tile key={`kpi-${i}`}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", `${kpi.accent}/10`)}>
                <kpi.icon size={15} strokeWidth={1.5} className={kpi.accent} />
              </div>
              <div className="mt-auto">
                <div className="text-2xl font-bold leading-none">
                  {kpi.value}
                  {"sub" in kpi && <span className="text-xs font-normal text-muted-foreground mr-1">{kpi.sub}</span>}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">{kpi.label}</div>
              </div>
            </Tile>
          ))}

          {/* ── Profile tile ── */}
          <Tile className="row-span-2">
            <div className="flex flex-col items-center text-center mb-3">
              <label className="relative w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg cursor-pointer group overflow-hidden ring-2 ring-background shadow-sm mb-2">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                  : (profile?.full_name?.charAt(0) || "؟")}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <Camera size={14} className="text-white" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={saving} />
              </label>
              <span className="text-sm font-semibold">{profile?.full_name || "مستخدم"}</span>
              <span className={cn("text-[10px] flex items-center gap-1 mt-0.5", isPhoneVerified ? "text-success" : "text-warning")}>
                {isPhoneVerified ? <><UserCheck size={10} /> موثّق</> : <><Shield size={10} /> غير موثّق</>}
              </span>
            </div>

            {/* Progress ring */}
            <div className="flex items-center justify-center mb-3">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-primary" strokeWidth="2.5" strokeDasharray={`${profileCompleteness} ${100 - profileCompleteness}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{profileCompleteness}%</span>
              </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-2 text-[10px]">
              {/* Name */}
              <div className="flex items-center justify-between">
                <Mail size={10} className="text-muted-foreground shrink-0" />
                {editingField === "email" ? (
                  <div className="flex items-center gap-1">
                    <input type="email" dir="ltr" className="bg-muted/50 rounded px-1.5 py-0.5 w-full border border-border/50 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                    <button onClick={() => saveField("email", editValue)} disabled={saving} className="text-success"><Check size={10} /></button>
                    <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={10} /></button>
                  </div>
                ) : (
                  <button onClick={() => startEdit("email", hasRealEmail ? (userEmail || "") : "")} className="text-muted-foreground hover:text-primary truncate flex items-center gap-1" dir="ltr">
                    {hasRealEmail ? <span className="truncate max-w-[100px]">{userEmail}</span> : <span className="text-warning">إضافة بريد</span>}
                    <Pencil size={8} className="shrink-0 opacity-50" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <Phone size={10} className="text-muted-foreground shrink-0" />
                {editingField === "phone" ? (
                  <div className="flex items-center gap-1">
                    <input dir="ltr" inputMode="numeric" className="bg-muted/50 rounded px-1.5 py-0.5 w-20 border border-border/50 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(toDigitsOnly(e.target.value))} autoFocus />
                    <button onClick={() => saveField("phone", editValue)} disabled={saving} className="text-success"><Check size={10} /></button>
                    <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={10} /></button>
                  </div>
                ) : (
                  <button onClick={() => startEdit("phone", profile?.phone || "")} className="text-muted-foreground hover:text-primary flex items-center gap-1" dir="ltr">
                    {profile?.phone ? toEnglishNumerals(profile.phone) : <span className="text-warning">إضافة جوال</span>}
                    <Pencil size={8} className="shrink-0 opacity-50" />
                  </button>
                )}
              </div>
            </div>

            {!isPhoneVerified && profile?.phone && (
              <div className="mt-2 pt-2 border-t border-border/15">
                <PhoneVerificationFlow initialPhone={profile.phone} onVerified={() => window.location.reload()} />
              </div>
            )}
          </Tile>

          {/* ── Stage filter tiles (5) ── */}
          {stages.map(stage => (
            <Tile
              key={stage.key}
              onClick={() => setStageFilter(stageFilter === stage.key ? null : stage.key)}
              className={cn(stageFilter === stage.key && "ring-2 ring-primary/40")}
            >
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                <stage.icon size={14} strokeWidth={1.5} className="text-muted-foreground" />
              </div>
              <div className="mt-auto">
                <div className="text-2xl font-bold leading-none">{stage.count}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{stage.label}</div>
              </div>
            </Tile>
          ))}

          {/* ── Activity tile ── */}
          <Tile>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold flex items-center gap-1">
                <Activity size={12} className="text-success" /> النشاط
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[9px] text-muted-foreground">مباشر</span>
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {feed.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center">لا يوجد نشاط</p>
              ) : (
                <div className="space-y-2">
                  {feed.slice(0, 3).map(f => (
                    <div key={f.id} className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                      <span className="text-muted-foreground flex-1 truncate">{f.text}</span>
                      <span className="text-[8px] text-muted-foreground/40">{f.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tile>

          {/* ── Notifications tile ── */}
          <Tile>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold flex items-center gap-1.5">
                <Bell size={12} />
                إشعارات
                {unreadCount > 0 && <span className="text-[9px] bg-primary/10 text-primary px-1.5 rounded-full">{unreadCount}</span>}
              </span>
              {unreadCount > 0 && <button onClick={markAllAsRead} className="text-[9px] text-primary">قراءة</button>}
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {notifications.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center">لا توجد إشعارات</p>
              ) : (
                <div className="space-y-1.5">
                  {notifications.slice(0, 3).map(n => (
                    <button key={n.id} onClick={() => markAsRead(n.id)} className="w-full text-right flex items-start gap-1.5 text-[10px]">
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />}
                      <span className="truncate text-muted-foreground">{n.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Tile>

          {/* ── Quick actions tile ── */}
          <Tile>
            <span className="text-[11px] font-semibold mb-2">إجراءات</span>
            <div className="flex-1 flex flex-col justify-center space-y-1.5">
              <Link to="/create-listing" className="flex items-center gap-2 px-2 py-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-xs">
                <Plus size={13} className="text-primary" /> إعلان جديد
              </Link>
              <Link to="/marketplace" className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/30 transition-colors text-xs">
                <Eye size={13} className="text-muted-foreground" /> تصفح السوق
              </Link>
              <Link to="/contact" className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/30 transition-colors text-xs">
                <Mail size={13} className="text-muted-foreground" /> الدعم
              </Link>
            </div>
          </Tile>

          {/* ── Deal cards ── */}
          {displayDeals.length === 0 && (
            <Tile className="col-span-2 md:col-span-4 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare size={28} className="mx-auto mb-2 text-muted-foreground/15" strokeWidth={1} />
                <p className="text-xs text-muted-foreground mb-1">{stageFilter ? "لا توجد صفقات في هذه المرحلة" : "لا توجد صفقات بعد"}</p>
                {stageFilter ? (
                  <button onClick={() => setStageFilter(null)} className="text-[10px] text-primary hover:underline">عرض الكل</button>
                ) : (
                  <Link to="/marketplace" className="text-[10px] text-primary hover:underline">تصفح السوق</Link>
                )}
              </div>
            </Tile>
          )}

          {displayDeals.map(deal => {
            const st = statusBadge(deal.status);
            return (
              <Link key={deal.id} to={dealLink(deal)} className="bg-card rounded-2xl shadow-soft p-4 flex flex-col justify-between hover:shadow-soft-lg transition-shadow min-h-[140px]">
                <div className="flex items-center justify-between">
                  <span className={cn("text-[9px] px-2 py-0.5 rounded-md font-medium", st.cls)}>{st.label}</span>
                  <ArrowUpLeft size={12} className="text-muted-foreground/30" />
                </div>
                <div className="mt-auto">
                  <div className="text-sm font-semibold">#{deal.id.slice(0, 6)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {deal.agreed_price ? `${Number(deal.agreed_price).toLocaleString()} ر.س` : "—"}
                  </div>
                  <div className="text-[9px] text-muted-foreground/50 mt-1">
                    {new Date(deal.updated_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                  </div>
                </div>
              </Link>
            );
          })}

          {/* ── Listing cards ── */}
          {listings.map(listing => {
            const st = statusBadge(listing.status);
            return (
              <Link key={listing.id} to={`/listing/${listing.id}`} className="bg-card rounded-2xl shadow-soft p-4 flex flex-col justify-between hover:shadow-soft-lg transition-shadow min-h-[140px]">
                <div className="flex items-center justify-between">
                  <span className={cn("text-[9px] px-2 py-0.5 rounded-md font-medium", st.cls)}>{st.label}</span>
                  <Store size={12} className="text-muted-foreground/30" />
                </div>
                <div className="mt-auto">
                  <div className="text-sm font-semibold truncate">{listing.title || "بدون عنوان"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {listing.city || "—"}
                    {listing.price ? ` · ${Number(listing.price).toLocaleString()} ر.س` : ""}
                  </div>
                </div>
              </Link>
            );
          })}

        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
