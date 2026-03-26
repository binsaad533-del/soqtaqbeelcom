import { useState, useEffect } from "react";
import logoIcon from "@/assets/logo-icon-gold.png";
import { Download, Smartphone, Share, MoreVertical, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/hooks/useSEO";


const InstallPage = () => {
  useSEO({
    title: "تثبيت التطبيق",
    description: "ثبّت تطبيق سوق تقبيل على جوالك للوصول السريع وتجربة أفضل",
    canonical: "/install",
  });

  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    (deferredPrompt as unknown as { prompt: () => void }).prompt();
    const result = await (deferredPrompt as unknown as { userChoice: Promise<{ outcome: string }> }).userChoice;
    if (result.outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const features = [
    "وصول سريع من الشاشة الرئيسية",
    "يعمل بدون إنترنت (بشكل جزئي)",
    "إشعارات فورية بالعروض الجديدة",
    "تجربة سلسة كتطبيق أصلي",
    "لا يحتاج تحميل من المتجر",
  ];

  return (
    <div className="py-12">
      <div className="container max-w-lg text-center">
        <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-6 shadow-lg gradient-primary flex items-center justify-center">
          <img src={logoIcon} alt="سوق تقبيل" className="w-16 h-16 object-contain" />
        </div>

        <h1 className="text-2xl font-bold mb-2">ثبّت سوق تقبيل</h1>
        <p className="text-sm text-muted-foreground mb-8">
          احصل على تجربة أفضل بتثبيت التطبيق مباشرة على جوالك
        </p>

        {isInstalled ? (
          <div className="bg-primary/10 rounded-2xl p-6 mb-8">
            <Check size={32} className="text-primary mx-auto mb-3" />
            <p className="text-sm font-medium text-primary">التطبيق مثبّت بالفعل! 🎉</p>
          </div>
        ) : deferredPrompt ? (
          <Button onClick={handleInstall} size="lg" className="w-full gap-2 gradient-primary text-primary-foreground mb-8">
            <Download size={18} />
            تثبيت التطبيق الآن
          </Button>
        ) : isIOS ? (
          <div className="bg-card rounded-2xl p-6 shadow-soft mb-8 text-right space-y-4">
            <p className="text-sm font-medium mb-4 text-center">كيفية التثبيت على iPhone:</p>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Share size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">1. اضغط على زر المشاركة</p>
                <p className="text-xs text-muted-foreground">في أسفل المتصفح (Safari)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Download size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">2. اختر "إضافة إلى الشاشة الرئيسية"</p>
                <p className="text-xs text-muted-foreground">Add to Home Screen</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Check size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">3. اضغط "إضافة"</p>
                <p className="text-xs text-muted-foreground">سيظهر التطبيق على شاشتك الرئيسية</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-6 shadow-soft mb-8 text-right space-y-4">
            <p className="text-sm font-medium mb-4 text-center">كيفية التثبيت على Android:</p>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MoreVertical size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">1. اضغط على قائمة المتصفح (⋮)</p>
                <p className="text-xs text-muted-foreground">النقاط الثلاث في أعلى المتصفح</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Smartphone size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">2. اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"</p>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="bg-card rounded-2xl p-6 shadow-soft text-right">
          <h2 className="text-sm font-semibold mb-4 text-center">مميزات التطبيق</h2>
          <ul className="space-y-3">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Check size={14} className="text-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InstallPage;
