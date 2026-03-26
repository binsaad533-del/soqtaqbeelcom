import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, Search, ShoppingBag, ArrowRight } from "lucide-react";
import logoIcon from "@/assets/logo-icon-gold.png";
import AiStar from "@/components/AiStar";
import { logAudit } from "@/lib/security";
import { useAuthContext } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuthContext();

  useEffect(() => {
    logAudit("error_404", "navigation", undefined, {
      attempted_path: location.pathname,
      user_id: user?.id,
    });
  }, [location.pathname, user]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4" dir="rtl">
      <div className="max-w-md w-full text-center">
        {/* Animated Star */}
        <div className="relative mb-6">
          <div className="w-20 h-20 mx-auto rounded-2xl gradient-primary shadow-lg flex items-center justify-center">
            <img src={logoIcon} alt="سوق تقبيل" className="w-[3.5rem] h-[3.5rem] object-contain" />
          </div>
        </div>

        {/* Error Code */}
        <div className="text-6xl font-bold gradient-text mb-3">404</div>

        {/* Message */}
        <h1 className="text-xl font-semibold text-foreground mb-2">
          الصفحة غير موجودة
        </h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          يبدو أن الصفحة التي تبحث عنها قد تم نقلها أو حذفها.
          <br />
          لا تقلق، يمكننا مساعدتك في الوصول لما تحتاجه.
        </p>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <Link
            to="/"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-soft transition-all group"
          >
            <Home size={20} className="text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            <span className="text-xs font-medium text-foreground">الرئيسية</span>
          </Link>
          <Link
            to="/marketplace"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-soft transition-all group"
          >
            <ShoppingBag size={20} className="text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            <span className="text-xs font-medium text-foreground">السوق</span>
          </Link>
          <Link
            to="/contact"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-soft transition-all group"
          >
            <Search size={20} className="text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            <span className="text-xs font-medium text-foreground">تواصل معنا</span>
          </Link>
        </div>

        {/* AI Help Hint */}
        <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <AiStar size={16} />
          <p className="text-xs text-muted-foreground">
            يمكنك سؤال المساعد الذكي في الزاوية اليسرى للمساعدة
          </p>
        </div>

        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight size={14} />
          العودة للصفحة السابقة
        </button>
      </div>
    </div>
  );
};

export default NotFound;
