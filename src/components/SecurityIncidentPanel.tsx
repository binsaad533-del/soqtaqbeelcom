import { useState } from "react";
import { useSecurityIncidents, type SecurityIncident } from "@/hooks/useSecurityIncidents";
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Lock, Snowflake, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: typeof ShieldAlert }> = {
  critical: { label: "حرج", color: "text-destructive bg-destructive/10 border-destructive/20", icon: ShieldAlert },
  high: { label: "عالي", color: "text-orange-600 bg-orange-50 border-orange-200", icon: AlertTriangle },
  medium: { label: "متوسط", color: "text-warning bg-warning/10 border-warning/20", icon: Shield },
  low: { label: "منخفض", color: "text-muted-foreground bg-muted/50 border-border", icon: Shield },
};

const TYPE_LABELS: Record<string, string> = {
  brute_force: "محاولات اختراق",
  abnormal_deal_activity: "نشاط صفقات مريب",
  suspicious_pricing: "تسعير مريب",
  duplicate_listing: "إعلان مكرر",
  data_access_spike: "ارتفاع غير طبيعي في الوصول",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوح", color: "bg-destructive/10 text-destructive" },
  investigating: { label: "قيد التحقيق", color: "bg-warning/10 text-warning" },
  action_taken: { label: "تم اتخاذ إجراء", color: "bg-blue-50 text-blue-600" },
  resolved: { label: "تم الحل", color: "bg-green-50 text-green-600" },
};

const SecurityIncidentPanel = () => {
  const { incidents, loading, resolveIncident, suspendUser, freezeDeal } = useSecurityIncidents();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const filtered = incidents.filter((i) => {
    if (filter === "open") return i.status === "open" || i.status === "investigating";
    if (filter === "resolved") return i.status === "resolved" || i.status === "action_taken";
    return true;
  });

  const openCount = incidents.filter((i) => i.status === "open").length;
  const criticalCount = incidents.filter((i) => i.severity === "critical" && i.status === "open").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <div className="text-2xl font-bold text-foreground">{incidents.length}</div>
          <div className="text-xs text-muted-foreground">إجمالي الحوادث</div>
        </div>
        <div className="bg-card rounded-xl border border-destructive/20 p-4">
          <div className="text-2xl font-bold text-destructive">{openCount}</div>
          <div className="text-xs text-muted-foreground">حوادث مفتوحة</div>
        </div>
        <div className="bg-card rounded-xl border border-destructive/30 p-4">
          <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
          <div className="text-xs text-muted-foreground">حرجة</div>
        </div>
        <div className="bg-card rounded-xl border border-green-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            {incidents.filter((i) => i.status === "resolved").length}
          </div>
          <div className="text-xs text-muted-foreground">تم حلها</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "open", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {f === "all" ? "الكل" : f === "open" ? "مفتوحة" : "محلولة"}
          </button>
        ))}
      </div>

      {/* Incident List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <ShieldCheck className="mx-auto mb-3 text-green-500" size={32} />
          <p className="text-sm text-muted-foreground">لا توجد حوادث أمنية {filter === "open" ? "مفتوحة" : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((incident) => {
            const severity = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.medium;
            const status = STATUS_LABELS[incident.status] || STATUS_LABELS.open;
            const SevIcon = severity.icon;
            const isExpanded = expandedId === incident.id;

            return (
              <div
                key={incident.id}
                className={cn("bg-card rounded-xl border overflow-hidden transition-all", severity.color.split(" ")[2])}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                  className="w-full flex items-center gap-3 p-4 text-right"
                >
                  <SevIcon size={18} className={severity.color.split(" ")[0]} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {TYPE_LABELS[incident.incident_type] || incident.incident_type}
                      </span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full", severity.color)}>
                        {severity.label}
                      </span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full", status.color)}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{incident.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(incident.created_at).toLocaleDateString("ar-SA")}
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/50 p-4 space-y-4">
                    {/* Details */}
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs font-medium text-foreground mb-2">تفاصيل الحادث</p>
                      <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(incident.details, null, 2)}
                      </pre>
                    </div>

                    {/* Recommended Actions */}
                    {incident.recommended_actions?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-2">الإجراءات الموصى بها</p>
                        <ul className="space-y-1">
                          {incident.recommended_actions.map((action, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    {incident.status === "open" && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {incident.affected_user_id && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => suspendUser(incident.affected_user_id!, incident.id)}
                              className="gap-1.5 text-xs"
                            >
                              <Lock size={12} />
                              تعليق الحساب
                            </Button>
                          )}
                          {incident.affected_resource_type === "deal" && incident.affected_resource_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => freezeDeal(incident.affected_resource_id!, incident.id)}
                              className="gap-1.5 text-xs border-blue-200 text-blue-600"
                            >
                              <Snowflake size={12} />
                              تجميد الصفقة
                            </Button>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="ملاحظات الحل..."
                            value={expandedId === incident.id ? resolutionNote : ""}
                            onChange={(e) => setResolutionNote(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-xs"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              resolveIncident(incident.id, resolutionNote);
                              setResolutionNote("");
                              setExpandedId(null);
                            }}
                            className="gap-1.5 text-xs"
                          >
                            <ShieldCheck size={12} />
                            حل
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Resolution info */}
                    {incident.status === "resolved" && incident.resolution_notes && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-green-700 mb-1">ملاحظات الحل</p>
                        <p className="text-xs text-green-600">{incident.resolution_notes}</p>
                        {incident.resolved_at && (
                          <p className="text-[10px] text-green-500 mt-1 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(incident.resolved_at).toLocaleString("ar-SA")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SecurityIncidentPanel;
