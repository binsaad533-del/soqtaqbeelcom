import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import AnimatedLogo from "@/components/AnimatedLogo";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Phone, ChevronDown, Sparkles, ShieldCheck, Zap, Info } from "lucide-react";
import { toEnglishNumerals, toDigitsOnly } from "@/lib/arabicNumerals";
import { checkPasswordStrength, isRateLimited } from "@/lib/security";
import PasswordStrengthBar from "@/components/PasswordStrengthBar";
import { useSecurityIncidents } from "@/hooks/useSecurityIncidents";
import { useSEO } from "@/hooks/useSEO";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  useSEO({ title: t("auth.login.seoTitle"), description: t("auth.login.seoDescription"), canonical: "/login" });
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const { signIn, signUp, user } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectReason = searchParams.get("redirect");
  const fromPage = searchParams.get("from");
  const isFromProtectedPage = fromPage === "/create-listing" || fromPage === "/dashboard";

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);

  useEffect(() => {
    if (user && !mfaRequired) {
      navigate("/", { replace: true });
    }
  }, [user, navigate, mfaRequired]);
  const { reportFailedLogin } = useSecurityIncidents();

  const handlePhoneChange = useCallback((value: string) => {
    const digits = toDigitsOnly(value);
    if (digits.length <= 9) setPhone(digits);
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(toEnglishNumerals(value));
  }, []);

  const phoneToEmail = (phoneNum: string, cc: string) => {
    const clean = cc.replace("+", "") + phoneNum;
    return `${clean}@phone.souqtaqbeel.app`;
  };

  /* ── Google Sign-In ── */
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(t("auth.shared.googleFailed"));
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate("/");
    } catch {
      setError(t("auth.shared.googleError"));
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const authEmail = loginMethod === "phone" ? phoneToEmail(phone, countryCode) : email;

    if (isLogin && isRateLimited(`login_${authEmail}`, 5, 5 * 60 * 1000)) {
      setError(t("auth.validation.rateLimited"));
      setLoading(false);
      return;
    }

    if (loginMethod === "phone" && phone.length < 9) {
      setError(t("auth.validation.phoneInvalid"));
      setLoading(false);
      return;
    }

    if (loginMethod === "phone" && !phone.startsWith("5")) {
      setError(t("auth.validation.phoneMustStartWith5"));
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await signIn(authEmail, password);
      if (error) {
        if (error.message?.includes("mfa") || (error as { status?: number }).status === 400) {
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
            ? t("auth.validation.invalidCredentials")
            : error.message
        );
      } else {
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
        setError(t("auth.validation.fullNameRequired"));
        setLoading(false);
        return;
      }
      if (!checkPasswordStrength(password).valid) {
        setError(t("auth.validation.passwordWeak"));
        setLoading(false);
        return;
      }
      if (!agreedToTerms) {
        setError(t("auth.validation.termsRequired"));
        setLoading(false);
        return;
      }
      const phoneNumber = loginMethod === "phone" ? `${countryCode}${phone}` : undefined;
      const { error } = await signUp(authEmail, password, fullName, phoneNumber);
      if (error) {
        setError(error.message);
      } else {
        navigate("/onboarding");
      }
    }
    setLoading(false);
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center mb-3">
            <AnimatedLogo className="h-14 md:h-16 w-14 md:w-16" />
            <span className="text-xs md:text-sm font-semibold tracking-[0.25em] text-foreground/70 mt-1.5 uppercase">SOQ TAQBEEL</span>
          </div>
          <h1 className="text-sm text-muted-foreground mt-1">
            {isLogin ? t("auth.login.welcomeBack") : t("auth.login.startJourney")}
          </h1>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 mb-5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sparkles size={12} strokeWidth={1.4} className="text-primary/60" />
            {t("auth.shared.trustAi")}
          </span>
          <span className="w-px h-3 bg-border/60" />
          <span className="flex items-center gap-1">
            <Zap size={12} strokeWidth={1.4} className="text-primary/60" />
            {t("auth.shared.trustFast")}
          </span>
          <span className="w-px h-3 bg-border/60" />
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} strokeWidth={1.4} className="text-primary/60" />
            {t("auth.shared.trustSecure")}
          </span>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/20">
          {mfaRequired ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <ShieldCheck size={32} className="mx-auto text-primary" />
                <h2 className="text-base font-medium text-foreground">{t("auth.mfa.title")}</h2>
                <p className="text-xs text-muted-foreground">{t("auth.mfa.subtitle")}</p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-3 rounded-xl border border-border/50 bg-muted/50 text-sm text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/20"
                dir="ltr"
                autoFocus
              />
              {error && <div className="bg-destructive/5 text-destructive text-xs p-3 rounded-xl">{error}</div>}
              <button
                onClick={async () => {
                  if (!mfaFactorId || mfaCode.length !== 6) return;
                  setMfaVerifying(true);
                  setError("");
                  const { data: challenge, error: chalErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
                  if (chalErr) { setError(chalErr.message); setMfaVerifying(false); return; }
                  const { error: verErr } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.id, code: mfaCode });
                  if (verErr) { setError(t("auth.validation.otpIncorrect")); setMfaVerifying(false); return; }
                  setMfaVerifying(false);
                  navigate("/");
                }}
                disabled={mfaCode.length !== 6 || mfaVerifying}
                className="w-full py-3 rounded-xl text-sm font-medium text-primary-foreground transition-all disabled:opacity-50"
                style={{ background: "var(--gradient-primary)" }}
              >
                {mfaVerifying ? t("auth.mfa.verifying") : t("auth.mfa.confirm")}
              </button>
              <button onClick={() => { setMfaRequired(false); setMfaCode(""); setError(""); }} className="w-full text-xs text-muted-foreground hover:text-foreground">
                {t("auth.mfa.back")}
              </button>
            </div>
          ) : (
            <>
              {/* ═══ GOOGLE SIGN-IN (Primary CTA) ═══ */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border/50 bg-background hover:bg-muted/50 transition-all text-sm font-medium disabled:opacity-50 active:scale-[0.98]"
              >
                {googleLoading ? (
                  <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                )}
                <span>{googleLoading ? t("auth.shared.googleRedirecting") : t("auth.shared.continueWithGoogle")}</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[11px] text-muted-foreground">{t("auth.shared.or")}</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {/* Login / Register toggle */}
              <div className="flex bg-muted rounded-xl p-1 mb-4">
                <button
                  onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                    isLogin ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {t("auth.login.tabLogin")}
                </button>
                <button
                  onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                    !isLogin ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {t("auth.login.tabRegister")}
                </button>
              </div>

              {/* Phone / Email method toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => { setLoginMethod("phone"); setError(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs transition-all border ${
                    loginMethod === "phone"
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  <Phone size={13} strokeWidth={1.3} />
                  {t("auth.fields.phoneLabel")}
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
                  <Mail size={13} strokeWidth={1.3} />
                  {t("auth.fields.emailLabel")}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Full name (register only) */}
                {!isLogin && (
                  <div className="relative">
                    <UserIcon size={15} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t("auth.fields.fullNamePlaceholder")}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none transition-colors"
                    />
                  </div>
                )}

                {/* Phone input */}
                {loginMethod === "phone" && (
                  <div className="relative flex gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCountryCodes(!showCountryCodes)}
                        className="flex items-center gap-1 h-full px-3 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 hover:border-primary/30 transition-colors whitespace-nowrap"
                      >
                        <span className="text-base leading-none">{selectedCountry?.flag}</span>
                        <span className="text-xs text-muted-foreground" dir="ltr">{countryCode}</span>
                        <ChevronDown size={11} strokeWidth={1.3} className="text-muted-foreground" />
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
                    <div className="relative flex-1">
                      <Phone size={15} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder={t("auth.fields.phonePlaceholder")}
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
                    <Mail size={15} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      inputMode="email"
                      placeholder={t("auth.fields.emailPlaceholder")}
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
                  <Lock size={15} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    inputMode="text"
                    placeholder={t("auth.fields.passwordPlaceholder")}
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
                    {showPassword ? <EyeOff size={15} strokeWidth={1.3} /> : <Eye size={15} strokeWidth={1.3} />}
                  </button>
                </div>
                {!isLogin && <PasswordStrengthBar password={password} />}

                {/* Terms agreement (register only) */}
                {!isLogin && (
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-border accent-primary shrink-0"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      {t("auth.register.agreeToTerms")}{" "}
                      <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">{t("auth.register.termsLink")}</Link>
                      {" "}{t("auth.register.and")}{" "}
                      <Link to="/privacy" target="_blank" className="text-primary hover:underline font-medium">{t("auth.register.privacyLink")}</Link>
                    </span>
                  </label>
                )}

                {/* Redirect messages */}
                {isFromProtectedPage && !error && !success && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs p-3 rounded-xl flex items-center justify-between gap-2 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>{t("auth.login.redirectProtected")}</span>
                    </div>
                    <button type="button" onClick={() => setIsLogin(false)} className="shrink-0 text-[10px] font-semibold bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors">
                      {t("auth.login.redirectCreateAccount")}
                    </button>
                  </div>
                )}

                {redirectReason === "auth_required" && !isFromProtectedPage && !error && !success && (
                  <div className="bg-primary/5 text-primary text-xs p-3 rounded-xl flex items-center gap-2 border border-primary/10">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>{t("auth.login.redirectAuthRequired")}</span>
                  </div>
                )}

                {error && <div className="bg-destructive/5 text-destructive text-xs p-3 rounded-xl">{error}</div>}
                {success && <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl">{success}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-medium text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("auth.shared.processing")}
                    </span>
                  ) : isLogin ? t("auth.login.submit") : t("auth.register.submit")}
                </button>

                {isLogin && (
                  <p className="text-center">
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">{t("auth.login.forgotPassword")}</Link>
                  </p>
                )}
              </form>
            </>
          )}
        </div>

        {/* Moqbel AI tip */}
        <div className="mt-4 mx-auto max-w-xs text-center">
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
            <Sparkles size={11} strokeWidth={1.3} className="inline-block ml-1 text-primary/50 -mt-0.5" />
            {t("auth.shared.moqbelHelps")}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 mt-3">
          <p className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">{t("auth.shared.backToHome")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
