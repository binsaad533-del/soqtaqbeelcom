import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoIconGold from "@/assets/logo-icon-gold.png";
import { Phone, ChevronDown, Sparkles, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toDigitsOnly, toEnglishNumerals } from "@/lib/arabicNumerals";
import { checkPasswordStrength } from "@/lib/security";
import PasswordStrengthBar from "@/components/PasswordStrengthBar";

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

type Step = "phone" | "otp" | "password" | "success";

const ForgotPasswordPage = () => {
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [showCountryCodes, setShowCountryCodes] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [channel, setChannel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();

  const handlePhoneChange = useCallback((value: string) => {
    const digits = toDigitsOnly(value);
    if (digits.length <= 9) setPhone(digits);
  }, []);

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    if (phone.length < 9 || !phone.startsWith("5")) {
      setError("الرجاء إدخال رقم جوال صحيح يبدأ بالرقم 5");
      return;
    }

    setLoading(true);
    const fullPhone = `${countryCode}${phone}`;

    const { data, error: fnError } = await supabase.functions.invoke("reset-password-send-otp", {
      body: { phone: fullPhone },
    });

    if (fnError) {
      setError("فشل إرسال رمز التحقق، حاول مرة أخرى");
    } else if (data?.error) {
      setError(data.error);
    } else {
      setChannel(data?.channel || "sms");
      setStep("otp");
      startResendTimer();
    }
    setLoading(false);
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otpCode.length !== 6) {
      setError("رمز التحقق يتكون من 6 أرقام");
      return;
    }

    if (!checkPasswordStrength(password).valid) {
      setError("كلمة المرور ضعيفة. يجب أن تحتوي على 8 أحرف على الأقل مع حرف كبير ورقم ورمز خاص");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    const fullPhone = `${countryCode}${phone}`;

    const { data, error: fnError } = await supabase.functions.invoke("reset-password-verify", {
      body: { phone: fullPhone, code: otpCode, newPassword: password },
    });

    if (fnError) {
      setError("حدث خطأ، حاول مرة أخرى");
    } else if (data?.error) {
      setError(data.error);
    } else {
      setStep("success");
      setTimeout(() => navigate("/login"), 3000);
    }
    setLoading(false);
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode);

  // Success
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <img src={logoIconGold} alt="سوق تقبيل" className="h-14 md:h-16 w-auto" />
          </div>
          <div className="bg-card rounded-2xl p-8 shadow-soft">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle size={28} strokeWidth={1.3} className="text-green-600" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">تم تغيير كلمة المرور بنجاح</h2>
            <p className="text-sm text-muted-foreground">
              سيتم توجيهك لصفحة تسجيل الدخول خلال لحظات...
            </p>
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
            <img src={logoIconGold} alt="سوق تقبيل" className="h-14 md:h-16 w-auto mx-auto" />
          </div>
          <h1 className="text-2xl font-medium gradient-text">نسيت كلمة المرور</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {step === "phone" && "أدخل رقم جوالك وسنرسل لك رمز تحقق"}
            {step === "otp" && "أدخل رمز التحقق وكلمة المرور الجديدة"}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-soft">
          {step === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="relative flex gap-2">
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
                    required
                  />
                </div>
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
                    جاري الإرسال...
                  </span>
                ) : (
                  "إرسال رمز التحقق"
                )}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              {/* OTP input */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 text-right">
                  رمز التحقق المرسل {channel === "call" ? "عبر مكالمة" : channel === "whatsapp" ? "عبر واتساب" : "عبر SMS"}
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(toDigitsOnly(e.target.value).slice(0, 6))}
                  className="w-full px-4 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none transition-colors tracking-[0.5em] text-center font-mono text-lg"
                  dir="ltr"
                  autoFocus
                  required
                />
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 text-right">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock size={16} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    inputMode="text"
                    placeholder="كلمة المرور الجديدة"
                    value={password}
                    onChange={(e) => setPassword(toEnglishNumerals(e.target.value))}
                    className="w-full pr-10 pl-10 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none transition-colors text-left"
                    dir="ltr"
                    lang="en"
                    autoComplete="new-password"
                    required
                    minLength={8}
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
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 text-right">تأكيد كلمة المرور</label>
                <div className="relative">
                  <Lock size={16} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    inputMode="text"
                    placeholder="تأكيد كلمة المرور"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(toEnglishNumerals(e.target.value))}
                    className="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none transition-colors text-left"
                    dir="ltr"
                    lang="en"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>
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
                    جاري التحقق...
                  </span>
                ) : (
                  "تأكيد وتغيير كلمة المرور"
                )}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setOtpCode(""); setError(""); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  تغيير الرقم
                </button>
                {resendTimer > 0 ? (
                  <span className="text-muted-foreground">إعادة الإرسال ({resendTimer})</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="text-primary hover:underline"
                  >
                    إعادة إرسال الرمز
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 mt-6">
          <p className="text-[11px] text-muted-foreground/70">
            <Sparkles size={11} strokeWidth={1.3} className="inline-block ml-1 text-primary/50 -mt-0.5" />
            حسابك محمي بأعلى معايير الأمان
          </p>
          <p className="text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">← العودة لتسجيل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
