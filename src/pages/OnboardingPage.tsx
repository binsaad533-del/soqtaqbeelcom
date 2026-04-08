import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Store, Search } from "lucide-react";
import { useEffect } from "react";
import { useSEO } from "@/hooks/useSEO";

const OnboardingPage = () => {
  useSEO({ title: "البدء", description: "ابدأ رحلتك في سوق تقبيل — بيع أو شراء مشروع تجاري", canonical: "/onboarding" });
  const navigate = useNavigate();
  const { user, profile, loading } = useAuthContext();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  if (loading) return null;

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center space-y-8">
        {/* Welcome banner */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            مرحباً {displayName}! 👋
          </h1>
          <p className="text-muted-foreground text-sm">حسابك جاهز — ما الذي تبحث عنه؟</p>
        </div>

        {/* Two big choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/create-listing?new=1")}
            className="group flex flex-col items-center gap-4 p-8 rounded-2xl border border-border/40 bg-card shadow-soft hover:shadow-soft-hover hover:border-primary/30 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Store size={28} className="text-primary" />
            </div>
            <div className="space-y-1">
              <span className="text-base font-semibold block">أريد بيع مشروعي</span>
              <span className="text-xs text-muted-foreground">أنشئ إعلانك وابدأ بعرض فرصتك للمهتمين</span>
            </div>
          </button>

          <button
            onClick={() => navigate("/marketplace")}
            className="group flex flex-col items-center gap-4 p-8 rounded-2xl border border-border/40 bg-card shadow-soft hover:shadow-soft-hover hover:border-primary/30 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
              <Search size={28} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <span className="text-base font-semibold block">أريد شراء مشروع</span>
              <span className="text-xs text-muted-foreground">تصفّح الفرص المتاحة وابدأ التفاوض</span>
            </div>
          </button>
        </div>

        <button
          onClick={() => navigate("/")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          تخطي ←
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;
