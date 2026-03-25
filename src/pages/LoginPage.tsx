import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";
import SocialIcons from "@/components/SocialIcons";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Phone, ChevronDown, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { toEnglishNumerals, toDigitsOnly } from "@/lib/arabicNumerals";
import { checkPasswordStrength } from "@/lib/security";
import PasswordStrengthBar from "@/components/PasswordStrengthBar";
import { useSecurityIncidents } from "@/hooks/useSecurityIncidents";

const COUNTRY_CODES = [
  { code: "+966", flag: "🇸🇦", name: "السعودية" },
  { code: "+971", flag: "🇦🇪", name: "الإمارات" },
  { code: "+973", flag: "🇧🇭", name: "البحرين" },
  { code: "+968", flag: "🇴🇲", name: "عُمان" },
  { code: "+965", flag: "🇰🇼", name: "الكويت" },
  { code: "+974", flag: "🇶🇦", name: "قطر" },
  { code: "+20", flag: "🇪🇬", name: "مصر" },
  { code: "+962", flag: "🇯🇴", name: "الأردن" },
];

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [showCountryCodes, setShowCountryCodes] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const { signIn, signUp, user } = useAuthContext();
  const navigate = useNavigate();

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !mfaRequired) {
      navigate("/", { replace: true });
    }
  }, [user, navigate, mfaRequired]);
  const { reportFailedLogin } = useSecurityIncidents();

  // Auto-convert Arabic numerals on phone input
  const handlePhoneChange = useCallback((value: string) => {
    const digits = toDigitsOnly(value);
    // Saudi mobile: starts with 5, max 9 digits
    if (digits.length <= 9) {
      setPhone(digits);
    }
  }, []);

  // Auto-convert Arabic numerals on password input
  const handlePasswordChange = useCallback((value: string) => {
    setPassword(toEnglishNumerals(value));
  }, []);

  // Generate a deterministic email from phone for auth
  const phoneToEmail = (phoneNum: string, cc: string) => {
    const clean = cc.replace("+", "") + phoneNum;
    return `${clean}@phone.souqtaqbeel.app`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const authEmail =
      loginMethod === "phone" ? phoneToEmail(phone, countryCode) : email;

    if (loginMethod === "phone" && phone.length < 9) {
      setError("الرجاء إدخال رقم جوال صحيح");
      setLoading(false);
      return;
    }

    if (loginMethod === "phone" && !phone.startsWith("5")) {
      setError("رقم الجوال يجب أن يبدأ بالرقم 5");
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await signIn(authEmail, password);
      if (error) {
        // Check if MFA is required
        if (error.message?.includes("mfa") || (error as any).status === 400) {
          // Check for MFA factors
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verified = factorsData?.totp?.filter(f => f.status === "verified") || [];
          if (verified.length > 0) {
            setMfaRequired(true);
            setMfaFactorId(verified[0].id);
            setLoading(false);
            return;
          }
        }
        reportFailedLogin(authEmail);
        setError(
          error.message === "Invalid login credentials"
            ? "بيانات الدخول غير صحيحة"
            : error.message
        );
      } else {
        // Check if user has MFA factors after login
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verified = factorsData?.totp?.filter(f => f.status === "verified") || [];
        if (verified.length > 0) {
          setMfaRequired(true);
          setMfaFactorId(verified[0].id);
          setLoading(false);
          return;
        }
        navigate("/");
      }
    } else {
      if (!fullName.trim()) {
        setError("الرجاء إدخال الاسم الكامل");
        setLoading(false);
        return;
      }
      if (!checkPasswordStrength(password).valid) {
        setError("كلمة المرور ضعيفة. يجب أن تحتوي على 8 أحرف على الأقل مع حرف كبير ورقم ورمز خاص");
        setLoading(false);
        return;
      }
      if (!agreedToTerms) {
        setError("يجب الموافقة على الشروط والأحكام وسياسة الخصوصية");
        setLoading(false);
        return;
      }
      const phoneNumber = loginMethod === "phone" ? `${countryCode}${phone}` : undefined;
      const { error } = await signUp(authEmail, password, fullName, phoneNumber);
      if (error) {
        setError(error.message);
      } else {
        navigate("/");
      }
    }
    setLoading(false);
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="سوق تقبيل" className="h-14 md:h-16 w-auto mx-auto" />
          </div>
          <h1 className="text-2xl font-medium gradient-text">سوق تقبيل</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isLogin ? "تسجيل الدخول إلى حسابك" : "إنشاء حساب جديد"}
          </p>
        </div>

        {/* AI & ease-of-use highlights */}
        <div className="flex items-center justify-center gap-4 mb-6 text-[11px] text-muted-foreground" dir="rtl">
          <span className="flex items-center gap-1">
            <Sparkles size={13} strokeWidth={1.4} className="text-primary/60" />
            ذكاء اصطناعي
          </span>
          <span className="w-px h-3 bg-border/60" />
          <span className="flex items-center gap-1">
            <Zap size={13} strokeWidth={1.4} className="text-primary/60" />
            سهولة الاستخدام
          </span>
          <span className="w-px h-3 bg-border/60" />
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} strokeWidth={1.4} className="text-primary/60" />
            صفقات آمنة
          </span>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-soft">
          {/* Login / Register toggle */}
          <div className="flex bg-muted rounded-xl p-1 mb-5">
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

          {/* Phone / Email method toggle */}
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => { setLoginMethod("phone"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs transition-all border ${
                loginMethod === "phone"
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              <Phone size={14} strokeWidth={1.3} />
              رقم الجوال
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod("email"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs transition-all border ${
                loginMethod === "email"
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              <Mail size={14} strokeWidth={1.3} />
              البريد الإلكتروني
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name (register only) */}
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

            {/* Phone input */}
            {loginMethod === "phone" && (
              <div className="relative flex gap-2">
                {/* Country code selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryCodes(!showCountryCodes)}
                    className="flex items-center gap-1 h-full px-3 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 hover:border-primary/30 transition-colors whitespace-nowrap"
                  >
                    <span className="text-base leading-none">{selectedCountry?.flag}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">{countryCode}</span>
                    <ChevronDown size={12} strokeWidth={1.3} className="text-muted-foreground" />
                  </button>

                  {showCountryCodes && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowCountryCodes(false)} />
                      <div className="absolute top-full mt-1 right-0 z-50 bg-card border border-border/50 rounded-xl shadow-lg py-1 min-w-[180px] max-h-[220px] overflow-y-auto">
                        {COUNTRY_CODES.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => { setCountryCode(c.code); setShowCountryCodes(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                              c.code === countryCode ? "bg-primary/5 text-primary" : ""
                            }`}
                          >
                            <span className="text-base">{c.flag}</span>
                            <span className="flex-1 text-right text-xs">{c.name}</span>
                            <span className="text-xs text-muted-foreground" dir="ltr">{c.code}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Phone number input */}
                <div className="relative flex-1">
                  <Phone size={16} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="5XXXXXXXX"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none transition-colors tracking-wider text-left"
                    dir="ltr"
                    lang="en"
                    autoComplete="tel-national"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email input */}
            {loginMethod === "email" && (
              <div className="relative">
                <Mail size={16} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  inputMode="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(toEnglishNumerals(e.target.value))}
                  className="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none transition-colors text-left"
                  dir="ltr"
                  lang="en"
                  autoComplete="email"
                  required
                />
              </div>
            )}

            {/* Password */}
            <div className="relative">
              <Lock size={16} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                inputMode="text"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full pr-10 pl-10 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none transition-colors text-left"
                dir="ltr"
                lang="en"
                autoComplete={isLogin ? "current-password" : "new-password"}
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
            {!isLogin && <PasswordStrengthBar password={password} />}

            {/* Terms agreement (register only) */}
            {!isLogin && (
              <label className="flex items-start gap-2 cursor-pointer select-none" dir="rtl">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-border accent-primary shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  أوافق على{" "}
                  <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">
                    الشروط والأحكام
                  </Link>
                  {" "}و{" "}
                  <Link to="/privacy" target="_blank" className="text-primary hover:underline font-medium">
                    سياسة الخصوصية
                  </Link>
                </span>
              </label>
            )}

            {/* Messages */}
            {error && (
              <div className="bg-destructive/5 text-destructive text-xs p-3 rounded-xl">{error}</div>
            )}
            {success && (
              <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl">{success}</div>
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

            {isLogin && (
              <p className="text-center">
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  نسيت كلمة المرور؟
                </Link>
              </p>
            )}
          </form>
        </div>

        {/* Subtle AI tip */}
        <div className="mt-5 mx-auto max-w-xs text-center">
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
            <Sparkles size={11} strokeWidth={1.3} className="inline-block ml-1 text-primary/50 -mt-0.5" />
            ارفع صور مشروعك… والذكاء الاصطناعي يكمل الباقي
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 mt-4">
          <SocialIcons />
          <p className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">← العودة للرئيسية</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
