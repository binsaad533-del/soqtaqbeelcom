import { useState, useEffect, useCallback } from "react";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, CheckCircle, XCircle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface Verification {
  id: string;
  user_id: string;
  business_name: string | null;
  commercial_register_number: string | null;
  id_type: string;
  id_number: string;
  verification_status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: "قيد المراجعة", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  approved: { label: "مقبول", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  rejected: { label: "مرفوض", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expired: { label: "منتهي", cls: "bg-muted text-muted-foreground" },
};

const ID_TYPE_MAP: Record<string, string> = {
  national_id: "هوية وطنية",
  iqama: "إقامة",
  passport: "جواز سفر",
};

const AdminVerificationsPage = () => {
  useSEO({ title: "طلبات التوثيق", description: "مراجعة طلبات توثيق البائعين على سوق تقبيل", canonical: "/admin-verifications" });
  const { user } = useAuthContext();
  const [items, setItems] = useState<Verification[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [rejectDialog, setRejectDialog] = useState<Verification | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("seller_verifications")
      .select("*")
      .order("submitted_at", { ascending: false });
    const rows = (data || []) as unknown as Verification[];
    setItems(rows);

    // Load profile names
    const userIds = [...new Set(rows.map(r => r.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name || "—"; });
      setProfiles(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (item: Verification) => {
    if (!user) return;
    setActing(true);
    const { error } = await supabase
      .from("seller_verifications")
      .update({
        verification_status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      } as any)
      .eq("id", item.id);
    setActing(false);
    if (error) { toast.error("حدث خطأ"); return; }
    toast.success("تم قبول طلب التحقق ✓");
    load();
  };

  const handleReject = async () => {
    if (!rejectDialog || !user) return;
    if (!rejectReason.trim()) { toast.error("يرجى كتابة سبب الرفض"); return; }
    setActing(true);
    const { error } = await supabase
      .from("seller_verifications")
      .update({
        verification_status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        rejection_reason: rejectReason.trim(),
      } as any)
      .eq("id", rejectDialog.id);
    setActing(false);
    if (error) { toast.error("حدث خطأ"); return; }
    toast.success("تم رفض الطلب");
    setRejectDialog(null);
    setRejectReason("");
    load();
  };

  const filtered = items.filter(i => {
    if (filter !== "all" && i.verification_status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = profiles[i.user_id]?.toLowerCase() || "";
      if (!name.includes(s) && !i.business_name?.toLowerCase().includes(s) && !i.commercial_register_number?.includes(s) && !i.id_number.includes(s)) return false;
    }
    return true;
  });

  const counts = {
    all: items.length,
    pending: items.filter(i => i.verification_status === "pending").length,
    approved: items.filter(i => i.verification_status === "approved").length,
    rejected: items.filter(i => i.verification_status === "rejected").length,
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">مراجعة طلبات التحقق</h1>
        <Badge variant="secondary" className="mr-auto">{counts.pending} قيد المراجعة</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "الكل" : STATUS_MAP[f]?.label} ({counts[f]})
          </Button>
        ))}
        <div className="relative mr-auto">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-8 w-48" />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">لا توجد طلبات</div>
      ) : (
        <div className="border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-right px-4 py-3 font-medium">البائع</th>
                <th className="text-right px-4 py-3 font-medium">اسم النشاط</th>
                <th className="text-right px-4 py-3 font-medium">السجل التجاري</th>
                <th className="text-right px-4 py-3 font-medium">نوع الهوية</th>
                <th className="text-right px-4 py-3 font-medium">رقم الهوية</th>
                <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                <th className="text-right px-4 py-3 font-medium">الحالة</th>
                <th className="text-center px-4 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const st = STATUS_MAP[item.verification_status] || STATUS_MAP.pending;
                return (
                  <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{profiles[item.user_id] || "—"}</td>
                    <td className="px-4 py-3">{item.business_name || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.commercial_register_number || "—"}</td>
                    <td className="px-4 py-3">{ID_TYPE_MAP[item.id_type] || item.id_type}</td>
                    <td className="px-4 py-3 font-mono text-xs">{hasRole('platform_owner') ? item.id_number : `****${item.id_number.slice(-4)}`}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(item.submitted_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      {item.rejection_reason && (
                        <p className="text-[10px] text-destructive mt-1 max-w-[140px] truncate" title={item.rejection_reason}>
                          {item.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.verification_status === "pending" && (
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 px-2" onClick={() => handleApprove(item)} disabled={acting}>
                            <CheckCircle className="w-4 h-4 ml-1" /> قبول
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8 px-2" onClick={() => { setRejectDialog(item); setRejectReason(""); }} disabled={acting}>
                            <XCircle className="w-4 h-4 ml-1" /> رفض
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={open => { if (!open) setRejectDialog(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض طلب التحقق</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">البائع: <strong>{rejectDialog ? profiles[rejectDialog.user_id] || "—" : ""}</strong></p>
            <Textarea placeholder="سبب الرفض (مطلوب)..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} maxLength={500} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleReject} disabled={acting || !rejectReason.trim()}>
              {acting ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVerificationsPage;
