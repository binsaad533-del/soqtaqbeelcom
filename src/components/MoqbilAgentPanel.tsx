import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Settings, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AgentSettings {
  is_active: boolean;
  auto_reply_inquiries: boolean;
  auto_evaluate_offers: boolean;
  min_acceptable_price: number | null;
  auto_reject_below_min: boolean;
  daily_summary: boolean;
  preferred_response_tone: string;
}

interface AgentAction {
  id: string;
  action_type: string;
  action_details: any;
  result: string;
  created_at: string;
}

const defaultSettings: AgentSettings = {
  is_active: false,
  auto_reply_inquiries: false,
  auto_evaluate_offers: false,
  min_acceptable_price: null,
  auto_reject_below_min: false,
  daily_summary: true,
  preferred_response_tone: "professional",
};

interface Props {
  listingId: string;
  className?: string;
}

const MoqbilAgentPanel = ({ listingId, className }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const [settings, setSettings] = useState<AgentSettings>(defaultSettings);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [view, setView] = useState<"settings" | "history">("settings");
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!user || !listingId) return;
    const { data } = await supabase
      .from("listing_agent_settings" as any)
      .select("*")
      .eq("listing_id", listingId)
      .maybeSingle();

    if (data) setSettings(data as any);
  }, [user, listingId]);

  const loadActions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("agent_actions_log" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("reference_id", listingId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setActions(data as any);
  }, [user, listingId]);

  useEffect(() => { loadSettings(); loadActions(); }, [loadSettings, loadActions]);

  const saveSettings = async (updates: Partial<AgentSettings>) => {
    if (!user || !listingId) return;
    setSaving(true);
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    const { error } = await supabase
      .from("listing_agent_settings" as any)
      .upsert({
        listing_id: listingId,
        owner_id: user.id,
        ...newSettings,
      } as any, { onConflict: "listing_id" });

    if (error) {
      toast.error(t("moqbilAgent.toasts.saveFailed"));
    } else {
      toast.success(t("moqbilAgent.toasts.saveSuccess"));
    }
    setSaving(false);
  };

  const actionLabels: Record<string, string> = {
    auto_reply: t("moqbilAgent.settings.actionLabels.auto_reply"),
    evaluate_offer: t("moqbilAgent.settings.actionLabels.evaluate_offer"),
    daily_summary: t("moqbilAgent.settings.actionLabels.daily_summary"),
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            settings.is_active ? "bg-success/10" : "bg-muted"
          )}>
            <Bot size={16} className={settings.is_active ? "text-success" : "text-muted-foreground"} />
          </div>
          <div>
            <h3 className="text-sm font-medium">{t("moqbilAgent.title")}</h3>
            <p className="text-[10px] text-muted-foreground">
              {settings.is_active ? t("moqbilAgent.statusActive") : t("moqbilAgent.statusInactive")}
            </p>
          </div>
        </div>
        <Switch
          checked={settings.is_active}
          onCheckedChange={(checked) => saveSettings({ is_active: checked })}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/30 pb-1">
        <button
          onClick={() => setView("settings")}
          className={cn("px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
            view === "settings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings size={11} className="inline mr-1" /> {t("moqbilAgent.settings.label")}
        </button>
        <button
          onClick={() => { setView("history"); loadActions(); }}
          className={cn("px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
            view === "history" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <History size={11} className="inline mr-1" /> {t("moqbilAgent.decisionLog")}
        </button>
      </div>

      {view === "settings" && settings.is_active && (
        <div className="space-y-3">
          {/* Auto reply */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/30">
            <div>
              <span className="text-xs font-medium">{t("moqbilAgent.settings.autoReplyTitle")}</span>
              <p className="text-[10px] text-muted-foreground">{t("moqbilAgent.settings.autoReplyDesc")}</p>
            </div>
            <Switch
              checked={settings.auto_reply_inquiries}
              onCheckedChange={(checked) => saveSettings({ auto_reply_inquiries: checked })}
            />
          </div>

          {/* Auto evaluate offers */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/30">
            <div>
              <span className="text-xs font-medium">{t("moqbilAgent.settings.autoEvaluateTitle")}</span>
              <p className="text-[10px] text-muted-foreground">{t("moqbilAgent.settings.autoEvaluateDesc")}</p>
            </div>
            <Switch
              checked={settings.auto_evaluate_offers}
              onCheckedChange={(checked) => saveSettings({ auto_evaluate_offers: checked })}
            />
          </div>

          {/* Min price */}
          <div className="p-2.5 rounded-xl border border-border/30 space-y-1.5">
            <span className="text-xs font-medium">{t("moqbilAgent.settings.minPriceLabel")}</span>
            <input
              type="number"
              value={settings.min_acceptable_price || ""}
              onChange={(e) => setSettings({ ...settings, min_acceptable_price: e.target.value ? Number(e.target.value) : null })}
              onBlur={() => saveSettings({ min_acceptable_price: settings.min_acceptable_price })}
              placeholder={t("moqbilAgent.settings.minPricePlaceholder")}
              className="w-full px-2.5 py-1.5 rounded-lg border border-border/50 bg-background text-xs"
            />
          </div>

          {/* Auto reject */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/30">
            <div>
              <span className="text-xs font-medium">{t("moqbilAgent.settings.autoRejectTitle")}</span>
              <p className="text-[10px] text-muted-foreground">{t("moqbilAgent.settings.autoRejectDesc")}</p>
            </div>
            <Switch
              checked={settings.auto_reject_below_min}
              onCheckedChange={(checked) => saveSettings({ auto_reject_below_min: checked })}
            />
          </div>

          {/* Daily summary */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/30">
            <div>
              <span className="text-xs font-medium">{t("moqbilAgent.settings.dailySummaryTitle")}</span>
              <p className="text-[10px] text-muted-foreground">{t("moqbilAgent.settings.dailySummaryDesc")}</p>
            </div>
            <Switch
              checked={settings.daily_summary}
              onCheckedChange={(checked) => saveSettings({ daily_summary: checked })}
            />
          </div>

          {/* Response tone */}
          <div className="p-2.5 rounded-xl border border-border/30 space-y-1.5">
            <span className="text-xs font-medium">{t("moqbilAgent.settings.replyToneLabel")}</span>
            <Select
              dir="rtl"
              value={settings.preferred_response_tone}
              onValueChange={(value) => saveSettings({ preferred_response_tone: value })}
            >
              <SelectTrigger className="w-full text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">{t("moqbilAgent.settings.tone.professional")}</SelectItem>
                <SelectItem value="friendly">{t("moqbilAgent.settings.tone.friendly")}</SelectItem>
                <SelectItem value="formal">{t("moqbilAgent.settings.tone.formal")}</SelectItem>
                <SelectItem value="brief">{t("moqbilAgent.settings.tone.brief")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {view === "history" && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {actions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t("moqbilAgent.settings.noActions")}</p>
          ) : (
            actions.map((action) => (
              <div key={action.id} className="p-2.5 rounded-xl border border-border/30 text-[11px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground">
                    {actionLabels[action.action_type] || action.action_type}
                  </span>
                  <span className="text-muted-foreground/60">
                    {new Date(action.created_at).toLocaleDateString("ar-SA")}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  {action.action_type === "auto_reply" && action.action_details?.reply?.slice(0, 80)}
                  {action.action_type === "evaluate_offer" && action.action_details?.recommendation}
                  {action.action_type === "daily_summary" && `${action.action_details?.new_offers || 0} / ${action.action_details?.new_messages || 0}`}
                </p>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full mt-1 inline-block",
                  action.result === "success" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                )}>
                  {action.result === "success" ? t("moqbilAgent.settings.successResult") : action.result}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MoqbilAgentPanel;
