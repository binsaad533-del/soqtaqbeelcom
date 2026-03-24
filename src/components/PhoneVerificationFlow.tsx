import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePhoneVerification } from "@/hooks/usePhoneVerification";
import { toDigitsOnly } from "@/lib/arabicNumerals";
import AiStar from "@/components/AiStar";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Phone, ChevronDown, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface PhoneVerificationProps {
  onVerified?: () => void;
  initialPhone?: string;
  mode?: "modal" | "inline";
}

type Step = "phone" | "otp" | "success";

const PhoneVerificationFlow = ({ onVerified, initialPhone, mode = "inline" }: PhoneVerificationProps) => {
  const { profile } = useAuthContext();
  const { sendOtp, verifyOtp, sending, verifying } = usePhoneVerification();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(() => {
    const raw = initialPhone?.replace(/^\+\d{1,3}/, "").replace(/^0+/, "") || "";
    return toDigitsOnly(raw).slice(0, 9);
  });
  const [countryCode, setCountryCode] = useState("+966");
  const [showCodes, setShowCodes] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const [aiMessage, setAiMessage] = useState("يالله حيّه، دخل رقمك عشان نتحقق 📱");

  // If already verified
  useEffect(() => {
    if ((profile as any)?.phone_verified) {
      setStep("success");
      setAiMessage("رقمك موثّق، يا بطل! ✅");
    }
  }, [profile]);

  // Resend timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const fullPhone = `${countryCode}${phone}`;

  const handleSendOtp = useCallback(async () => {
    if (phone.length < 9 || !phone.startsWith("5")) {
      setError("رقم الجوال يجب أن يبدأ بـ 5 ويتكون من 9 أرقام");
      return;
    }
    setError("");
    setAiMessage("نرسل لك الكود، لحظة... ⏳");

    const result = await sendOtp(fullPhone);
    if (result.success) {
      setStep("otp");
      setResendTimer(30);
      setAiMessage("أرسلنا لك كود، شيّك جوالك 📲");
    } else {
      setError(result.error || "فشل الإرسال");
      setAiMessage("صار خطأ، جرّب مرة ثانية 🔄");
    }
  }, [phone, fullPhone, sendOtp]);

  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length !== 6) return;
    setError("");
    setAiMessage("نتحقق من الكود... ⏳");

    const result = await verifyOtp(fullPhone, otpCode);
    if (result.verified) {
      setStep("success");
      setAiMessage("تم التحقق بنجاح 👌");
      onVerified?.();
    } else {
      setAttempts((a) => a + 1);
      if (attempts >= 2) {
        setError("تجاوزت عدد المحاولات، أعد إرسال الكود");
        setAiMessage("خلصت المحاولات، أرسل كود جديد 🔄");
        setStep("phone");
        setAttempts(0);
        setOtpCode("");
      } else {
        setError(result.error || "الكود غلط، جرّب مرة ثانية");
        setAiMessage("الكود غلط، جرّب مرة ثانية 🤔");
      }
    }
  }, [otpCode, fullPhone, verifyOtp, attempts, onVerified]);

  const handleResend = useCallback(async () => {
    if (resendTimer > 0) return;
    setOtpCode("");
    setError("");
    setAiMessage("نعيد إرسال الكود... ⏳");
    const result = await sendOtp(fullPhone);
    if (result.success) {
      setResendTimer(30);
      setAttempts(0);
      setAiMessage("تم إعادة الإرسال، شيّك جوالك 📲");
    } else {
      setError(result.error || "فشل إعادة الإرسال");
    }
  }, [resendTimer, fullPhone, sendOtp]);

  const handlePhoneChange = (value: string) => {
    const digits = toDigitsOnly(value);
    if (digits.length <= 9) setPhone(digits);
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode);

  if (step === "success") {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <p className="text-sm font-medium text-foreground">تم التحقق بنجاح</p>
        <p className="text-xs text-muted-foreground">رقم جوالك موثّق الآن</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", mode === "modal" && "p-1")} dir="rtl">
      {/* AI Assistant Message */}
      <div className="flex items-start gap-3 bg-primary/5 rounded-xl p-3">
        <AiStar size={24} animate={sending || verifying} />
        <p className="text-sm text-foreground/80 leading-relaxed">{aiMessage}</p>
      </div>

      {step === "phone" && (
        <>
          {/* Phone input */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">رقم الجوال</label>
            <div className="flex gap-2">
              {/* Country code */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCodes(!showCodes)}
                  className="flex items-center gap-1 h-full px-3 py-3 bg-muted/50 rounded-xl text-sm transition-colors whitespace-nowrap hover:bg-muted"
                >
                  <span className="text-base leading-none">{selectedCountry?.flag}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">{countryCode}</span>
                  <ChevronDown size={12} className="text-muted-foreground" />
                </button>

                {showCodes && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCodes(false)} />
                    <div className="absolute top-full mt-1 right-0 z-50 bg-card rounded-xl shadow-lg py-1 min-w-[180px] max-h-[220px] overflow-y-auto">
                      {COUNTRY_CODES.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setCountryCode(c.code); setShowCodes(false); }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors",
                            c.code === countryCode && "bg-primary/5 text-primary"
                          )}
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

              {/* Phone number */}
              <div className="relative flex-1">
                <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="5XXXXXXXX"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 bg-muted/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all tracking-wider text-left"
                  dir="ltr"
                  lang="en"
                />
              </div>
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handleSendOtp}
            disabled={sending || phone.length < 9}
            className="w-full py-3 rounded-xl text-sm font-medium text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: "var(--gradient-primary)" }}
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <AiStar size={18} animate />
                جاري الإرسال...
              </span>
            ) : "أرسل رمز التحقق"}
          </button>
        </>
      )}

      {step === "otp" && (
        <>
          {/* OTP input */}
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground">أدخل رمز التحقق المكوّن من 6 أرقام</label>
            <div className="flex justify-center" dir="ltr">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              تم الإرسال إلى <span dir="ltr" className="font-mono">{fullPhone}</span>
            </p>
          </div>

          {/* Verify button */}
          <button
            onClick={handleVerifyOtp}
            disabled={verifying || otpCode.length !== 6}
            className="w-full py-3 rounded-xl text-sm font-medium text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: "var(--gradient-primary)" }}
          >
            {verifying ? (
              <span className="flex items-center justify-center gap-2">
                <AiStar size={18} animate />
                جاري التحقق...
              </span>
            ) : "تحقق"}
          </button>

          {/* Resend */}
          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-xs text-muted-foreground">
                إعادة الإرسال بعد <span className="font-mono">{resendTimer}</span> ثانية
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={sending}
                className="text-xs text-primary hover:underline"
              >
                إعادة إرسال الرمز
              </button>
            )}
          </div>

          {/* Change number */}
          <button
            onClick={() => { setStep("phone"); setOtpCode(""); setError(""); setAiMessage("عدّل رقمك وأرسل كود جديد"); }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            تغيير رقم الجوال
          </button>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-destructive/5 text-destructive text-xs p-3 rounded-xl">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
};

export default PhoneVerificationFlow;
