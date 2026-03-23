import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface SecurityIncident {
  id: string;
  incident_type: string;
  severity: string;
  status: string;
  affected_user_id: string | null;
  affected_resource_type: string | null;
  affected_resource_id: string | null;
  description: string;
  details: Record<string, any>;
  recommended_actions: string[];
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSecurityIncidents() {
  const { user } = useAuthContext();
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchIncidents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("security_incidents" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const items = (data || []) as unknown as SecurityIncident[];
    setIncidents(items);
    setUnreadCount(items.filter((i) => i.status === "open").length);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Real-time subscription for new incidents
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("security-incidents-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "security_incidents" },
        (payload) => {
          const newIncident = payload.new as unknown as SecurityIncident;
          setIncidents((prev) => [newIncident, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const resolveIncident = useCallback(
    async (incidentId: string, notes: string) => {
      if (!user) return;
      await supabase
        .from("security_incidents" as any)
        .update({
          status: "resolved",
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        } as any)
        .eq("id", incidentId);
      await fetchIncidents();
    },
    [user, fetchIncidents]
  );

  const suspendUser = useCallback(
    async (userId: string, incidentId: string) => {
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ is_suspended: true } as any)
        .eq("user_id", userId);

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "تم تعليق حسابك",
        body: "تم تعليق حسابك بسبب نشاط مريب. يرجى التواصل مع الدعم.",
        type: "security",
      });

      await supabase
        .from("security_incidents" as any)
        .update({ status: "action_taken", details: { action: "user_suspended" } } as any)
        .eq("id", incidentId);

      await fetchIncidents();
    },
    [user, fetchIncidents]
  );

  const freezeDeal = useCallback(
    async (dealId: string, incidentId: string) => {
      if (!user) return;
      await supabase
        .from("deals")
        .update({ locked: true, status: "frozen" } as any)
        .eq("id", dealId);

      await supabase
        .from("security_incidents" as any)
        .update({ status: "action_taken" } as any)
        .eq("id", incidentId);

      await fetchIncidents();
    },
    [user, fetchIncidents]
  );

  const reportFailedLogin = useCallback(async (email: string) => {
    try {
      await supabase.functions.invoke("detect-incidents", {
        body: { event_type: "failed_login", payload: { email } },
      });
    } catch {
      // Silent — detection should not block auth
    }
  }, []);

  return {
    incidents,
    loading,
    unreadCount,
    fetchIncidents,
    resolveIncident,
    suspendUser,
    freezeDeal,
    reportFailedLogin,
  };
}
