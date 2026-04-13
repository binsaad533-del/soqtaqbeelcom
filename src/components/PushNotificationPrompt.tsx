import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuthContext } from "@/contexts/AuthContext";
import { useEffect } from "react";

const PushNotificationPrompt = () => {
  const { user } = useAuthContext();
  const { showPrompt, subscribe, dismiss, triggerPrompt, isSubscribed } =
    usePushNotifications(user?.id);

  // Trigger prompt after login (meaningful interaction)
  useEffect(() => {
    if (user?.id) {
      // Delay to not overwhelm user right after login
      const timer = setTimeout(() => triggerPrompt(), 5000);
      return () => clearTimeout(timer);
    }
  }, [user?.id, triggerPrompt]);

  if (!showPrompt || isSubscribed) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[56] animate-in slide-in-from-bottom-4 duration-300"
      dir="rtl"
    >
      <div className="bg-card rounded-2xl shadow-xl border border-border/30 p-4">
        <button
          onClick={dismiss}
          className="absolute top-3 left-3 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">فعّل الإشعارات</p>
            <p className="text-[11px] text-muted-foreground">
              عشان ما يفوتك أي عرض أو تحديث على صفقاتك
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={subscribe}
            className="flex-1 text-xs py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            فعّل
          </button>
          <button
            onClick={dismiss}
            className="text-xs py-2.5 px-4 rounded-xl bg-muted text-muted-foreground font-medium hover:opacity-90 transition-opacity"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
