import { useState } from "react";
import { Link } from "react-router-dom";
import { useTickets } from "@/hooks/useTickets";
import { useTranslation } from "react-i18next";
import { useSEO } from "@/hooks/useSEO";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusLabels: Record<string, { ar: string; cls: string }> = {
  open: { ar: "مفتوحة", cls: "bg-primary/10 text-primary" },
  in_progress: { ar: "قيد المعالجة", cls: "bg-warning/10 text-warning" },
  waiting_response: { ar: "بانتظار الرد", cls: "bg-accent/10 text-accent-foreground" },
  resolved: { ar: "تم الحل", cls: "bg-success/10 text-success" },
  closed: { ar: "مغلقة", cls: "bg-muted text-muted-foreground" },
};

const priorityLabels: Record<string, { ar: string; cls: string }> = {
  low: { ar: "منخفضة", cls: "bg-muted text-muted-foreground" },
  medium: { ar: "متوسطة", cls: "bg-primary/10 text-primary" },
  high: { ar: "عالية", cls: "bg-warning/10 text-warning" },
  urgent: { ar: "عاجلة", cls: "bg-destructive/10 text-destructive" },
};

const categoryLabels: Record<string, string> = {
  general: "عام", technical: "تقني", billing: "فواتير",
  complaint: "شكوى", suggestion: "اقتراح", other: "أخرى",
};

const SupportPage = () => {
  const { t } = useTranslation();
  const { tickets, loading } = useTickets();
  const [filter, setFilter] = useState("all");
  useSEO({ title: t("support.metaTickets") });

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

  if (loading) return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="container py-8 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("support.title")}</h1>
        <Link to="/support/new">
          <Button size="sm" className="gap-1.5">
            <Plus size={14} />
            {t("support.newTicket")}
          </Button>
        </Link>
      </div>

      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder={t("support.filterByStatus")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("support.all")}</SelectItem>
          {Object.entries(statusLabels).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v.ar}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {t("support.noTickets")}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <Link key={t.id} to={`/support/ticket/${t.id}`}
              className="block p-4 rounded-xl border border-border/40 hover:border-primary/20 transition-colors bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{t.subject}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${statusLabels[t.status]?.cls || ""}`}>
                      {statusLabels[t.status]?.ar || t.status}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${priorityLabels[t.priority]?.cls || ""}`}>
                      {priorityLabels[t.priority]?.ar || t.priority}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{categoryLabels[t.category] || t.category}</span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(t.created_at).toLocaleDateString("en-SA")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupportPage;
