import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoIconGold from "@/assets/logo-icon-gold.png";
import { Mail, Phone, ChevronDown, ArrowRight, Sparkles } from "lucide-react";
import { toEnglishNumerals, toDigitsOnly } from "@/lib/arabicNumerals";

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

const ForgotPasswordPage = () => {
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [showCountryCodes, setShowCountryCodes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handlePhoneChange = useCallback((value: string) => {
    const digits = toDigitsOnly(value);
    if (digits.length <= 9) setPhone(digits);
  }, []);

  const phoneToEmail = (phoneNum: string, cc: string) => {
    const clean = cc.replace("+", "") + phoneNum;
    return `${clean}@phone.souqtaqbeel.app`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (method === "phone" && (phone.length < 9 || !phone.startsWith("5"))) {
      setError("الرجاء إدخال رقم جوال صحيح يبدأ بالرقم 5");
      setLoading(false);
      return;
    }

    const resetEmail = method === "phone" ? phoneToEmail(phone, countryCode) : email;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError("حدث خطأ أثناء إرسال رابط إعادة التعيين. حاول مرة أخرى.");
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode);

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <img src={logoIconGold} alt="سوق تقبيل" className="h-14 md:h-16 w-auto" />
          </div>
          <div className="bg-card rounded-2xl p-8 shadow-soft">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail size={28} strokeWidth={1.3} className="text-primary" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">تم إرسال رابط إعادة التعيين</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {method === "phone"
                ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد المرتبط برقم جوالك. تحقق من بريدك الإلكتروني."
                : "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. تحقق من صندوق الوارد."}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowRight size={14} strokeWidth={1.5} />
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logoIconGold} alt="سوق تقبيل" className="h-14 md:h-16 w-auto mx-auto" />
          </div>
          <h1 className="text-2xl font-medium gradient-text">نسيت كلمة المرور</h1>
          <p className="text-sm text-muted-foreground mt-2">
            أدخل بياناتك وسنرسل لك رابط إعادة التعيين
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-soft">
          {/* Method toggle */}
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => { setMethod("phone"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs transition-all border ${
                method === "phone"
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              <Phone size={14} strokeWidth={1.3} />
              رقم الجوال
            </button>
            <button
              type="button"
              onClick={() => { setMethod("email"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs transition-all border ${
                method === "email"
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              <Mail size={14} strokeWidth={1.3} />
              البريد الإلكتروني
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone input */}
            {method === "phone" && (
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
            )}

            {/* Email input */}
            {method === "email" && (
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
                  required
                />
              </div>
            )}

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
                "إرسال رابط إعادة التعيين"
              )}
            </button>
          </form>
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
