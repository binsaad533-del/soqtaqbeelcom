import { useState, useEffect, useCallback } from "react";
import { type CrmLead, type CrmLeadActivity, CRM_STATUSES, FOLLOW_UP_ACTIONS } from "@/hooks/useCrmLeads";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, User, Phone, Mail, Calendar, MessageSquare, ClipboardList, Sparkles, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  lead: CrmLead;
  onBack: () => void;
  getProfileName: (id: string | null) => string;
  profiles: any[];
  updateLead: (id: string, updates: Partial<CrmLead>) => Promise<{ error: any }>;
  getLeadActivities: (leadId: string) => Promise<CrmLeadActivity[]>;
  addActivity: (leadId: string, actionType: string, details?: string) => Promise<{ error: any } | undefined>;
}

const CrmLeadDetails = ({ lead, onBack, getProfileName, profiles, updateLead, getLeadActivities, addActivity }: Props) => {
  const { user, role } = useAuthContext();
  const [currentLead, setCurrentLead] = useState(lead);
  const [activities, setActivities] = useState<CrmLeadActivity[]>([]);
  const [note, setNote] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadActivities = useCallback(async () => {
    const acts = await getLeadActivities(lead.id);
    setActivities(acts);
  }, [lead.id, getLeadActivities]);

  useEffect(() => {
    loadActivities();
    fetchAiSuggestion();

    // Real-time activity updates
    const channel = supabase
      .channel(`lead-activities-${lead.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "crm_lead_activities", filter: `lead_id=eq.${lead.id}` }, () => {
        loadActivities();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_leads", filter: `id=eq.${lead.id}` }, (payload) => {
        if (payload.new) setCurrentLead(payload.new as unknown as CrmLead);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lead.id, loadActivities]);

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    const { error } = await updateLead(lead.id, { status: newStatus });
    if (!error) {
      setCurrentLead(prev => ({ ...prev, status: newStatus }));
      await addActivity(lead.id, "status_change", `تغيير الحالة إلى: ${CRM_STATUSES.find(s => s.value === newStatus)?.label || newStatus}`);
      loadActivities();
      toast.success("تم تحديث الحالة");
    }
    setSaving(false);
  };

  const handleAssign = async (userId: string) => {
    const { error } = await updateLead(lead.id, { assigned_to: userId });
    if (!error) {
      setCurrentLead(prev => ({ ...prev, assigned_to: userId }));
      await addActivity(lead.id, "assignment", `تم التعيين إلى: ${getProfileName(userId)}`);
      loadActivities();
      toast.success("تم التعيين");
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    await addActivity(lead.id, "note", note);
    setNote("");
    loadActivities();
    toast.success("تمت إضافة الملاحظة");
    setSaving(false);
  };

  const handleFollowUpAction = async (action: string) => {
    setSaving(true);
    await addActivity(lead.id, "follow_up", action);
    loadActivities();
    toast.success("تم تسجيل الإجراء");
    setSaving(false);
  };

  const fetchAiSuggestion = async () => {
    setAiLoading(true);
    try {
      const { invokeWithRetry } = await import("@/lib/invokeWithRetry");
      const { data } = await invokeWithRetry("ai-chat", {
        messages: [{
          role: "user",
          content: `أنت مساعد CRM ذكي. حلل هذا العميل المحتمل واقترح الخطوة التالية بإيجاز (جملة أو اثنتين فقط):

الاسم: ${currentLead.full_name}
الموضوع: ${currentLead.subject}
الرسالة: ${currentLead.message || "لا توجد رسالة"}
الحالة الحالية: ${CRM_STATUSES.find(s => s.value === currentLead.status)?.label}
المصدر: ${currentLead.source}

اقترح خطوة عملية واحدة واضحة.`
        }],
      });

      if (data) {
        // Parse SSE response
        const text = typeof data === "string" ? data : "";
        const lines = text.split("\n").filter((l: string) => l.startsWith("data: "));
        let result = "";
        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6));
            result += json.choices?.[0]?.delta?.content || "";
          } catch {}
        }
        setAiSuggestion(result || "لا يوجد اقتراح حالياً");
      }
    } catch {
      setAiSuggestion("تعذر تحليل العميل المحتمل");
    }
    setAiLoading(false);
  };

  const supervisors = profiles.filter((p: any) => {
    // Show all profiles as potential assignees (owner will know who is supervisor)
    return p.full_name;
  });

  const statusObj = CRM_STATUSES.find(s => s.value === currentLead.status);

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight size={14} /> عودة للقائمة
      </button>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Lead Info */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-card rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{currentLead.full_name}</h2>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-md", statusObj?.color)}>
                {statusObj?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-muted-foreground" />
                <span dir="ltr">{currentLead.phone}</span>
              </div>
              {currentLead.email && (
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-muted-foreground" />
                  <span dir="ltr">{currentLead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-muted-foreground" />
                <span>{new Date(currentLead.created_at).toLocaleString("en-US")}</span>
              </div>
              <div className="flex items-center gap-2">
                <User size={13} className="text-muted-foreground" />
                <span>المسؤول: {getProfileName(currentLead.assigned_to)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/30">
              <div className="text-xs font-medium mb-1">الموضوع</div>
              <div className="text-sm">{currentLead.subject}</div>
            </div>

            {currentLead.message && (
              <div className="pt-2 border-t border-border/30">
                <div className="text-xs font-medium mb-1">الرسالة</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{currentLead.message}</div>
              </div>
            )}
          </div>

          {/* Status change */}
          <div className="bg-card rounded-xl p-4 shadow-soft">
            <div className="text-xs font-medium mb-2">تغيير الحالة</div>
            <div className="flex flex-wrap gap-1.5">
              {CRM_STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => handleStatusChange(s.value)}
                  disabled={saving || currentLead.status === s.value}
                  className={cn(
                    "text-[10px] px-3 py-1.5 rounded-lg transition-all",
                    currentLead.status === s.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignment */}
          <div className="bg-card rounded-xl p-4 shadow-soft">
            <div className="text-xs font-medium mb-2">تعيين المسؤول</div>
            <div className="flex flex-wrap gap-1.5">
              {supervisors.slice(0, 10).map((p: any) => (
                <button
                  key={p.user_id}
                  onClick={() => handleAssign(p.user_id)}
                  className={cn(
                    "text-[10px] px-3 py-1.5 rounded-lg transition-all",
                    currentLead.assigned_to === p.user_id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.full_name}
                </button>
              ))}
            </div>
          </div>

          {/* Follow-up Actions */}
          <div className="bg-card rounded-xl p-4 shadow-soft">
            <div className="text-xs font-medium mb-2 flex items-center gap-1.5">
              <ClipboardList size={13} />
              إجراءات المتابعة
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FOLLOW_UP_ACTIONS.map(action => (
                <button
                  key={action}
                  onClick={() => handleFollowUpAction(action)}
                  disabled={saving}
                  className="text-[10px] px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-card rounded-xl p-4 shadow-soft">
            <div className="text-xs font-medium mb-2 flex items-center gap-1.5">
              <MessageSquare size={13} />
              ملاحظة داخلية
            </div>
            <div className="flex gap-2">
              <Textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="أضف ملاحظة..."
                className="text-sm min-h-[60px] rounded-xl"
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={saving || !note.trim()}
                className="h-auto px-3"
              >
                <Send size={13} />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: AI + Timeline */}
        <div className="space-y-4">
          {/* AI Suggestion */}
          <div className="bg-card rounded-xl p-4 shadow-soft border border-primary/10">
            <div className="text-xs font-medium mb-2 flex items-center gap-1.5">
              <Sparkles size={13} className="text-primary" />
              اقتراح الذكاء الاصطناعي
            </div>
            {aiLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                <Loader2 size={13} className="animate-spin" /> جاري التحليل...
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">{aiSuggestion}</p>
            )}
            <button
              onClick={fetchAiSuggestion}
              className="text-[10px] text-primary hover:underline mt-2 block"
            >
              تحليل جديد
            </button>
          </div>

          {/* Activity Timeline */}
          <div className="bg-card rounded-xl p-4 shadow-soft">
            <div className="text-xs font-medium mb-3">سجل النشاط</div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {activities.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-4">لا توجد أنشطة بعد</p>
              )}
              {activities.map(act => (
                <div key={act.id} className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <div className="text-[11px]">
                      <span className="font-medium">{getProfileName(act.actor_id)}</span>
                      {" — "}
                      <span className="text-muted-foreground">
                        {act.action_type === "status_change" && "غيّر الحالة"}
                        {act.action_type === "note" && "أضاف ملاحظة"}
                        {act.action_type === "assignment" && "عيّن المسؤول"}
                        {act.action_type === "follow_up" && "إجراء متابعة"}
                        {act.action_type === "created" && "تم الإنشاء"}
                      </span>
                    </div>
                    {act.details && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">{act.details}</div>
                    )}
                    <div className="text-[9px] text-muted-foreground/60 mt-0.5">
                      {new Date(act.created_at).toLocaleString("en-US")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrmLeadDetails;
