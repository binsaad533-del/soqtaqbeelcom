import { useState, useEffect, useCallback } from "react";
import {
  useCommissions,
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_COLORS,
  type Commission,
  type CommissionStatus,
} from "@/hooks/useCommissions";
import { Landmark, CheckCircle2, Clock, AlertTriangle, Eye, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CommissionAdminPanel = () => {
  const { getAllCommissions, verifyCommission, sendReminder } = useCommissions();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid" | "overdue" | "verified">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAllCommissions();
    setCommissions(data);
    setLoading(false);
  }, [getAllCommissions]);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const isOverdue = (c: Commission) => {
    if (c.payment_status === "verified") return false;
    const created = new Date(c.created_at);
    return (now.getTime() - created.getTime()) > 7 * 24 * 60 * 60 * 1000;
  };

  const filtered = commissions.filter(c => {
    const s = c.payment_status as CommissionStatus;
    if (filter === "unpaid") return s === "unpaid" || s === "reminder_sent";
    if (filter === "paid") return s === "paid_unverified" || s === "paid_proof_uploaded";
    if (filter === "overdue") return isOverdue(c);
    if (filter === "verified") return s === "verified";
    return true;
  });

  const totalUnpaid = commissions
    .filter(c => !["verified"].includes(c.payment_status))
    .reduce((sum, c) => sum + c.commission_amount, 0);
  const totalVerified = commissions
    .filter(c => c.payment_status === "verified")
    .reduce((sum, c) => sum + c.commission_amount, 0);
  const overdueCount = commissions.filter(isOverdue).length;
  const pendingReview = commissions.filter(c =>
    c.payment_status === "paid_unverified" || c.payment_status === "paid_proof_uploaded"
  ).length;

  const handleVerify = async (c: Commission) => {
    const { error } = await verifyCommission(c.id);
    if (!error) {
      toast.success("تم التحقق من العمولة");
      load();
    } else {
      toast.error("فشل التحقق");
    }
  };

  const handleSendReminder = async (c: Commission) => {
    await sendReminder(c);
    toast.success("تم إرسال التذكير");
    load();
  };

  if (loading) return <div className="text-center text-sm text-muted-foreground py-8">جاري التحميل...</div>;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Landmark} value={`${totalUnpaid.toLocaleString("en-US")} ر.س`} label="مستحقة" />
        <StatCard icon={CheckCircle2} value={`${totalVerified.toLocaleString("en-US")} ر.س`} label="تم التحقق" />
        <StatCard icon={AlertTriangle} value={String(overdueCount)} label="متأخرة" />
        <StatCard icon={Eye} value={String(pendingReview)} label="بانتظار المراجعة" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 w-fit flex-wrap">
        {([
          { id: "all" as const, label: "الكل" },
          { id: "unpaid" as const, label: "غير مدفوعة" },
          { id: "paid" as const, label: "بانتظار التحقق" },
          { id: "verified" as const, label: "تم التحقق" },
          { id: "overdue" as const, label: "متأخرة" },
        ]).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs transition-all",
              filter === f.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(c => {
          const s = c.payment_status as CommissionStatus;
          const expanded = selectedId === c.id;
          return (
            <div key={c.id} className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <button
                onClick={() => setSelectedId(expanded ? null : c.id)}
                className="w-full flex items-center justify-between p-3 text-right hover:bg-muted/20 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{c.commission_amount.toLocaleString("en-US")} ر.س</div>
                  <div className="text-[10px] text-muted-foreground">
                    صفقة: {c.deal_amount.toLocaleString("en-US")} ر.س • {new Date(c.created_at).toLocaleDateString("ar-SA")}
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${COMMISSION_STATUS_COLORS[s]}`}>
                  {COMMISSION_STATUS_LABELS[s]}
                </Badge>
              </button>

              {expanded && (
                <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-muted-foreground">التذكيرات: </span>{c.reminder_count}</div>
                    <div><span className="text-muted-foreground">آخر تذكير: </span>{c.last_reminder_at ? new Date(c.last_reminder_at).toLocaleDateString("ar-SA") : "—"}</div>
                    <div><span className="text-muted-foreground">إيصال: </span>{c.receipt_path ? "✓ مرفق" : "لا يوجد"}</div>
                    <div><span className="text-muted-foreground">تأكيد الدفع: </span>{c.marked_paid_at ? new Date(c.marked_paid_at).toLocaleDateString("ar-SA") : "—"}</div>
                  </div>
                  <div className="flex gap-2">
                    {s !== "verified" && (s === "paid_unverified" || s === "paid_proof_uploaded") && (
                      <Button size="sm" onClick={() => handleVerify(c)} className="gap-1.5 rounded-lg text-xs flex-1">
                        <ShieldCheck size={13} /> تحقق
                      </Button>
                    )}
                    {s !== "verified" && (
                      <Button size="sm" variant="outline" onClick={() => handleSendReminder(c)} className="gap-1.5 rounded-lg text-xs flex-1">
                        <Send size={13} /> إرسال تذكير
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">لا توجد عمولات</p>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, value, label }: { icon: any; value: string; label: string }) => (
  <div className="bg-card rounded-xl p-4 shadow-soft text-center">
    <Icon size={18} className="mx-auto mb-2 text-primary" />
    <div className="text-lg font-medium">{value}</div>
    <div className="text-[10px] text-muted-foreground">{label}</div>
  </div>
);

export default CommissionAdminPanel;
