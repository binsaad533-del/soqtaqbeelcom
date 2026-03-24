import { useState } from "react";
import { useBackups, type BackupLog } from "@/hooks/useBackups";
import { cn } from "@/lib/utils";
import {
  Shield, Download, HardDrive, Clock, CheckCircle2, AlertTriangle,
  Loader2, RefreshCw, Database, FileText, Users, Handshake, MessageCircle, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TABLE_LABELS: Record<string, { label: string; icon: any }> = {
  profiles: { label: "المستخدمون", icon: Users },
  listings: { label: "الإعلانات", icon: FileText },
  deals: { label: "الصفقات", icon: Handshake },
  deal_agreements: { label: "العقود", icon: Shield },
  deal_history: { label: "سجل الصفقات", icon: Clock },
  negotiation_messages: { label: "المحادثات", icon: MessageCircle },
  notifications: { label: "الإشعارات", icon: Bell },
  deal_checks: { label: "تحليلات الذكاء", icon: Database },
  backup_logs: { label: "سجل النسخ", icon: HardDrive },
};

const ALL_TABLES = Object.keys(TABLE_LABELS);

const BackupPanel = () => {
  const { logs, loading, exporting, exportData, fetchLogs } = useBackups();
  const [selectedTables, setSelectedTables] = useState<string[]>(ALL_TABLES);

  const toggleTable = (table: string) => {
    setSelectedTables(prev =>
      prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
    );
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      toast.error("اختر جدولاً واحداً على الأقل");
      return;
    }
    const result = await exportData(selectedTables);
    if (result.success) {
      toast.success("تم تصدير البيانات بنجاح");
    } else {
      toast.error(result.error || "فشل التصدير");
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const lastSuccess = logs.find(l => l.status === "completed");
  const lastFailed = logs.find(l => l.status === "failed");
  const completedCount = logs.filter(l => l.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Status overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusCard
          icon={Shield}
          label="حالة النسخ"
          value={lastFailed && (!lastSuccess || new Date(lastFailed.started_at) > new Date(lastSuccess.started_at)) ? "تحذير" : "نشط"}
          color={lastFailed && (!lastSuccess || new Date(lastFailed.started_at) > new Date(lastSuccess.started_at)) ? "warning" : "success"}
        />
        <StatusCard
          icon={Clock}
          label="آخر نسخة ناجحة"
          value={lastSuccess ? new Date(lastSuccess.started_at).toLocaleDateString("en-GB") : "لا يوجد"}
          color="primary"
        />
        <StatusCard
          icon={HardDrive}
          label="حجم آخر نسخة"
          value={formatSize(lastSuccess?.size_bytes || null)}
          color="primary"
        />
        <StatusCard
          icon={CheckCircle2}
          label="نسخ مكتملة"
          value={String(completedCount)}
          color="success"
        />
      </div>

      {/* Backup info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium mb-1">حماية البيانات التلقائية</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              يتم نسخ قاعدة البيانات احتياطياً تلقائياً بشكل يومي عبر Lovable Cloud مع تشفير AES-256.
              النسخ الاحتياطية محفوظة في مواقع جغرافية منفصلة ومحمية من الحذف.
              يمكنك أيضاً تصدير نسخة يدوية في أي وقت.
            </p>
          </div>
        </div>
      </div>

      {/* Manual export section */}
      <div className="bg-card rounded-2xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <Download size={18} strokeWidth={1.3} />
            تصدير البيانات يدوياً
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedTables(selectedTables.length === ALL_TABLES.length ? [] : ALL_TABLES)}
            className="text-xs rounded-lg"
          >
            {selectedTables.length === ALL_TABLES.length ? "إلغاء الكل" : "تحديد الكل"}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {ALL_TABLES.map(table => {
            const config = TABLE_LABELS[table];
            const isSelected = selectedTables.includes(table);
            return (
              <button
                key={table}
                onClick={() => toggleTable(table)}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-all active:scale-[0.98]",
                  isSelected
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                <config.icon size={14} strokeWidth={1.3} />
                {config.label}
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleExport}
          disabled={exporting || selectedTables.length === 0}
          className="w-full gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]"
        >
          {exporting ? (
            <><Loader2 size={16} className="animate-spin" /> جاري التصدير...</>
          ) : (
            <><Download size={16} strokeWidth={1.5} /> تصدير {selectedTables.length} جدول</>
          )}
        </Button>
      </div>

      {/* Backup history */}
      <div className="bg-card rounded-2xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <Clock size={18} strokeWidth={1.3} />
            سجل النسخ الاحتياطي
          </h3>
          <button onClick={fetchLogs} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">لا يوجد سجل نسخ احتياطي بعد</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-xl border border-border/30">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    log.status === "completed" ? "bg-success/10" :
                    log.status === "failed" ? "bg-destructive/10" :
                    "bg-warning/10"
                  )}>
                    {log.status === "completed" ? <CheckCircle2 size={16} className="text-success" /> :
                     log.status === "failed" ? <AlertTriangle size={16} className="text-destructive" /> :
                     <Loader2 size={16} className="text-warning animate-spin" />}
                  </div>
                  <div>
                    <div className="text-sm">
                      {log.backup_type === "manual_export" ? "تصدير يدوي" :
                       log.backup_type === "automatic" ? "نسخ تلقائي" : log.backup_type}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(log.started_at).toLocaleString("en-GB")}
                      {log.size_bytes ? ` • ${formatSize(log.size_bytes)}` : ""}
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-md",
                  log.status === "completed" ? "bg-success/10 text-success" :
                  log.status === "failed" ? "bg-destructive/10 text-destructive" :
                  "bg-warning/10 text-warning"
                )}>
                  {log.status === "completed" ? "مكتمل" :
                   log.status === "failed" ? "فشل" :
                   log.status === "in_progress" ? "جاري" : log.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatusCard = ({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string; color: string;
}) => (
  <div className="bg-card rounded-xl p-4 shadow-soft text-center">
    <Icon size={18} className={cn("mx-auto mb-2", `text-${color}`)} strokeWidth={1.3} />
    <div className="text-lg font-medium">{value}</div>
    <div className="text-[10px] text-muted-foreground">{label}</div>
  </div>
);

export default BackupPanel;
