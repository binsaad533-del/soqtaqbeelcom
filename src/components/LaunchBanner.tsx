import { useState } from "react";
import { X, Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "launch_banner_dismissed";

const LaunchBanner = () => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };

  return (
    <div className="relative bg-gradient-to-l from-primary/90 to-primary text-primary-foreground text-center py-2 px-4 text-[12px] sm:text-[13px] font-medium">
      <div className="flex items-center justify-center gap-2">
        <Rocket size={14} className="shrink-0 animate-pulse" />
        <span>
          {t("common.welcomeBanner")}
        </span>
      </div>
      <button
        onClick={dismiss}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/20 transition-colors"
        aria-label="إغلاق"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default LaunchBanner;
