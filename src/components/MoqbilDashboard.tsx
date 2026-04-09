import { useState, useEffect } from "react";
import { Brain, TrendingUp, Shield, BarChart3, Target, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalInteractions: number;
  alertsGenerated: number;
  matchesFound: number;
  dealsAssisted: number;
  agentActive: boolean;
  agentActions: number;
}

const MoqbilDashboard = () => {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalInteractions: 0,
    alertsGenerated: 0,
    matchesFound: 0,
    dealsAssisted: 0,
    agentActive: false,
    agentActions: 0,
  });

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    const [memoryRes, alertsRes, agentRes, actionsRes] = await Promise.all([
      supabase.from("ai_user_memory").select("interaction_count").eq("user_id", user.id).single(),
      supabase.from("market_alerts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("agent_settings").select("is_active").eq("user_id", user.id).single(),
      supabase.from("agent_actions_log").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    setStats({
      totalInteractions: memoryRes.data?.interaction_count || 0,
      alertsGenerated: alertsRes.count || 0,
      matchesFound: 0,
      dealsAssisted: 0,
      agentActive: agentRes.data?.is_active || false,
      agentActions: actionsRes.count || 0,
    });
  };

  const cards = [
    { icon: <Brain size={16} />, label: "تفاعلات مقبل", value: stats.totalInteractions, color: "text-primary" },
    { icon: <TrendingUp size={16} />, label: "تنبيهات السوق", value: stats.alertsGenerated, color: "text-warning" },
    { icon: <Target size={16} />, label: "إجراءات الوكيل", value: stats.agentActions, color: "text-success" },
    { 
      icon: <Shield size={16} />, 
      label: "حالة الوكيل", 
      value: stats.agentActive ? "نشط" : "متوقف", 
      color: stats.agentActive ? "text-success" : "text-muted-foreground" 
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain size={18} className="text-primary" strokeWidth={1.5} />
        <h2 className="text-base font-semibold">لوحة ذكاء مقبل</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border/40 p-3 bg-card">
            <div className={cn("mb-2", card.color)}>{card.icon}</div>
            <p className="text-lg font-bold">{card.value}</p>
            <p className="text-[11px] text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/40 p-4 bg-card">
        <h3 className="text-sm font-medium mb-3">نشاط مقبل الأخير</h3>
        <div className="space-y-2">
          {[
            { icon: <CheckCircle size={12} className="text-success" />, text: "تحليل تنافسي لإعلاناتك", time: "تلقائي" },
            { icon: <TrendingUp size={12} className="text-warning" />, text: "رصد فرص سوقية جديدة", time: "كل 6 ساعات" },
            { icon: <Shield size={12} className="text-primary" />, text: "مراقبة أمنية مستمرة", time: "مستمر" },
            { icon: <Target size={12} className="text-success" />, text: "مطابقة ذكية للفرص", time: "عند التصفح" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {item.icon}
              <span className="flex-1 text-foreground/80">{item.text}</span>
              <span className="text-[10px] text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MoqbilDashboard;
