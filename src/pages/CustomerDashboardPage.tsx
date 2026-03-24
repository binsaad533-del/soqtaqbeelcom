import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import {
  Plus, FileText, MessageSquare, Shield, AlertCircle,
  Eye, CheckCircle, Loader2, Activity, ChevronLeft,
  TrendingUp, Edit3, Wallet, BarChart3, Clock,
  ArrowUpLeft, ArrowDownLeft, UserCheck, MapPin, Phone,
  Camera, Mail, Pencil, Check, X as XIcon
} from "lucide-react";
import { DEAL_TYPE_FIELD_RULES } from "@/lib/dealTypeFieldRules";
import { toast } from "sonner";
import { toEnglishNumerals, toDigitsOnly } from "@/lib/arabicNumerals";

/* ── Draft completion calculator ── */
const calcDraftProgress = (listing: Listing): number => {
  const rules = DEAL_TYPE_FIELD_RULES[listing.deal_type] || DEAL_TYPE_FIELD_RULES["full_takeover"];
  if (!rules) return 0;
  const checks: boolean[] = [
    !!listing.title, !!listing.business_activity, !!listing.city,
    listing.price != null && listing.price > 0,
  ];
  rules.requiredFields.forEach(f => {
    if (!["business_activity", "city", "price"].includes(f)) checks.push(!!(listing as any)[f]);
  });
  const photos = listing.photos as Record<string, string[]> | null;
  checks.push(!!(photos && Object.values(photos).some(arr => Array.isArray(arr) && arr.length > 0)));
  const docs = listing.documents as any[] | null;
  checks.push(Array.isArray(docs) && docs.length > 0);
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: "مسودة", color: "bg-muted text-muted-foreground" },
    published: { label: "منشور", color: "bg-success/15 text-success border border-success/25" },
    under_review: { label: "مراجعة", color: "bg-warning/15 text-warning border border-warning/25" },
    negotiating: { label: "تفاوض", color: "bg-primary/15 text-primary border border-primary/25" },
    completed: { label: "مكتمل", color: "bg-[hsl(270,60%,95%)] text-[hsl(270,60%,45%)] border border-[hsl(270,60%,80%)]" },
    rejected: { label: "مرفوض", color: "bg-destructive/15 text-destructive border border-destructive/25" },
  };
  return map[s] || { label: s, color: "bg-muted text-muted-foreground" };
};

const formatCurrency = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : n.toString();

const CustomerDashboardPage = () => {
  const { profile, signOut, user } = useAuthContext();
  const { getMyListings } = useListings();
  const { getMyDeals } = useDeals();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* ── Profile editing state ── */
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const userEmail = user?.email || null;

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  };

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
        const cleanValue = field === "phone" ? toDigitsOnly(value) : value;
        const { error } = await supabase.from("profiles").update({ [field]: cleanValue }).eq("user_id", profile.user_id);
        if (error) throw error;
        toast.success("تم التحديث بنجاح");
      }
    } catch (err: any) {
      toast.error(err?.message || "فشل التحديث");
    } finally {
      setSaving(false);
      setEditingField(null);
      setEditValue("");
    }
  }, [profile?.user_id]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.user_id) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 5 ميغا"); return; }
    setSaving(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${profile.user_id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("listings").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("listings").getPublicUrl(path);
      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", profile.user_id);
      if (error) throw error;
      toast.success("تم تحديث الصورة");
    } catch (err: any) {
      toast.error(err?.message || "فشل رفع الصورة");
    } finally { setSaving(false); }
  }, [profile?.user_id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const errors: string[] = [];
      let l: Listing[] = [], d: Deal[] = [];
      try { l = await getMyListings(); } catch { errors.push("الإعلانات"); }
      try { d = await getMyDeals(); } catch { errors.push("الصفقات"); }
      setListings(l); setDeals(d);
      if (errors.length) setLoadError(`فشل تحميل: ${errors.join("، ")}`);
      setLoading(false);
    };
    load();
  }, [getMyListings, getMyDeals]);

  /* ── Computed data ── */
  const stats = useMemo(() => {
    const published = listings.filter(l => l.status === "published").length;
    const draftCount = listings.filter(l => l.status === "draft").length;
    const activeDeals = deals.filter(d => d.status === "negotiating");
    const completedDeals = deals.filter(d => d.status === "completed");
    const totalDealValue = completedDeals.reduce((sum, d) => sum + (d.agreed_price || 0), 0);
    const activeDealValue = activeDeals.reduce((sum, d) => sum + (d.agreed_price || 0), 0);
    const totalListingValue = listings.reduce((sum, l) => sum + (l.price || 0), 0);
    const avgDealValue = completedDeals.length ? totalDealValue / completedDeals.length : 0;
    const successRate = deals.length ? Math.round((completedDeals.length / deals.length) * 100) : 0;
    const trustScore = profile?.trust_score ?? 50;
    return {
      published, draftCount, totalListings: listings.length,
      activeDeals: activeDeals.length, completedDeals: completedDeals.length,
      totalDealValue, activeDealValue, totalListingValue, avgDealValue,
      successRate, trustScore, totalDeals: deals.length,
    };
  }, [listings, deals, profile]);

  const drafts = useMemo(() => listings.filter(l => l.status === "draft"), [listings]);

  const recentDeals = useMemo(() =>
    [...deals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4),
    [deals]);

  const recentListings = useMemo(() =>
    listings.filter(l => l.status !== "draft").sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4),
    [listings]);

  const trustColor = stats.trustScore >= 70 ? "text-success" : stats.trustScore >= 40 ? "text-warning" : "text-destructive";
  const trustLabel = stats.trustScore >= 70 ? "ممتاز" : stats.trustScore >= 40 ? "جيد" : "يحتاج تحسين";
  const memberSince = profile?.created_at
    ? (() => {
        const d = new Date(profile.created_at);
        const day = d.getDate();
        const month = d.toLocaleDateString("ar-SA", { month: "long" });
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
      })()
    : "—";

  const lastLoginFormatted = profile?.last_activity
    ? (() => {
        const d = new Date(profile.last_activity);
        const day = d.getDate();
        const month = d.toLocaleDateString("ar-SA", { month: "long" });
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${day} ${month} ${year} - ${hours}:${minutes}`;
      })()
    : "—";

  /* ── Profile completeness ── */
  const hasRealEmail = !!(userEmail && !userEmail.endsWith("@phone.souqtaqbeel.app"));
  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    const fields = [profile.full_name, profile.phone, profile.avatar_url, hasRealEmail];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile, hasRealEmail]);
  const isProfileComplete = profileCompleteness >= 100;

  return (
    <div className="py-5 md:py-8">
      <div className="container max-w-6xl">

        {loadError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between mb-5 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-destructive shrink-0" />
              <span className="text-sm text-destructive">{loadError}</span>
            </div>
            <button onClick={() => window.location.reload()} className="text-xs text-destructive font-medium hover:underline">إعادة المحاولة</button>
          </div>
        )}

        {/* ══════ MERGED HEADER + PROFILE ══════ */}
        <div className="rounded-2xl border border-border/30 bg-card px-5 py-4 mb-5">
          <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
            {/* Avatar */}
            <label className="relative w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg cursor-pointer group overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                profile?.full_name?.charAt(0) || "؟"
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera size={14} className="text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={saving} />
            </label>

            {/* Name */}
            <div className="min-w-0 shrink-0">
              {editingField === "full_name" ? (
                <div className="flex items-center gap-1.5">
                  <input className="text-sm font-semibold bg-muted/50 rounded px-2 py-0.5 w-40 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                  <button onClick={() => saveField("full_name", editValue)} disabled={saving} className="text-success"><Check size={14} /></button>
                  <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group/name">
                  <h1 className="text-sm font-semibold">مرحباً {profile?.full_name || "بك"}</h1>
                  <button onClick={() => startEdit("full_name", profile?.full_name || "")} className="opacity-0 group-hover/name:opacity-100 transition-opacity text-muted-foreground hover:text-primary"><Pencil size={11} /></button>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="hidden md:block w-px h-6 bg-border/40" />

            {/* Inline info items - all on one line */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-1 min-w-0 flex-wrap md:flex-nowrap">
              <span className={cn("flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium",
                isProfileComplete
                  ? "bg-success/15 text-success border border-success/30"
                  : "bg-warning/15 text-warning border border-warning/30"
              )}>
                {isProfileComplete
                  ? <><UserCheck size={13} /> موثّق</>
                  : <><Shield size={13} /> غير موثّق</>
                }
              </span>

              <span className="hidden md:inline text-border/50">|</span>

              <span className="flex items-center gap-1.5 shrink-0">
                <Clock size={13} /> انضم: {memberSince}
              </span>

              <span className="hidden md:inline text-border/50">|</span>

              <span className="flex items-center gap-1.5 shrink-0">
                <Clock size={13} /> آخر دخول: {lastLoginFormatted}
              </span>

              <span className="hidden md:inline text-border/50">|</span>

              {/* Email */}
              <div className="flex items-center gap-1.5 min-w-0">
                <Mail size={13} className="shrink-0" />
                {editingField === "email" ? (
                  <div className="flex items-center gap-1">
                    <input type="email" dir="ltr" lang="en" className="bg-muted/50 rounded px-2 py-0.5 w-44 border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus placeholder="email@example.com" />
                    <button onClick={() => saveField("email", editValue)} disabled={saving} className="text-success"><Check size={12} /></button>
                    <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={12} /></button>
                  </div>
                ) : (
                  <>
                    <span className="truncate" dir="ltr">
                      {hasRealEmail ? userEmail : <span className="text-warning">لم يُضاف</span>}
                    </span>
                    <button onClick={() => startEdit("email", hasRealEmail ? (userEmail || "") : "")} className="text-primary hover:text-primary/80 shrink-0"><Pencil size={10} /></button>
                  </>
                )}
              </div>

              <span className="hidden md:inline text-border/50">|</span>

              {/* Phone */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Phone size={13} />
                {editingField === "phone" ? (
                  <div className="flex items-center gap-1">
                    <input dir="ltr" lang="en" inputMode="numeric" className="bg-muted/50 rounded px-2 py-0.5 w-28 border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary" value={editValue} onChange={e => setEditValue(toDigitsOnly(e.target.value))} autoFocus placeholder="05XXXXXXXX" />
                    <button onClick={() => saveField("phone", editValue)} disabled={saving} className="text-success"><Check size={12} /></button>
                    <button onClick={cancelEdit} className="text-muted-foreground"><XIcon size={12} /></button>
                  </div>
                ) : (
                  <>
                    <span dir="ltr">{profile?.phone ? toEnglishNumerals(profile.phone) : <span className="text-warning">لم يُضاف</span>}</span>
                    <button onClick={() => startEdit("phone", profile?.phone || "")} className="text-primary hover:text-primary/80"><Pencil size={10} /></button>
                  </>
                )}
              </div>
            </div>
          </div>


          {/* Profile completeness bar */}
          <div className="mt-3 pt-3 border-t border-border/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">اكتمال الملف الشخصي</span>
              <span className={cn("text-xs font-medium",
                isProfileComplete ? "text-success" : profileCompleteness >= 50 ? "text-warning" : "text-destructive"
              )}>{profileCompleteness}%</span>
            </div>
            {isProfileComplete ? (
              <div className="flex items-center gap-1.5 text-xs text-success">
                <CheckCircle size={13} />
                <span className="font-medium">ملفك الشخصي مكتمل — حسابك موثّق</span>
              </div>
            ) : (
              <>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500",
                    profileCompleteness >= 75 ? "bg-success" : profileCompleteness >= 50 ? "bg-warning" : "bg-destructive"
                  )} style={{ width: `${profileCompleteness}%` }} />
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">
                  أكمل: {!profile?.full_name && "الاسم · "}{!profile?.phone && "الجوال · "}{!hasRealEmail && "الإيميل · "}{!profile?.avatar_url && "الصورة"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* ══════ FINANCIAL OVERVIEW ══════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl p-3 bg-card border border-border/30 hover:border-primary/20 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <Wallet size={14} strokeWidth={1.3} className="text-primary" />
              <span className="text-[8px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">إجمالي</span>
            </div>
            <div className="text-lg font-bold leading-tight">{loading ? "—" : `${formatCurrency(stats.totalDealValue)}`}</div>
            <div className="text-[9px] text-muted-foreground">ر.س · الصفقات المكتملة</div>
          </div>
          <div className="rounded-xl p-3 bg-card border border-border/30 hover:border-primary/20 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <Activity size={14} strokeWidth={1.3} className="text-primary" />
              <span className="text-[8px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">نشط</span>
            </div>
            <div className="text-lg font-bold leading-tight">{loading ? "—" : `${formatCurrency(stats.activeDealValue)}`}</div>
            <div className="text-[9px] text-muted-foreground">ر.س · قيد التفاوض ({stats.activeDeals})</div>
          </div>
          <div className="rounded-xl p-3 bg-card border border-border/30 hover:border-primary/20 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <BarChart3 size={14} strokeWidth={1.3} className="text-primary" />
              <span className="text-[8px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">متوسط</span>
            </div>
            <div className="text-lg font-bold leading-tight">{loading ? "—" : `${formatCurrency(stats.avgDealValue)}`}</div>
            <div className="text-[9px] text-muted-foreground">ر.س · متوسط قيمة الصفقة</div>
          </div>
          <div className="rounded-xl p-3 bg-card border border-border/30 hover:border-primary/20 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <TrendingUp size={14} strokeWidth={1.3} className="text-success" />
              <span className="text-[8px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">نجاح</span>
            </div>
            <div className="text-lg font-bold leading-tight">{loading ? "—" : `${stats.successRate}%`}</div>
            <div className="text-[9px] text-muted-foreground">{stats.completedDeals} من {stats.totalDeals} صفقة</div>
          </div>
        </div>

        {/* ══════ DRAFTS (compact inline) ══════ */}
        {!loading && drafts.length > 0 && (
          <div className="rounded-xl border border-warning/20 bg-warning/[0.03] p-3 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Edit3 size={12} className="text-warning" />
              <span className="text-[10px] font-medium text-warning">مسودات تحتاج إكمال</span>
              <span className="text-[8px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-md">{drafts.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {drafts.map((d) => {
                const progress = calcDraftProgress(d);
                return (
                  <Link key={d.id} to={`/listing/${d.id}`} className="flex items-center gap-2.5 p-2 rounded-lg bg-card border border-border/20 hover:border-warning/30 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-medium truncate">{d.title || "بدون عنوان"}</span>
                        <span className={cn("text-[8px] font-medium shrink-0 mr-1",
                          progress >= 80 ? "text-success" : progress >= 50 ? "text-warning" : "text-destructive"
                        )}>{progress}%</span>
                      </div>
                      <div className="w-full h-0.5 rounded-full bg-warning/10 overflow-hidden">
                        <div className={cn("h-full rounded-full",
                          progress >= 80 ? "bg-success" : progress >= 50 ? "bg-warning" : "bg-destructive"
                        )} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <ChevronLeft size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════ TWO-COLUMN: DEALS + LISTINGS | ACTIONS + NOTIFICATIONS ══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ═══ MAIN COLUMN (2/3) ═══ */}
          <div className="lg:col-span-2 space-y-4">

            {/* ── My Deals ── */}
            <section className="rounded-xl border border-border/30 bg-card overflow-hidden">
              <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
                <h2 className="text-[11px] font-medium flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-primary" />
                  صفقاتي
                </h2>
                {deals.length > 4 && <span className="text-[9px] text-muted-foreground">{deals.length} صفقة</span>}
              </div>
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 size={14} className="animate-spin text-primary" /></div>
              ) : deals.length === 0 ? (
                <div className="text-center py-6 px-4">
                  <MessageSquare size={18} className="mx-auto mb-1.5 text-muted-foreground/20" strokeWidth={1} />
                  <p className="text-[10px] text-muted-foreground">لا توجد صفقات بعد</p>
                  <Link to="/marketplace" className="text-[9px] text-primary hover:underline mt-0.5 inline-block">تصفح السوق</Link>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {recentDeals.map((deal) => {
                    const st = statusBadge(deal.status);
                    const isCompleted = deal.status === "completed";
                    return (
                      <Link key={deal.id} to={isCompleted ? `/agreement/${deal.id}` : `/negotiate/${deal.id}`}
                        className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-muted/30 transition-colors group">
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                          isCompleted ? "bg-[hsl(270,60%,95%)]" : "bg-primary/10"
                        )}>
                          {isCompleted
                            ? <CheckCircle size={11} className="text-[hsl(270,60%,45%)]" />
                            : <MessageSquare size={11} className="text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-medium truncate">صفقة #{deal.id.slice(0, 6)}</div>
                          <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
                            <span>{new Date(deal.created_at).toLocaleDateString("en-GB")}</span>
                            {deal.agreed_price && <><span>·</span><span className="font-medium text-foreground/70">{Number(deal.agreed_price).toLocaleString()} ر.س</span></>}
                          </div>
                        </div>
                        <span className={cn("text-[8px] px-1.5 py-0.5 rounded-md", st.color)}>{st.label}</span>
                        <ChevronLeft size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── My Listings ── */}
            <section className="rounded-xl border border-border/30 bg-card overflow-hidden">
              <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
                <h2 className="text-[11px] font-medium flex items-center gap-1.5">
                  <FileText size={12} className="text-primary" />
                  إعلاناتي المنشورة
                </h2>
                <Link to="/create-listing" className="flex items-center gap-1 text-[9px] text-primary hover:underline">
                  <Plus size={9} /> إعلان جديد
                </Link>
              </div>
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 size={14} className="animate-spin text-primary" /></div>
              ) : recentListings.length === 0 ? (
                <div className="text-center py-6 px-4">
                  <FileText size={18} className="mx-auto mb-1.5 text-muted-foreground/20" strokeWidth={1} />
                  <p className="text-[10px] text-muted-foreground mb-0.5">لا توجد إعلانات منشورة</p>
                  <Link to="/create-listing" className="text-[9px] text-primary hover:underline">أنشئ إعلانك الأول</Link>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {recentListings.map((listing) => {
                    const st = statusBadge(listing.status);
                    return (
                      <Link key={listing.id} to={`/listing/${listing.id}`}
                        className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-muted/30 transition-colors group">
                        <div className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <FileText size={11} className="text-foreground/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-medium truncate">{listing.title || "بدون عنوان"}</div>
                          <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
                            <span>{new Date(listing.created_at).toLocaleDateString("en-GB")}</span>
                            {listing.city && <><span>·</span><span>{listing.city}</span></>}
                            {listing.price && <><span>·</span><span className="font-medium text-foreground/70">{Number(listing.price).toLocaleString()} ر.س</span></>}
                          </div>
                        </div>
                        <span className={cn("text-[8px] px-1.5 py-0.5 rounded-md", st.color)}>{st.label}</span>
                        <ChevronLeft size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ═══ SIDEBAR (1/3) ═══ */}
          <div className="space-y-4">

            {/* ── Quick Actions ── */}
            <div className="rounded-xl border border-border/30 bg-card p-3 space-y-1">
              <h3 className="text-[11px] font-medium mb-1.5">إجراءات سريعة</h3>
              {drafts.length > 0 && (
                <Link to={`/listing/${drafts[0].id}`} className="flex items-center gap-2 p-2 rounded-lg bg-warning/5 hover:bg-warning/10 transition-colors group">
                  <div className="w-6 h-6 rounded-md bg-warning/15 flex items-center justify-center shrink-0">
                    <Edit3 size={11} className="text-warning" />
                  </div>
                  <span className="text-[10px] font-medium flex-1">إكمال المسودة</span>
                  <ChevronLeft size={9} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
                </Link>
              )}
              <Link to="/create-listing" className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors group">
                <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center shrink-0">
                  <Plus size={11} strokeWidth={2} className="text-primary-foreground" />
                </div>
                <span className="text-[10px] font-medium flex-1">إنشاء إعلان جديد</span>
                <ChevronLeft size={9} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
              </Link>
              <Link to="/marketplace" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <Eye size={11} className="text-foreground/60" />
                </div>
                <span className="text-[10px] font-medium flex-1">تصفح السوق</span>
                <ChevronLeft size={9} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
              </Link>
            </div>

            {/* ── Notifications ── */}
            {notifications.length > 0 && (
              <div className="rounded-xl border border-border/30 bg-card p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-[11px] font-medium">
                    الإشعارات {unreadCount > 0 && <span className="text-[9px] text-primary mr-1">({unreadCount})</span>}
                  </h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[9px] text-primary hover:underline">قراءة الكل</button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {notifications.slice(0, 3).map(n => (
                    <button key={n.id} onClick={() => markAsRead(n.id)} className={cn("w-full text-right p-1.5 rounded-lg transition-all text-[10px]", !n.is_read && "bg-primary/[0.03]")}>
                      <div className="flex items-start gap-1.5">
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{n.title}</div>
                          {n.body && <div className="text-muted-foreground text-[8px] truncate">{n.body}</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Help ── */}
            <Link to="/contact" className="block rounded-xl border border-border/30 bg-card p-3 hover:border-primary/20 transition-colors group">
              <div className="text-[11px] font-medium mb-0.5">تحتاج مساعدة؟</div>
              <div className="text-[9px] text-muted-foreground">تواصل مع فريق الدعم</div>
              <span className="text-[9px] text-primary mt-1 inline-block group-hover:underline">تواصل معنا ←</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
