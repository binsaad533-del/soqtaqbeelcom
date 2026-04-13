import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertTriangle, LifeBuoy, Handshake, UserCheck, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskItem {
  label: string;
  count: number;
  icon: any;
  tab: string;
  color: string;
}

interface Props {
  onNavigate: (tab: string) => void;
}

export default function SupervisorDailyTasks({ onNavigate }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();

      const [
        reportsRes,
        ticketsRes,
        stalledDealsRes,
        pendingVerRes,
        draftListingsRes,
      ] = await Promise.all([
        supabase.from("listing_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets" as any).select("id", { count: "exact", head: true }).in("status", ["open", "waiting_response"]),
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "negotiating").lt("updated_at", threeDaysAgo),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_level", "pending"),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "draft"),
      ]);

      const items: TaskItem[] = [
        { label: "بلاغات بدون رد", count: reportsRes.count || 0, icon: AlertTriangle, tab: "reports", color: "text-destructive" },
        { label: "تذاكر دعم مفتوحة", count: ticketsRes.count || 0, icon: LifeBuoy, tab: "support", color: "text-warning" },
        { label: "صفقات متوقفة > 3 أيام", count: stalledDealsRes.count || 0, icon: Handshake, tab: "deals", color: "text-primary" },
        { label: "توثيقات بانتظار المراجعة", count: pendingVerRes.count || 0, icon: UserCheck, tab: "users", color: "text-success" },
        { label: "إعلانات تحتاج مراجعة", count: draftListingsRes.count || 0, icon: FileText, tab: "listings", color: "text-primary" },
      ];

      setTasks(items);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;

  const activeTasks = tasks.filter(t => t.count > 0);

  if (activeTasks.length === 0) {
    return (
      <div className="bg-success/5 border border-success/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
        <CheckCircle size={18} className="text-success shrink-0" />
        <div>
          <p className="text-sm font-medium text-success">عمل ممتاز — لا توجد مهام معلقة</p>
          <p className="text-[10px] text-muted-foreground">كل شيء تحت السيطرة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 mb-6">
      <h3 className="text-xs font-semibold mb-3">مهامك اليوم</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {activeTasks.map((t, i) => (
          <button
            key={i}
            onClick={() => onNavigate(t.tab)}
            className={cn(
              "flex items-center gap-2.5 p-3 rounded-xl border border-border/30 hover:border-primary/20 transition-all text-right w-full",
              "bg-muted/20 hover:bg-muted/40"
            )}
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", `${t.color}/10`)}>
              <t.icon size={14} className={t.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">{t.label}</p>
              <p className={cn("text-sm font-bold", t.color)}>{t.count}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
