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
  Plus, FileText, MessageSquare, Shield, AlertCircle,
  Eye, CheckCircle, Loader2, Activity, ChevronLeft,
  TrendingUp, Edit3, Wallet, Clock,
  UserCheck, Phone, Camera, Mail, Pencil, Check, X as XIcon,
  Sparkles, ArrowRight, Zap, BarChart3, DollarSign,
  Pause, Play, RefreshCw
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { toEnglishNumerals, toDigitsOnly } from "@/lib/arabicNumerals";

/* ── Status mapping for pipeline ── */
const PIPELINE_STAGES = [
  { key: "new", label: "جديدة", color: "bg-muted" },
  { key: "under_review", label: "مراجعة", color: "bg-warning/15" },
  { key: "negotiating", label: "تفاوض", color: "bg-primary/15" },
  { key: "agreement", label: "اتفاقية", color: "bg-accent/30" },
  { key: "completed", label: "مغلقة", color: "bg-success/15" },
] as const;

type StageKey = typeof PIPELINE_STAGES[number]["key"];

const mapDealToStage = (deal: Deal): StageKey => {
  const s = deal.status;
  if (s === "completed" || s === "finalized") return "completed";
  if (s === "agreement" || s === "locked") return "agreement";
  if (s === "negotiating") return "negotiating";
  if (s === "under_review" || s === "review") return "under_review";
  return "new";
};

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: "مسودة", color: "bg-muted text-muted-foreground" },
    published: { label: "منشور", color: "bg-success/15 text-success" },
    under_review: { label: "مراجعة", color: "bg-warning/15 text-warning" },
    negotiating: { label: "تفاوض", color: "bg-primary/15 text-primary" },
    completed: { label: "مكتمل", color: "bg-success/15 text-success" },
    finalized: { label: "مكتمل", color: "bg-success/15 text-success" },
    new: { label: "جديدة", color: "bg-muted text-muted-foreground" },
    agreement: { label: "اتفاقية", color: "bg-accent/30 text-accent-foreground" },
  };
  return map[s] || { label: s, color: "bg-muted text-muted-foreground" };
};

const formatCurrency = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : n.toString();

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
  const [activeSection, setActiveSection] = useState<string | null>(null);

  /* ── Profile editing ── */
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── AI Moqbel panel ── */
  const [moqbelOpen, setMoqbelOpen] = useState(false);
  const [moqbelMsg, setMoqbelMsg] = useState("");
  const [moqbelLoading, setMoqbelLoading] = useState(false);
  const [moqbelResponse, setMoqbelResponse] = useState("");

  const userEmail = user?.email || null;
  const hasRealEmail = !!(userEmail && !userEmail.endsWith("@phone.souqtaqbeel.app"));

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

  /* ── Live activity feed via realtime ── */
  const [activityFeed, setActivityFeed] = useState<Array<{ id: string; text: string; time: string; type: string }>>([]);
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, (payload) => {
        const d = payload.new as any;
        if (d?.buyer_id === user.id || d?.seller_id === user.id) {
          setActivityFeed(prev => [{
            id: crypto.randomUUID(),
            text: payload.eventType === "INSERT" ? "صفقة جديدة تم إنشاؤها" : `تحديث صفقة: ${statusBadge(d.status).label}`,
            time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
            type: payload.eventType === "INSERT" ? "new" : "update"
          }, ...prev].slice(0, 10));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "negotiation_messages" }, (payload) => {
        const m = payload.new as any;
        setActivityFeed(prev => [{
          id: crypto.randomUUID(),
          text: "رسالة تفاوض جديدة",
          time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
          type: "message"
        }, ...prev].slice(0, 10));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, (payload) => {
        const l = payload.new as any;
        if (l?.owner_id === user.id) {
          setActivityFeed(prev => [{
            id: crypto.randomUUID(),
            text: payload.eventType === "UPDATE" ? "تم تحديث إعلانك" : "إعلان جديد",
            time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
            type: "listing"
          }, ...prev].slice(0, 10));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  /* ── Computed stats ── */
  const stats = useMemo(() => {
    const activeDeals = deals.filter(d => !["completed", "finalized", "cancelled"].includes(d.status));
    const waitingDeals = deals.filter(d => d.status === "under_review" || d.status === "review");
    const completedDeals = deals.filter(d => d.status === "completed" || d.status === "finalized");
    const totalValue = deals.reduce((s, d) => s + (d.agreed_price || 0), 0);
    const commission = totalValue * 0.01;
    return { activeDeals: activeDeals.length, waiting: waitingDeals.length, completed: completedDeals.length, totalValue, commission };
  }, [deals]);

  /* ── Pipeline data ── */
  const pipeline = useMemo(() => {
    const map: Record<StageKey, Deal[]> = { new: [], under_review: [], negotiating: [], agreement: [], completed: [] };
    deals.forEach(d => { map[mapDealToStage(d)].push(d); });
    return map;
  }, [deals]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStage = result.destination.droppableId as StageKey;
    const statusMap: Record<StageKey, string> = {
      new: "new", under_review: "under_review", negotiating: "negotiating", agreement: "agreement", completed: "completed"
    };
    const { error } = await supabase.from("deals").update({ status: statusMap[newStage] }).eq("id", dealId);
    if (error) { toast.error("فشل تحديث الحالة"); return; }
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: statusMap[newStage] } : d));
    toast.success("تم تحديث حالة الصفقة");
  }, []);

  /* ── Moqbel AI ── */
  const askMoqbel = useCallback(async (prompt: string) => {
    setMoqbelLoading(true);
    setMoqbelResponse("");
    try {
      const context = `صفقات المستخدم: ${deals.length}، نشطة: ${stats.activeDeals}، مكتملة: ${stats.completed}، إجمالي القيمة: ${stats.totalValue} ر.س`;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          context,
        }),
      });
      if (!resp.ok || !resp.body) throw new Error("Failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { fullText += c; setMoqbelResponse(fullText); }
          } catch {}
        }
      }
    } catch {
      setMoqbelResponse("عذراً، حدث خطأ. حاول مرة أخرى.");
    } finally {
      setMoqbelLoading(false);
    }
  }, [deals, stats]);

  /* ── Inline price edit for listings ── */
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceValue, setPriceValue] = useState("");

  const savePrice = useCallback(async (listingId: string) => {
    const num = Number(priceValue);
    if (!priceValue || isNaN(num) || num <= 0) { toast.error("سعر غير صالح"); return; }
    const { error } = await updateListing(listingId, { price: num } as never);
    if (error) { toast.error("فشل التحديث"); return; }
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, price: num } : l));
    setEditingPrice(null);
    toast.success("تم تحديث السعر");
  }, [priceValue, updateListing]);

  const isPhoneVerified = !!(profile as any)?.phone_verified;
  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    const fields = [profile.full_name, profile.phone, profile.avatar_url, hasRealEmail, isPhoneVerified];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile, hasRealEmail, isPhoneVerified]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-5 md:py-8">
      <div className="container max-w-7xl">

        {loadError && (
          <div className="p-3 rounded-xl bg-destructive/10 flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-destructive" />
              <span className="text-xs text-destructive">{loadError}</span>
            </div>
            <button onClick={() => window.location.reload()} className="text-xs text-destructive font-medium hover:underline">إعادة المحاولة</button>
          </div>
        )}

        {/* ══════ HEADER ══════ */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">
              مرحباً{profile?.full_name ? ` ${profile.full_name}` : ""} 👋
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">لوحة التحكم · ملخص نشاطك وصفقاتك</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/create-listing" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              <Plus size={14} /> إعلان جديد
            </Link>
          </div>
        </div>

        {/* ══════ PERSONAL SUMMARY STATS ══════ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "صفقات نشطة", value: stats.activeDeals, icon: Activity, accent: "text-primary", filter: "active" },
            { label: "بانتظار الرد", value: stats.waiting, icon: Pause, accent: "text-warning", filter: "waiting" },
            { label: "مكتملة", value: stats.completed, icon: CheckCircle, accent: "text-success", filter: "completed" },
            { label: "إجمالي القيمة", value: `${formatCurrency(stats.totalValue)} ر.س`, icon: Wallet, accent: "text-primary", filter: "value" },
            { label: "عمولة المنصة (1%)", value: `${formatCurrency(stats.commission)} ر.س`, icon: DollarSign, accent: "text-muted-foreground", filter: "commission" },
          ].map((stat, i) => (
            <button
              key={i}
              onClick={() => setActiveSection(activeSection === stat.filter ? null : stat.filter)}
              className={cn(
                "rounded-xl p-3.5 bg-card border transition-all text-right group cursor-pointer",
                activeSection === stat.filter ? "border-primary/30 ring-1 ring-primary/10" : "border-border/20 hover:border-primary/15"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={14} strokeWidth={1.4} className={stat.accent} />
                <span className="text-[10px] text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-lg font-bold">{stat.value}</div>
            </button>
          ))}
        </div>

        {/* ══════ PROFILE COMPACT (only if incomplete) ══════ */}
        {profileCompleteness < 100 && (
          <div className="rounded-xl border border-warning/20 bg-warning/[0.03] p-4 mb-6 flex items-center gap-4">
            <label className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm cursor-pointer group overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (profile?.full_name?.charAt(0) || "؟")}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera size={12} className="text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={saving} />
            </label>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">أكمل ملفك الشخصي</span>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                  profileCompleteness >= 60 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                )}>{profileCompleteness}%</span>
              </div>
              <div className="w-full h-1 rounded-full bg-muted overflow-hidden mb-1.5">
                <div className={cn("h-full rounded-full transition-all",
                  profileCompleteness >= 75 ? "bg-success" : profileCompleteness >= 50 ? "bg-warning" : "bg-destructive"
                )} style={{ width: `${profileCompleteness}%` }} />
              </div>
              <div className="flex flex-wrap gap-2 text-[9px] text-muted-foreground">
                {!profile?.full_name && <span className="text-warning">• الاسم</span>}
                {!profile?.phone && <span className="text-warning">• الجوال</span>}
                {!hasRealEmail && <span className="text-warning">• البريد</span>}
                {!profile?.avatar_url && <span className="text-warning">• الصورة</span>}
                {!isPhoneVerified && profile?.phone && <span className="text-warning">• توثيق الجوال</span>}
              </div>
              {!isPhoneVerified && profile?.phone && (
                <div className="mt-2">
                  <PhoneVerificationFlow initialPhone={profile.phone} onVerified={() => window.location.reload()} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════ DEAL PIPELINE (Kanban) ══════ */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 size={15} className="text-primary" />
              مسار الصفقات
            </h2>
            <span className="text-[10px] text-muted-foreground">{deals.length} صفقة</span>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 min-h-[180px]">
              {PIPELINE_STAGES.map((stage) => (
                <Droppable droppableId={stage.key} key={stage.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "rounded-xl p-2 min-h-[160px] transition-colors",
                        snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[10px] font-medium">{stage.label}</span>
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium", stage.color)}>
                          {pipeline[stage.key].length}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {pipeline[stage.key].map((deal, idx) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={idx}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                onClick={() => navigate(deal.status === "completed" || deal.status === "finalized" ? `/agreement/${deal.id}` : `/negotiate/${deal.id}`)}
                                className={cn(
                                  "rounded-lg bg-card p-2.5 cursor-pointer transition-all text-right",
                                  snap.isDragging ? "shadow-lg ring-1 ring-primary/20 rotate-1" : "hover:shadow-sm border border-border/15"
                                )}
                              >
                                <div className="text-[10px] font-medium truncate mb-1">
                                  صفقة #{deal.id.slice(0, 6)}
                                </div>
                                {deal.agreed_price && (
                                  <div className="text-[9px] text-muted-foreground">
                                    {Number(deal.agreed_price).toLocaleString()} ر.س
                                  </div>
                                )}
                                <div className="text-[8px] text-muted-foreground mt-1">
                                  {new Date(deal.updated_at).toLocaleDateString("en-GB")}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </div>

        {/* ══════ MAIN GRID: Deals + Listings | AI + Activity ══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ═══ LEFT (2/3): My Deals + Listings ═══ */}
          <div className="lg:col-span-2 space-y-5">

            {/* ── My Deals Table ── */}
            <section className="rounded-xl bg-card border border-border/15 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-xs font-semibold flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-primary" />
                  صفقاتي
                </h2>
                <span className="text-[9px] text-muted-foreground">{deals.length} صفقة</span>
              </div>

              {deals.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageSquare size={20} className="mx-auto mb-2 text-muted-foreground/20" strokeWidth={1} />
                  <p className="text-xs text-muted-foreground mb-1">لا توجد صفقات بعد</p>
                  <Link to="/marketplace" className="text-xs text-primary hover:underline">تصفح السوق</Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/10">
                        <th className="text-right px-4 py-2 text-[10px] text-muted-foreground font-medium">الصفقة</th>
                        <th className="text-right px-4 py-2 text-[10px] text-muted-foreground font-medium">السعر</th>
                        <th className="text-right px-4 py-2 text-[10px] text-muted-foreground font-medium">الحالة</th>
                        <th className="text-right px-4 py-2 text-[10px] text-muted-foreground font-medium">آخر نشاط</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {deals.map((deal) => {
                        const st = statusBadge(deal.status);
                        return (
                          <tr key={deal.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-medium">#{deal.id.slice(0, 6)}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {deal.agreed_price ? `${Number(deal.agreed_price).toLocaleString()} ر.س` : "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={cn("text-[9px] px-2 py-0.5 rounded-md", st.color)}>{st.label}</span>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground text-[10px]">
                              {new Date(deal.updated_at).toLocaleDateString("en-GB")}
                            </td>
                            <td className="px-4 py-2.5">
                              <Link
                                to={deal.status === "completed" || deal.status === "finalized" ? `/agreement/${deal.id}` : `/negotiate/${deal.id}`}
                                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                              >
                                عرض <ArrowRight size={10} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── My Listings ── */}
            <section className="rounded-xl bg-card border border-border/15 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-xs font-semibold flex items-center gap-1.5">
                  <FileText size={13} className="text-primary" />
                  إعلاناتي
                </h2>
                <Link to="/create-listing" className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                  <Plus size={10} /> إعلان جديد
                </Link>
              </div>

              {listings.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <FileText size={20} className="mx-auto mb-2 text-muted-foreground/20" strokeWidth={1} />
                  <p className="text-xs text-muted-foreground mb-1">لا توجد إعلانات</p>
                  <Link to="/create-listing" className="text-xs text-primary hover:underline">أنشئ إعلانك الأول</Link>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {listings.map((listing) => {
                    const st = statusBadge(listing.status);
                    return (
                      <div key={listing.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{listing.title || "بدون عنوان"}</div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            {listing.city && <span>{listing.city}</span>}
                            <span>·</span>
                            {editingPrice === listing.id ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <input
                                  dir="ltr" lang="en" inputMode="numeric"
                                  className="w-20 px-1.5 py-0.5 rounded border border-primary/30 bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/20"
                                  value={priceValue}
                                  onChange={e => setPriceValue(toDigitsOnly(e.target.value))}
                                  autoFocus
                                  onKeyDown={e => e.key === "Enter" && savePrice(listing.id)}
                                />
                                <button onClick={() => savePrice(listing.id)} className="text-success"><Check size={11} /></button>
                                <button onClick={() => setEditingPrice(null)} className="text-muted-foreground"><XIcon size={11} /></button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingPrice(listing.id); setPriceValue(listing.price ? String(listing.price) : ""); }}
                                className="flex items-center gap-0.5 hover:text-primary transition-colors"
                              >
                                <span>{listing.price ? `${Number(listing.price).toLocaleString()} ر.س` : "بدون سعر"}</span>
                                <Pencil size={9} className="opacity-0 group-hover:opacity-100" />
                              </button>
                            )}
                          </div>
                        </div>
                        <span className={cn("text-[9px] px-2 py-0.5 rounded-md shrink-0", st.color)}>{st.label}</span>
                        <Link to={`/listing/${listing.id}`} className="text-[10px] text-primary hover:underline shrink-0 flex items-center gap-1">
                          عرض <ChevronLeft size={10} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ═══ RIGHT (1/3): AI Moqbel + Activity Feed + Actions ═══ */}
          <div className="space-y-5">

            {/* ── AI Moqbel Panel ── */}
            <section className="rounded-xl bg-card border border-border/15 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles size={13} className="text-primary" />
                  مقبل · المساعد الذكي
                </h2>
                <button
                  onClick={() => setMoqbelOpen(!moqbelOpen)}
                  className="text-[9px] text-primary hover:underline"
                >
                  {moqbelOpen ? "إغلاق" : "فتح"}
                </button>
              </div>

              {/* Quick insights */}
              <div className="px-4 pb-3 space-y-1.5">
                {stats.activeDeals > 0 && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/[0.04]">
                    <Zap size={12} className="text-primary mt-0.5 shrink-0" />
                    <span className="text-[10px] text-muted-foreground">
                      لديك {stats.activeDeals} صفقة نشطة بقيمة إجمالية {formatCurrency(stats.totalValue)} ر.س
                    </span>
                  </div>
                )}
                {stats.waiting > 0 && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-warning/[0.04]">
                    <Clock size={12} className="text-warning mt-0.5 shrink-0" />
                    <span className="text-[10px] text-muted-foreground">
                      {stats.waiting} صفقة بانتظار ردك
                    </span>
                  </div>
                )}
              </div>

              {/* Quick action buttons */}
              <div className="px-4 pb-3 space-y-1.5">
                <button
                  onClick={() => askMoqbel("حلل صفقاتي الحالية وقدم لي تقييم للأسعار ونصائح عملية")}
                  disabled={moqbelLoading}
                  className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-right"
                >
                  <TrendingUp size={12} className="text-primary shrink-0" />
                  <span className="text-[10px]">تحليل الأسعار والسوق</span>
                </button>
                <button
                  onClick={() => askMoqbel("ما مستوى المخاطر في صفقاتي الحالية؟ وما نصيحتك؟")}
                  disabled={moqbelLoading}
                  className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-right"
                >
                  <Shield size={12} className="text-warning shrink-0" />
                  <span className="text-[10px]">تقييم المخاطر</span>
                </button>
                <button
                  onClick={() => askMoqbel("فاوض نيابة عني واقترح أفضل استراتيجية تفاوض لصفقاتي")}
                  disabled={moqbelLoading}
                  className="w-full flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-right"
                >
                  <Sparkles size={12} className="text-primary shrink-0" />
                  <span className="text-[10px] font-medium text-primary">خل مقبل يفاوض عنك</span>
                </button>
              </div>

              {/* AI Response */}
              {(moqbelLoading || moqbelResponse) && (
                <div className="px-4 pb-3">
                  <div className="rounded-lg bg-muted/20 p-3 text-[10px] leading-relaxed text-muted-foreground max-h-48 overflow-y-auto">
                    {moqbelLoading && !moqbelResponse && (
                      <div className="flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-primary" />
                        <span>مقبل يفكر...</span>
                      </div>
                    )}
                    {moqbelResponse && <div className="whitespace-pre-wrap">{moqbelResponse}</div>}
                  </div>
                </div>
              )}

              {/* Chat input (expanded) */}
              {moqbelOpen && (
                <div className="px-4 pb-3">
                  <div className="flex gap-1.5">
                    <input
                      value={moqbelMsg}
                      onChange={e => setMoqbelMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && moqbelMsg.trim()) { askMoqbel(moqbelMsg); setMoqbelMsg(""); } }}
                      placeholder="اسأل مقبل..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-border/30 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                    <button
                      onClick={() => { if (moqbelMsg.trim()) { askMoqbel(moqbelMsg); setMoqbelMsg(""); } }}
                      disabled={moqbelLoading || !moqbelMsg.trim()}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs disabled:opacity-50"
                    >
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* ── Live Activity Feed ── */}
            <section className="rounded-xl bg-card border border-border/15 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold flex items-center gap-1.5">
                  <Activity size={13} className="text-success" />
                  النشاط المباشر
                </h2>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[9px] text-muted-foreground">مباشر</span>
                </div>
              </div>
              <div className="px-4 pb-3">
                {activityFeed.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-4">لا يوجد نشاط حتى الآن</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {activityFeed.map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/20 transition-colors">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                          item.type === "new" ? "bg-success" : item.type === "message" ? "bg-primary" : "bg-warning"
                        )} />
                        <span className="text-[10px] text-muted-foreground flex-1">{item.text}</span>
                        <span className="text-[8px] text-muted-foreground/60 shrink-0">{item.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ── Notifications ── */}
            {notifications.length > 0 && (
              <section className="rounded-xl bg-card border border-border/15 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between">
                  <h2 className="text-xs font-semibold">
                    الإشعارات {unreadCount > 0 && <span className="text-[9px] text-primary mr-1">({unreadCount})</span>}
                  </h2>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[9px] text-primary hover:underline">قراءة الكل</button>
                  )}
                </div>
                <div className="px-4 pb-3 space-y-1">
                  {notifications.slice(0, 4).map(n => (
                    <button key={n.id} onClick={() => markAsRead(n.id)} className={cn("w-full text-right p-2 rounded-lg transition-all text-[10px]", !n.is_read && "bg-primary/[0.03]")}>
                      <div className="flex items-start gap-1.5">
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{n.title}</div>
                          {n.body && <div className="text-muted-foreground text-[9px] truncate">{n.body}</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ── Quick Actions ── */}
            <div className="rounded-xl bg-card border border-border/15 p-3 space-y-1.5">
              <h3 className="text-xs font-semibold mb-2">إجراءات سريعة</h3>
              <Link to="/marketplace" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors group">
                <Eye size={12} className="text-muted-foreground" />
                <span className="text-[10px] flex-1">تصفح السوق</span>
                <ChevronLeft size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
              </Link>
              <Link to="/contact" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors group">
                <Mail size={12} className="text-muted-foreground" />
                <span className="text-[10px] flex-1">تواصل مع الدعم</span>
                <ChevronLeft size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
