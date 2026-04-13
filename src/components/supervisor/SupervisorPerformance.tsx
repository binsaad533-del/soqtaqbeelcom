import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { BarChart3, Loader2 } from "lucide-react";

interface Stats {
  ticketsClosed: number;
  reportsResolved: number;
  messagesSent: number;
  avgResponseMinutes: number | null;
}

export default function SupervisorPerformance() {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<Stats>({ ticketsClosed: 0, reportsResolved: 0, messagesSent: 0, avgResponseMinutes: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      const [ticketsRes, reportsRes, messagesRes] = await Promise.all([
        // Tickets resolved today by this supervisor
        supabase.from("support_tickets" as any)
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", user.id)
          .in("status", ["resolved", "closed"])
          .gte("updated_at", todayISO),
        // Reports reviewed today
        supabase.from("listing_reports")
          .select("id", { count: "exact", head: true })
          .eq("reviewed_by", user.id)
          .gte("reviewed_at", todayISO),
        // Messages sent today
        supabase.from("ticket_messages" as any)
          .select("id", { count: "exact", head: true })
          .eq("sender_id", user.id)
          .eq("is_staff", true)
          .gte("created_at", todayISO),
      ]);

      // Calculate avg response time from ticket messages today
      const { data: staffMsgs } = await supabase
        .from("ticket_messages" as any)
        .select("ticket_id, created_at")
        .eq("sender_id", user.id)
        .eq("is_staff", true)
        .gte("created_at", todayISO)
        .order("created_at", { ascending: true });

      let avgMin: number | null = null;
      if (staffMsgs && staffMsgs.length > 0) {
        const ticketIds = [...new Set((staffMsgs as any[]).map(m => m.ticket_id))];
        const { data: tickets } = await supabase
          .from("support_tickets" as any)
          .select("id, created_at")
          .in("id", ticketIds);
        
        if (tickets) {
          const ticketMap = new Map((tickets as any[]).map(t => [t.id, new Date(t.created_at).getTime()]));
          const responseTimes: number[] = [];
          const firstResponses = new Map<string, number>();
          
          (staffMsgs as any[]).forEach(m => {
            if (!firstResponses.has(m.ticket_id)) {
              const ticketTime = ticketMap.get(m.ticket_id);
              if (ticketTime) {
                const responseTime = (new Date(m.created_at).getTime() - ticketTime) / 60000;
                if (responseTime > 0 && responseTime < 1440) {
                  responseTimes.push(responseTime);
                }
              }
              firstResponses.set(m.ticket_id, 1);
            }
          });

          if (responseTimes.length > 0) {
            avgMin = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
          }
        }
      }

      setStats({
        ticketsClosed: ticketsRes.count || 0,
        reportsResolved: reportsRes.count || 0,
        messagesSent: messagesRes.count || 0,
        avgResponseMinutes: avgMin,
      });
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
      <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
        <BarChart3 size={13} className="text-primary" /> أدائي اليوم
      </h3>
      <div className="space-y-3">
        {[
          { label: "تذاكر أُغلقت", value: stats.ticketsClosed },
          { label: "بلاغات حُلّت", value: stats.reportsResolved },
          { label: "رسائل أُرسلت", value: stats.messagesSent },
          { label: "متوسط وقت الرد", value: stats.avgResponseMinutes !== null ? `${stats.avgResponseMinutes} د` : "—" },
        ].map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
            <span className="text-sm font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
