import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoIconGold from "@/assets/logo-icon-gold.png";
import { Lock, Eye, EyeOff, CheckCircle, Sparkles } from "lucide-react";
import { toEnglishNumerals } from "@/lib/arabicNumerals";
import { checkPasswordStrength } from "@/lib/security";
import PasswordStrengthBar from "@/components/PasswordStrengthBar";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check URL hash for recovery type
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(toEnglishNumerals(value));
  }, []);

  const handleConfirmChange = useCallback((value: string) => {
    setConfirmPassword(toEnglishNumerals(value));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!checkPasswordStrength(password).valid) {
      setError("كلمة المرور ضعيفة. يجب أن تحتوي على 8 أحرف على الأقل مع حرف كبير ورقم ورمز خاص");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("حدث خطأ أثناء تحديث كلمة المرور. حاول مرة أخرى.");
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/"), 3000);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="سوق تقبيل" className="h-14 md:h-16 w-auto" />
          </div>
          <div className="bg-card rounded-2xl p-8 shadow-soft">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle size={28} strokeWidth={1.3} className="text-green-600" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">تم تغيير كلمة المرور بنجاح</h2>
            <p className="text-sm text-muted-foreground">
              سيتم توجيهك للصفحة الرئيسية خلال لحظات...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="سوق تقبيل" className="h-14 md:h-16 w-auto" />
          </div>
          <div className="bg-card rounded-2xl p-8 shadow-soft">
            <h2 className="text-lg font-medium text-foreground mb-2">رابط غير صالح</h2>
            <p className="text-sm text-muted-foreground mb-6">
              هذا الرابط غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block py-2.5 px-6 rounded-xl text-sm font-medium text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              طلب رابط جديد
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="سوق تقبيل" className="h-14 md:h-16 w-auto mx-auto" />
          </div>
          <h1 className="text-2xl font-medium gradient-text">تعيين كلمة مرور جديدة</h1>
          <p className="text-sm text-muted-foreground mt-2">أدخل كلمة المرور الجديدة</p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New password */}
            <div className="relative">
              <Lock size={16} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                inputMode="text"
                placeholder="كلمة المرور الجديدة"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full pr-10 pl-10 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none transition-colors text-left"
                dir="ltr"
                lang="en"
                autoComplete="new-password"
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
            <PasswordStrengthBar password={password} />

            {/* Confirm password */}
            <div className="relative">
              <Lock size={16} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                inputMode="text"
                placeholder="تأكيد كلمة المرور"
                value={confirmPassword}
                onChange={(e) => handleConfirmChange(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none transition-colors text-left"
                dir="ltr"
                lang="en"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-destructive/5 text-destructive text-xs p-3 rounded-xl">{error}</div>
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
                  جاري التحديث...
                </span>
              ) : (
                "تعيين كلمة المرور"
              )}
            </button>
          </form>
        </div>

        <div className="flex flex-col items-center gap-3 mt-6">
          <p className="text-[11px] text-muted-foreground/70">
            <Sparkles size={11} strokeWidth={1.3} className="inline-block ml-1 text-primary/50 -mt-0.5" />
            حسابك محمي بأعلى معايير الأمان
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
