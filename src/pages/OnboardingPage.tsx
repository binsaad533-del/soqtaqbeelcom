import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Store, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useSEO } from "@/hooks/useSEO";

const OnboardingPage = () => {
  useSEO({ title: "البدء", description: "ابدأ رحلتك في سوق تقبيل — بيع أو شراء مشروع تجاري", canonical: "/onboarding" });
  const navigate = useNavigate();
  const { user, profile, loading } = useAuthContext();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  // Stagger animation
  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (loading) return null;

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "";
  const firstName = displayName.split(" ")[0] || "";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center space-y-6">
        {/* Moqbel AI welcome */}
        <div className={`space-y-3 transition-all duration-700 ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles size={24} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold">
            أهلاً {firstName ? firstName : "بك"}!
          </h1>
          <div className="bg-card rounded-2xl border border-border/30 p-4 shadow-soft max-w-sm mx-auto">
            <p className="text-sm text-muted-foreground leading-relaxed">
              أنا <span className="text-foreground font-semibold">مقبل</span>، مساعدك الذكي.
              {" "}سأرافقك في كل خطوة — من تحليل المشروع إلى إتمام الصفقة.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              خلّنا نبدأ… وش تبغى تسوي؟
            </p>
          </div>
        </div>

        {/* Two choices */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-700 delay-300 ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <button
            onClick={() => navigate("/create-listing?new=1")}
            className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-border/40 bg-card shadow-soft hover:shadow-soft-hover hover:border-primary/30 transition-all active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Store size={24} className="text-primary" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-semibold block">أريد بيع مشروعي</span>
              <span className="text-[11px] text-muted-foreground">أنشئ إعلانك ومقبل يكمل الباقي</span>
            </div>
          </button>

          <button
            onClick={() => navigate("/marketplace")}
            className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-border/40 bg-card shadow-soft hover:shadow-soft-hover hover:border-primary/30 transition-all active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
              <Search size={24} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-semibold block">أريد شراء مشروع</span>
              <span className="text-[11px] text-muted-foreground">تصفّح الفرص وابدأ التفاوض</span>
            </div>
          </button>
        </div>

        <button
          onClick={() => navigate("/")}
          className={`text-xs text-muted-foreground hover:text-foreground transition-all duration-700 delay-500 ${showContent ? "opacity-100" : "opacity-0"}`}
        >
          تخطي ←
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;
