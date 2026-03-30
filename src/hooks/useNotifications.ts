import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { playNotificationSound } from "@/lib/notificationSound";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

/** Request browser push permission and show native notification */
function showBrowserNotification(n: Notification) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notif = new window.Notification(n.title, {
      body: n.body || undefined,
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      tag: n.id,
      dir: "rtl",
      lang: "ar",
    });
    notif.onclick = () => {
      window.focus();
      if (n.reference_type === "deal" && n.reference_id) {
        window.location.href = `/negotiate/${n.reference_id}`;
      } else if (n.reference_type === "listing" && n.reference_id) {
        window.location.href = `/listing/${n.reference_id}`;
      }
      notif.close();
    };
  } catch {
    // Safari doesn't support Notification constructor in some contexts
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function useNotifications() {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const items = (data || []) as unknown as Notification[];
    setNotifications(items);
    setUnreadCount(items.filter(n => !n.is_read).length);
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    // Auto-request push permission after login
    requestPushPermission();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as unknown as Notification;
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Play notification sound
        playNotificationSound();

        // Show browser push notification
        showBrowserNotification(newNotif);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
