import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import NotificationPreferencesPanel from "@/components/NotificationPreferencesPanel";
import { requestPushPermission } from "@/hooks/useNotifications";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NotificationSettingsPage = () => {
  useSEO({ title: "إعدادات الإشعارات", description: "تخصيص تفضيلات الإشعارات في سوق تقبيل", canonical: "/notification-settings" });

  const [pushStatus, setPushStatus] = useState<"granted" | "denied" | "default" | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushStatus("unsupported");
    } else {
      setPushStatus(Notification.permission as any);
    }
  }, []);

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setPushStatus(granted ? "granted" : "denied");
  };

  return (
    <div className="min-h-screen py-12 px-4" dir="rtl">
      <div className="max-w-xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowRight size={14} />
          العودة للوحة التحكم
        </Link>

        <h1 className="text-xl font-bold mb-6">إعدادات الإشعارات</h1>

        {/* Browser Push Section */}
        <div className="mb-6 p-4 rounded-xl bg-card border border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">إشعارات المتصفح (Push)</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pushStatus === "granted" && "مفعّلة — ستصلك إشعارات فورية"}
                {pushStatus === "denied" && "محظورة — فعّلها من إعدادات المتصفح"}
                {pushStatus === "default" && "غير مفعّلة — فعّلها لتصلك الإشعارات فوراً"}
                {pushStatus === "unsupported" && "غير مدعومة في هذا المتصفح"}
              </p>
            </div>
            {pushStatus === "default" && (
              <button
                onClick={handleEnablePush}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                تفعيل
              </button>
            )}
            {pushStatus === "granted" && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">مفعّل ✓</span>
            )}
            {pushStatus === "denied" && (
              <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">محظور</span>
            )}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-card rounded-xl border border-border/30 p-5">
          <NotificationPreferencesPanel />
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
