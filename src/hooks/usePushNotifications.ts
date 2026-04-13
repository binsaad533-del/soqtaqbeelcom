import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const PUSH_DISMISSED_KEY = "soq_push_dismissed";
const PUSH_SUBSCRIBED_KEY = "soq_push_subscribed";

// This key will be set via env - users need to add VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId?: string) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if already subscribed
  useEffect(() => {
    if (localStorage.getItem(PUSH_SUBSCRIBED_KEY) === "true") {
      setIsSubscribed(true);
    }
  }, []);

  // Determine if we should show prompt
  const shouldShowPrompt = useCallback(() => {
    if (!userId) return false;
    if (!VAPID_PUBLIC_KEY) return false;
    if (typeof Notification === "undefined") return false;
    if (Notification.permission !== "default") return false;
    if (isSubscribed) return false;

    // Check dismiss cooldown (7 days)
    const dismissed = localStorage.getItem(PUSH_DISMISSED_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return false;
    }

    // Check if in iframe/preview
    try {
      if (window.self !== window.top) return false;
    } catch {
      return false;
    }
    if (
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com")
    )
      return false;

    return true;
  }, [userId, isSubscribed]);

  // Trigger prompt after meaningful interaction
  const triggerPrompt = useCallback(() => {
    if (shouldShowPrompt()) {
      setShowPrompt(true);
    }
  }, [shouldShowPrompt]);

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY || !userId) return false;

    try {
      const permResult = await Notification.requestPermission();
      setPermission(permResult);

      if (permResult !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();

      const { error } = await supabase.functions.invoke("push-subscribe", {
        body: {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
      });

      if (error) {
        console.error("Push subscribe error:", error);
        return false;
      }

      setIsSubscribed(true);
      localStorage.setItem(PUSH_SUBSCRIBED_KEY, "true");
      setShowPrompt(false);
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      return false;
    }
  }, [userId]);

  const dismiss = useCallback(() => {
    localStorage.setItem(PUSH_DISMISSED_KEY, String(Date.now()));
    setShowPrompt(false);
  }, []);

  return {
    permission,
    isSubscribed,
    showPrompt,
    triggerPrompt,
    subscribe,
    dismiss,
  };
}
