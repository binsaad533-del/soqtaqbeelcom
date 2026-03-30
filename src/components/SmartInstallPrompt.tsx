import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

const DISMISS_KEY = "soq_install_dismissed";
const MIN_VISITS = 3;
const VISIT_KEY = "soq_visit_count";

const SmartInstallPrompt = () => {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Don't show in iframe/preview
    try {
      if (window.self !== window.top) return;
    } catch { return; }
    if (window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com")) return;

    // Already installed?
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Already dismissed recently?
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return; // 7 days
    }

    // Track visits
    const visits = parseInt(localStorage.getItem(VISIT_KEY) || "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
    if (visits < MIN_VISITS) return;

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 3000); // Show after 3s
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[55] animate-in slide-in-from-bottom-4 duration-300" dir="rtl">
      <div className="bg-card rounded-2xl shadow-xl border border-border/30 p-4">
        <button onClick={dismiss} className="absolute top-3 left-3 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Download size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">ثبّت سوق تقبيل</p>
            <p className="text-[11px] text-muted-foreground">وصول أسرع وإشعارات فورية</p>
          </div>
        </div>
        <button
          onClick={handleInstall}
          className="w-full text-xs py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          تثبيت التطبيق
        </button>
      </div>
    </div>
  );
};

export default SmartInstallPrompt;
