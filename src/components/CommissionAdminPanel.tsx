import { useState, useEffect } from "react";
import { useCommissions, type Commission } from "@/hooks/useCommissions";
import { Landmark, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const CommissionAdminPanel = () => {
  const { getAllCommissions } = useCommissions();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid" | "overdue">("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getAllCommissions();
      setCommissions(data);
      setLoading(false);
    };
    load();
  }, [getAllCommissions]);

  const now = new Date();
  const getOverdue = (c: Commission) => {
    if (c.payment_status === "paid") return false;
    const created = new Date(c.created_at);
    return (now.getTime() - created.getTime()) > 7 * 24 * 60 * 60 * 1000;
  };

  const filtered = commissions.filter(c => {
    if (filter === "unpaid") return c.payment_status !== "paid";
    if (filter === "paid") return c.payment_status === "paid";
    if (filter === "overdue") return getOverdue(c);
    return true;
  });

  const totalUnpaid = commissions
    .filter(c => c.payment_status !== "paid")
    .reduce((sum, c) => sum + c.commission_amount, 0);
  const totalPaid = commissions
    .filter(c => c.payment_status === "paid")
    .reduce((sum, c) => sum + c.commission_amount, 0);
  const overdueCount = commissions.filter(getOverdue).length;

  if (loading) return <div className="text-center text-sm text-muted-foreground py-8">جاري التحميل...</div>;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 shadow-soft text-center">
          <Landmark size={18} className="mx-auto mb-2 text-primary" />
          <div className="text-lg font-medium">{totalUnpaid.toLocaleString("en-US")} ر.س</div>
          <div className="text-[10px] text-muted-foreground">غير مدفوعة</div>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-soft text-center">
          <CheckCircle2 size={18} className="mx-auto mb-2 text-primary" />
          <div className="text-lg font-medium">{totalPaid.toLocaleString("en-US")} ر.س</div>
          <div className="text-[10px] text-muted-foreground">مدفوعة</div>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-soft text-center">
          <AlertTriangle size={18} className="mx-auto mb-2 text-primary" />
          <div className="text-lg font-medium">{overdueCount}</div>
          <div className="text-[10px] text-muted-foreground">متأخرة</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 w-fit">
        {[
          { id: "all" as const, label: "الكل" },
          { id: "unpaid" as const, label: "غير مدفوعة" },
          { id: "paid" as const, label: "مدفوعة" },
          { id: "overdue" as const, label: "متأخرة" },
        ].map(f => (
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
        {filtered.map(c => (
          <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card">
            <div>
              <div className="text-sm font-medium">{c.commission_amount.toLocaleString("en-US")} ر.س</div>
              <div className="text-[10px] text-muted-foreground">
                صفقة: {c.deal_amount.toLocaleString("en-US")} ر.س • {new Date(c.created_at).toLocaleDateString("ar-SA")}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {c.payment_status === "paid" ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 size={12} /> مدفوعة
                </span>
              ) : getOverdue(c) ? (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle size={12} /> متأخرة
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={12} /> في الانتظار
                </span>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">لا توجد عمولات</p>
        )}
      </div>
    </div>
  );
};

export default CommissionAdminPanel;
