import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from "@/lib/notificationSound";

export function useSupervisorAlerts(enabled: boolean = true) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("supervisor_sound_alerts") !== "false";
  });

  const channelRef = useRef<any>(null);

  const toggleSound = (val: boolean) => {
    setSoundEnabled(val);
    localStorage.setItem("supervisor_sound_alerts", val ? "true" : "false");
  };

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("supervisor-alerts-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_tickets" }, () => {
        if (soundEnabled) playNotificationSound();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "listing_reports" }, () => {
        if (soundEnabled) playNotificationSound();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, soundEnabled]);

  return { soundEnabled, toggleSound };
}
