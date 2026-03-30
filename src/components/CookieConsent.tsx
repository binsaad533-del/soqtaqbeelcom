import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "soq_cookie_consent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem(CONSENT_KEY, "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-4 animate-in slide-in-from-bottom-4 duration-300" dir="rtl">
      <div className="max-w-2xl mx-auto bg-card rounded-2xl shadow-xl border border-border/30 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">🍪 ملفات الارتباط (Cookies)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              نستخدم ملفات الارتباط لتحسين تجربتك وتحليل أداء المنصة وفقاً لـ
              <Link to="/privacy#cookies" className="text-primary hover:underline mx-1">سياسة الخصوصية</Link>
              ونظام حماية البيانات الشخصية (PDPL).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={reject}
              className="text-xs px-4 py-2 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              رفض
            </button>
            <button
              onClick={accept}
              className="text-xs px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              قبول
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
