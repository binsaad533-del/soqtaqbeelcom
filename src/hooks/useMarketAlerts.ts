import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCallback } from "react";

export interface MarketAlert {
  id: string;
  alert_type: string;
  priority: string;
  title: string;
  message: string;
  reference_type?: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export function useMarketAlerts() {
  const { user } = useAuthContext();

  const query = useQuery<MarketAlert[]>({
    queryKey: ["market-alerts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("market_alerts" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as MarketAlert[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const markRead = useCallback(async (alertId: string) => {
    await supabase
      .from("market_alerts" as any)
      .update({ is_read: true } as any)
      .eq("id", alertId);
  }, []);

  const dismissAlert = useCallback(async (alertId: string) => {
    await supabase
      .from("market_alerts" as any)
      .update({ is_dismissed: true } as any)
      .eq("id", alertId);
  }, []);

  return {
    alerts: query.data || [],
    isLoading: query.isLoading,
    markRead,
    dismissAlert,
    refetch: query.refetch,
  };
}
