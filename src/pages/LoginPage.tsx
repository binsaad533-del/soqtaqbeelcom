import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import AiStar from "@/components/AiStar";
import { Eye, EyeOff, Mail, Lock, User as UserIcon } from "lucide-react";

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const { signIn, signUp } = useAuthContext();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message === "Invalid login credentials"
          ? "بيانات الدخول غير صحيحة"
          : error.message);
      } else {
        navigate("/dashboard");
      }
    } else {
      if (!fullName.trim()) {
        setError("الرجاء إدخال الاسم الكامل");
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setError(error.message);
      } else {
        setSuccess("تم إنشاء الحساب بنجاح! تحقق من بريدك الإلكتروني للتفعيل.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <AiStar size={40} />
          </div>
          <h1 className="text-2xl font-medium gradient-text">سوق تقبيل</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isLogin ? "تسجيل الدخول إلى حسابك" : "إنشاء حساب جديد"}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-soft">
          {/* Toggle */}
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                isLogin ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                !isLogin ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              حساب جديد
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <UserIcon size={16} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="الاسم الكامل"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none transition-colors"
                  dir="rtl"
                />
              </div>
            )}

            <div className="relative">
              <Mail size={16} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none transition-colors"
                dir="ltr"
                required
              />
            </div>

            <div className="relative">
              <Lock size={16} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-10 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none transition-colors"
                dir="ltr"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} strokeWidth={1.3} /> : <Eye size={16} strokeWidth={1.3} />}
              </button>
            </div>

            {error && (
              <div className="bg-destructive/5 text-destructive text-xs p-3 rounded-xl">{error}</div>
            )}
            {success && (
              <div className="bg-success/5 text-success text-xs p-3 rounded-xl">{success}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-medium text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: "var(--gradient-primary)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري المعالجة...
                </span>
              ) : isLogin ? "تسجيل الدخول" : "إنشاء الحساب"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="hover:text-foreground transition-colors">← العودة للرئيسية</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
