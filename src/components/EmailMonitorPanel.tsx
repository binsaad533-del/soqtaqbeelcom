import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail, CheckCircle2, XCircle, Clock, AlertTriangle,
  RefreshCw, Loader2, Search, Ban, InboxIcon,
} from "lucide-react";

interface EmailLog {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  suppressed: number;
  pending: number;
}

const TIME_RANGES = [
  { label: "آخر 24 ساعة", value: "1d" },
  { label: "آخر 7 أيام", value: "7d" },
  { label: "آخر 30 يوم", value: "30d" },
];

const STATUS_OPTIONS = [
  { label: "الكل", value: "all" },
  { label: "تم الإرسال", value: "sent" },
  { label: "فشل", value: "dlq" },
  { label: "محظور", value: "suppressed" },
  { label: "معلّق", value: "pending" },
];

function getTimeRangeDate(range: string): string {
  const now = new Date();
  if (range === "1d") now.setDate(now.getDate() - 1);
  else if (range === "7d") now.setDate(now.getDate() - 7);
  else now.setDate(now.getDate() - 30);
  return now.toISOString();
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  sent: { label: "تم الإرسال", color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  pending: { label: "معلّق", color: "bg-amber-500/10 text-amber-600", icon: Clock },
  dlq: { label: "فشل", color: "bg-destructive/10 text-destructive", icon: XCircle },
  failed: { label: "فشل", color: "bg-destructive/10 text-destructive", icon: XCircle },
  suppressed: { label: "محظور", color: "bg-muted text-muted-foreground", icon: Ban },
  bounced: { label: "ارتداد", color: "bg-orange-500/10 text-orange-600", icon: AlertTriangle },
  complained: { label: "شكوى", color: "bg-red-500/10 text-red-600", icon: AlertTriangle },
};

const EmailMonitorPanel = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({ total: 0, sent: 0, failed: 0, suppressed: 0, pending: 0 });
  const [templates, setTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const since = getTimeRangeDate(timeRange);

    let query = supabase
      .from("email_send_log")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    const { data: rawLogs } = await query;
    const allLogs = (rawLogs || []) as EmailLog[];

    const deduped = new Map<string, EmailLog>();
    for (const log of allLogs) {
      const key = log.message_id || log.id;
      if (!deduped.has(key)) {
        deduped.set(key, log);
      }
    }
    const uniqueLogs = Array.from(deduped.values());

    const newStats: EmailStats = { total: uniqueLogs.length, sent: 0, failed: 0, suppressed: 0, pending: 0 };
    for (const log of uniqueLogs) {
      if (log.status === "sent") newStats.sent++;
      else if (log.status === "dlq" || log.status === "failed") newStats.failed++;
      else if (log.status === "suppressed") newStats.suppressed++;
      else if (log.status === "pending") newStats.pending++;
    }
    setStats(newStats);

    const tplSet = new Set(uniqueLogs.map(l => l.template_name));
    setTemplates(Array.from(tplSet).sort());

    let filtered = uniqueLogs;
    if (statusFilter !== "all") {
      filtered = filtered.filter(l =>
        statusFilter === "dlq" ? (l.status === "dlq" || l.status === "failed") : l.status === statusFilter
      );
    }
    if (templateFilter !== "all") {
      filtered = filtered.filter(l => l.template_name === templateFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.recipient_email.toLowerCase().includes(q) ||
        l.template_name.toLowerCase().includes(q) ||
        (l.error_message || "").toLowerCase().includes(q)
      );
    }

    setLogs(filtered);
    setPage(0);
    setLoading(false);
  }, [timeRange, statusFilter, templateFilter, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pagedLogs = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(logs.length / PAGE_SIZE);

  const statCards = [
    { label: "إجمالي", value: stats.total, icon: Mail, color: "text-primary" },
    { label: "مُرسل", value: stats.sent, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "فاشل", value: stats.failed, icon: XCircle, color: "text-destructive" },
    { label: "محظور", value: stats.suppressed, icon: Ban, color: "text-muted-foreground" },
    { label: "معلّق", value: stats.pending, icon: Clock, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-2">
        {statCards.map((s, i) => (
          <div key={i} className="bg-card rounded-xl p-3 shadow-soft text-center border border-border/30">
            <s.icon size={16} className={cn("mx-auto mb-1.5", s.color)} strokeWidth={1.4} />
            <div className="text-lg font-semibold">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {TIME_RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs transition-all",
                timeRange === r.value ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={templateFilter} onValueChange={setTemplateFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="نوع البريد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأنواع</SelectItem>
            {templates.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[140px]">
          <Search size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث بالإيميل..."
            className="h-8 text-xs pr-8"
          />
        </div>

        <Button variant="ghost" size="sm" onClick={fetchData} className="h-8 w-8 p-0">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <InboxIcon size={32} strokeWidth={1} className="mb-2" />
          <p className="text-sm">لا توجد رسائل بريد في هذه الفترة</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground">
                    <th className="text-right px-3 py-2.5 font-medium">النوع</th>
                    <th className="text-right px-3 py-2.5 font-medium">المستلم</th>
                    <th className="text-right px-3 py-2.5 font-medium">الحالة</th>
                    <th className="text-right px-3 py-2.5 font-medium">التاريخ</th>
                    <th className="text-right px-3 py-2.5 font-medium">الخطأ</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLogs.map(log => {
                    const sc = statusConfig[log.status] || statusConfig.pending;
                    return (
                      <tr key={log.id} className="border-t border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5">
                          <span className="bg-muted/50 px-2 py-0.5 rounded text-[10px]">{log.template_name}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground" dir="ltr">
                          {log.recipient_email}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>
                            <sc.icon size={10} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground text-[10px]" dir="ltr">
                          {new Date(log.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-3 py-2.5 text-destructive text-[10px] max-w-[200px] truncate">
                          {log.error_message || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost" size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="text-xs h-7"
              >
                السابق
              </Button>
              <span className="text-xs text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="ghost" size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="text-xs h-7"
              >
                التالي
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmailMonitorPanel;
