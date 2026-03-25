import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Shield, Smartphone, Key, Trash2, Loader2,
  Monitor, Clock, MapPin, Check, Copy, AlertTriangle
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

/* ─── 2FA Setup ─── */
const TwoFactorSection = () => {
  const { user } = useAuthContext();
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const loadFactors = async () => {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    if (data) {
      setMfaFactors(data.totp || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadFactors(); }, []);

  const startEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) {
      toast.error("فشل بدء التسجيل: " + error.message);
      setEnrolling(false);
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
  };

  const verifyEnroll = async () => {
    if (!factorId || verifyCode.length !== 6) return;
    setVerifying(true);
    const { data: challenge, error: chalErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chalErr) {
      toast.error("خطأ: " + chalErr.message);
      setVerifying(false);
      return;
    }
    const { error: verErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode,
    });
    if (verErr) {
      toast.error("رمز غير صحيح، حاول مرة أخرى");
      setVerifying(false);
      return;
    }
    toast.success("تم تفعيل المصادقة الثنائية بنجاح");
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerifyCode("");
    setVerifying(false);
    loadFactors();
  };

  const unenroll = async (fId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: fId });
    if (error) {
      toast.error("فشل إلغاء التفعيل: " + error.message);
      return;
    }
    toast.success("تم إلغاء المصادقة الثنائية");
    loadFactors();
  };

  const verifiedFactors = mfaFactors.filter(f => f.status === "verified");
  const isEnabled = verifiedFactors.length > 0;

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary" size={20} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key size={16} className="text-primary" />
          <h3 className="text-sm font-medium text-foreground">المصادقة الثنائية (2FA)</h3>
        </div>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-lg font-medium",
          isEnabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
        )}>
          {isEnabled ? "مفعّل" : "غير مفعّل"}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        أضف طبقة حماية إضافية لحسابك باستخدام تطبيق المصادقة (Google Authenticator أو Authy)
      </p>

      {isEnabled && !enrolling ? (
        <div className="space-y-2">
          {verifiedFactors.map(f => (
            <div key={f.id} className="flex items-center justify-between bg-success/5 rounded-xl p-3 border border-success/20">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-success" />
                <span className="text-xs text-foreground">TOTP مفعّل</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-xs text-destructive hover:underline">إلغاء التفعيل</button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>إلغاء المصادقة الثنائية</AlertDialogTitle>
                    <AlertDialogDescription>
                      هل أنت متأكد؟ سيتم إزالة طبقة الحماية الإضافية من حسابك.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={() => unenroll(f.id)} className="bg-destructive text-destructive-foreground">تأكيد الإلغاء</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      ) : enrolling ? (
        <div className="space-y-4 bg-muted/30 rounded-xl p-4 border border-border/30">
          <p className="text-xs text-foreground font-medium">1. امسح رمز QR بتطبيق المصادقة:</p>
          {qrCode && (
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code" className="w-40 h-40 rounded-lg" />
            </div>
          )}
          {secret && (
            <div className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border/30">
              <code className="text-[10px] text-muted-foreground flex-1 break-all" dir="ltr">{secret}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(secret); toast.success("تم النسخ"); }}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <Copy size={12} />
              </button>
            </div>
          )}
          <p className="text-xs text-foreground font-medium">2. أدخل الرمز المكون من 6 أرقام:</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="flex-1 px-3 py-2 rounded-lg border border-border/50 bg-card text-sm text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/20"
              dir="ltr"
            />
            <button
              onClick={verifyEnroll}
              disabled={verifyCode.length !== 6 || verifying}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
            >
              {verifying ? <Loader2 className="animate-spin" size={14} /> : "تأكيد"}
            </button>
          </div>
          <button onClick={() => { setEnrolling(false); setQrCode(null); setSecret(null); }} className="text-xs text-muted-foreground hover:text-foreground">
            إلغاء
          </button>
        </div>
      ) : (
        <button
          onClick={startEnroll}
          className="w-full py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
        >
          تفعيل المصادقة الثنائية
        </button>
      )}
    </div>
  );
};

/* ─── Session Logs ─── */
const SessionLogsSection = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("session_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setSessions((data || []) as any[]);
      setLoading(false);
    })();
  }, []);

  const parseDevice = (ua: string | null) => {
    if (!ua) return "غير معروف";
    if (ua.includes("Mobile")) return "جوال";
    if (ua.includes("Tablet")) return "تابلت";
    return "كمبيوتر";
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary" size={20} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Monitor size={16} className="text-primary" />
        <h3 className="text-sm font-medium text-foreground">سجل الجلسات</h3>
      </div>
      <p className="text-xs text-muted-foreground">آخر 20 تسجيل دخول لحسابك</p>

      {sessions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">لا توجد سجلات بعد</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {sessions.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between bg-card rounded-xl p-3 border border-border/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  {parseDevice(s.user_agent) === "جوال" ? <Smartphone size={14} className="text-muted-foreground" /> : <Monitor size={14} className="text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-xs text-foreground">{parseDevice(s.user_agent)}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {s.ip_address && <span className="flex items-center gap-0.5"><MapPin size={9} />{s.ip_address}</span>}
                    <span className="flex items-center gap-0.5">
                      <Clock size={9} />
                      {new Date(s.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-lg",
                s.event_type === "sign_in" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
              )}>
                {s.event_type === "sign_in" ? "دخول" : s.event_type === "sign_out" ? "خروج" : s.event_type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Account Deletion ─── */
const DeleteAccountSection = () => {
  const { user, signOut } = useAuthContext();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "حذف حسابي" || !user) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast.success("تم حذف حسابك بنجاح");
      await signOut();
    } catch (e: any) {
      toast.error("فشل حذف الحساب: " + (e.message || "خطأ غير متوقع"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 size={16} className="text-destructive" />
        <h3 className="text-sm font-medium text-destructive">حذف الحساب</h3>
      </div>

      <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/20 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs text-foreground font-medium">تحذير: هذا الإجراء لا يمكن التراجع عنه</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              سيتم حذف حسابك وجميع بياناتك بشكل نهائي، بما في ذلك الإعلانات والصفقات والرسائل. الصفقات المكتملة والاتفاقيات الموقعة ستبقى في السجلات للمتطلبات القانونية.
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full py-2 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors">
              طلب حذف الحساب
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">تأكيد حذف الحساب</AlertDialogTitle>
              <AlertDialogDescription>
                اكتب <strong>"حذف حسابي"</strong> أدناه لتأكيد الحذف النهائي
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder='اكتب "حذف حسابي"'
              className="w-full px-3 py-2 rounded-lg border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-destructive/20"
              dir="rtl"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={confirmText !== "حذف حسابي" || deleting}
                className="bg-destructive text-destructive-foreground disabled:opacity-50"
              >
                {deleting ? <Loader2 className="animate-spin" size={14} /> : "حذف نهائي"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

/* ─── Main Security Settings Panel ─── */
const SecuritySettingsPanel = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={18} className="text-primary" />
        <h2 className="text-base font-semibold text-foreground">الأمان والخصوصية</h2>
      </div>

      <div className="bg-card rounded-2xl border border-border/30 p-5 shadow-sm">
        <TwoFactorSection />
      </div>

      <div className="bg-card rounded-2xl border border-border/30 p-5 shadow-sm">
        <SessionLogsSection />
      </div>

      <div className="bg-card rounded-2xl border border-border/30 p-5 shadow-sm">
        <DeleteAccountSection />
      </div>
    </div>
  );
};

export default SecuritySettingsPanel;
