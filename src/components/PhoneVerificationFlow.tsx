import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePhoneVerification } from "@/hooks/usePhoneVerification";
import { toDigitsOnly } from "@/lib/arabicNumerals";
import AiStar from "@/components/AiStar";
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

const OTP_COOLDOWN_SECONDS = 60;

interface PhoneVerificationProps {
  onVerified?: () => void;
  initialPhone?: string;
  mode?: "modal" | "inline";
  skipPhoneStep?: boolean;
}

type Step = "phone" | "otp" | "success";

const PhoneVerificationFlow = ({ onVerified, initialPhone, mode = "inline", skipPhoneStep = false }: PhoneVerificationProps) => {
  const { profile } = useAuthContext();
  const { sendOtp, verifyOtp, sending, verifying } = usePhoneVerification();

  const [step, setStep] = useState<Step>(skipPhoneStep ? "otp" : "phone");
  const [phone, setPhone] = useState(() => {
    const raw = initialPhone?.replace(/^\+\d{1,3}/, "").replace(/^0+/, "") || "";
    return toDigitsOnly(raw).slice(0, 9);
  });
  const [countryCode, setCountryCode] = useState("+966");
  const [showCodes, setShowCodes] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const [deliveryChannel, setDeliveryChannel] = useState<"sms" | "call">("sms");
  const [aiMessage, setAiMessage] = useState("يالله حيّه، دخل رقمك عشان نتحقق 📱");
  const [locked, setLocked] = useState(false);
  const lastSendRef = useRef(0);

  // If already verified
  useEffect(() => {
    if ((profile as any)?.phone_verified) {
      setStep("success");
      setAiMessage("رقمك موثّق، يا بطل! ✅");
    }
  }, [profile]);

  // Cooldown timer (60s between OTP requests)
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

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

    // Frontend cooldown enforcement
    const now = Date.now();
    const elapsed = (now - lastSendRef.current) / 1000;
    if (elapsed < OTP_COOLDOWN_SECONDS && lastSendRef.current > 0) {
      const remaining = Math.ceil(OTP_COOLDOWN_SECONDS - elapsed);
      setError(`انتظر ${remaining} ثانية قبل طلب رمز جديد`);
      setCooldown(remaining);
      return;
    }

    setError("");

    const result = await sendOtp(fullPhone);
    if (result.success) {
      lastSendRef.current = Date.now();
      const channel = result.channel || "sms";
      setDeliveryChannel(channel);
      setStep("otp");
      setCooldown(OTP_COOLDOWN_SECONDS);
      setResendTimer(OTP_COOLDOWN_SECONDS);
      setAiMessage(channel === "call" ? "اتصلنا عليك بالكود، انتبه للمكالمة 📞" : "أرسلنا لك كود، شيّك جوالك 📲");
    } else {
      setError(result.error || "فشل الإرسال");
      setAiMessage("صار خطأ، جرّب مرة ثانية 🔄");
    }
  }, [phone, fullPhone, sendOtp]);

  // Auto-send OTP when skipPhoneStep
  useEffect(() => {
    if (skipPhoneStep && phone.length >= 9) {
      handleSendOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipPhoneStep]);

  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length !== 6 || locked) return;
    setError("");
    setAiMessage("نتحقق من الكود... ⏳");

    const result = await verifyOtp(fullPhone, otpCode);
    if (result.verified) {
      setStep("success");
      setAiMessage("تم التحقق بنجاح 👌");
      onVerified?.();
    } else {
      setAttempts((a) => a + 1);

      // Check if backend locked the phone
      if ((result as any).locked) {
        setLocked(true);
        setError(result.error || "تم إدخال رمز خاطئ عدة مرات. حاول بعد 30 دقيقة.");
        setAiMessage("تم قفل التحقق مؤقتاً 🔒");
        return;
      }

      if (attempts >= 4) {
        setError("تجاوزت عدد المحاولات، أعد إرسال الكود");
        setAiMessage("خلصت المحاولات، أرسل كود جديد 🔄");
        setAttempts(0);
        setOtpCode("");
        if (skipPhoneStep) {
          handleSendOtp();
        } else {
          setStep("phone");
        }
      } else {
        setError(result.error || "الكود غلط، جرّب مرة ثانية");
        setAiMessage("الكود غلط، جرّب مرة ثانية 🤔");
      }
    }
  }, [otpCode, fullPhone, verifyOtp, attempts, onVerified, locked]);

  const handleResend = useCallback(async () => {
    if (resendTimer > 0 || cooldown > 0 || locked) return;
    setOtpCode("");
    setError("");
    setAiMessage("نعيد إرسال الكود... ⏳");
    const result = await sendOtp(fullPhone);
    if (result.success) {
      lastSendRef.current = Date.now();
      const channel = result.channel || "sms";
      setDeliveryChannel(channel);
      setCooldown(OTP_COOLDOWN_SECONDS);
      setResendTimer(OTP_COOLDOWN_SECONDS);
      setAttempts(0);
      setAiMessage(channel === "call" ? "أعدنا الاتصال بالكود 📞" : "تم إعادة الإرسال، شيّك جوالك 📲");
    } else {
      setError(result.error || "فشل إعادة الإرسال");
    }
  }, [resendTimer, cooldown, fullPhone, sendOtp, locked]);

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
    <div className={cn("space-y-3", mode === "modal" && "p-1")} dir="rtl">

      {step === "phone" && !skipPhoneStep && (
        <div className="flex items-end gap-2 flex-wrap sm:flex-nowrap">
          {/* Country code */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCodes(!showCodes)}
              className="flex items-center gap-1 px-2.5 py-2 bg-muted/50 rounded-lg text-xs transition-colors whitespace-nowrap hover:bg-muted h-9"
            >
              <span className="text-sm leading-none">{selectedCountry?.flag}</span>
              <span className="text-[10px] text-muted-foreground" dir="ltr">{countryCode}</span>
              <ChevronDown size={10} className="text-muted-foreground" />
            </button>

            {showCodes && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCodes(false)} />
                <div className="absolute top-full mt-1 right-0 z-50 bg-card rounded-lg shadow-lg py-1 min-w-[160px] max-h-[180px] overflow-y-auto border border-border/30">
                  {COUNTRY_CODES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { setCountryCode(c.code); setShowCodes(false); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted/50 transition-colors",
                        c.code === countryCode && "bg-primary/5 text-primary"
                      )}
                    >
                      <span className="text-sm">{c.flag}</span>
                      <span className="flex-1 text-right text-[10px]">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground" dir="ltr">{c.code}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Phone number */}
          <div className="relative flex-1 min-w-[140px]">
            <Phone size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="5XXXXXXXX"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full pr-8 pl-3 py-2 bg-muted/50 rounded-lg text-xs h-9 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all tracking-wider text-left"
              dir="ltr"
              lang="en"
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSendOtp}
            disabled={sending || phone.length < 9 || cooldown > 0}
            className="h-9 px-4 rounded-lg text-xs font-medium text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50 whitespace-nowrap shrink-0"
            style={{ background: "var(--gradient-primary)" }}
          >
            {sending ? (
              <span className="flex items-center gap-1.5">
                <AiStar size={14} animate />
                إرسال...
              </span>
            ) : cooldown > 0 ? (
              <span className="font-mono">{cooldown}ث</span>
            ) : "أرسل الكود"}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(toDigitsOnly(e.target.value).slice(0, 6))}
              className="w-28 h-8 bg-muted/50 rounded-lg px-3 text-xs text-center tracking-[0.3em] border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all font-mono"
              dir="ltr"
              lang="en"
              autoFocus
              disabled={locked}
            />

            <button
              onClick={handleVerifyOtp}
              disabled={verifying || otpCode.length !== 6 || locked}
              className="h-8 px-4 rounded-lg text-xs font-medium text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50 whitespace-nowrap shrink-0"
              style={{ background: "var(--gradient-primary)" }}
            >
              {verifying ? (
                <span className="flex items-center gap-1.5">
                  <AiStar size={14} animate />
                  تحقق...
                </span>
              ) : "تحقق"}
            </button>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>{deliveryChannel === "call" ? "تم الإرسال عبر مكالمة" : "تم الإرسال عبر رسالة"} إلى <span dir="ltr" className="font-mono">{fullPhone}</span></span>
            <span className="text-border/50">|</span>
            {resendTimer > 0 ? (
              <span>إعادة بعد <span className="font-mono">{resendTimer}</span>ث</span>
            ) : locked ? (
              <span className="text-destructive">التحقق مقفل مؤقتاً</span>
            ) : (
              <button onClick={handleResend} disabled={sending} className="text-primary hover:underline">إعادة الإرسال</button>
            )}
            {!skipPhoneStep && !locked && (
              <>
                <span className="text-border/50">|</span>
                <button
                  onClick={() => { setStep("phone"); setOtpCode(""); setError(""); setAiMessage("عدّل رقمك وأرسل كود جديد"); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  تغيير الرقم
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 text-destructive text-[10px] bg-destructive/5 px-2.5 py-1.5 rounded-lg">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
};

export default PhoneVerificationFlow;
