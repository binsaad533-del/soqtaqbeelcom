import { useState, useRef } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Save, Eye, EyeOff, User, Phone, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import PhoneVerificationFlow from "@/components/PhoneVerificationFlow";

const AccountSettingsPanel = () => {
  const { profile, user } = useAuthContext();

  /* ── Profile info state ── */
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [emailPendingConfirmation, setEmailPendingConfirmation] = useState(false);
  const emailChanged = email.trim() !== (user?.email || "").trim() && email.trim().length > 0;

  /* ── Phone verification state ── */
  const originalPhone = profile?.phone || "";
  const phoneChanged = phone.trim() !== originalPhone.trim() && phone.trim().length > 0;
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  /* ── Password state ── */
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  /* ── Avatar state ── */
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Save profile info ── */
  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    // If phone changed but not verified, prompt verification
    if (phoneChanged && !phoneVerified) {
      setShowPhoneVerification(true);
      toast.error("يجب التحقق من رقم الجوال الجديد قبل الحفظ");
      return;
    }

    setSavingProfile(true);
    try {
      const updateData: Record<string, any> = { full_name: fullName.trim() };

      // Only update phone if changed and verified
      if (phoneChanged && phoneVerified) {
        updateData.phone = phone.trim();
        updateData.phone_verified = true;
        updateData.phone_verified_at = new Date().toISOString();
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (email.trim() !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailError) throw emailError;
        setEmailPendingConfirmation(true);
        toast.success("تم إرسال رابط تأكيد إلى بريدك الجديد — يرجى التحقق من صندوق الوارد");
      }

      // Reset verification state
      setPhoneVerified(false);
      setShowPhoneVerification(false);
      toast.success("تم تحديث المعلومات الشخصية");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء التحديث");
    } finally {
      setSavingProfile(false);
    }
  };

  /* ── Phone verified callback ── */
  const handlePhoneVerified = () => {
    setPhoneVerified(true);
    setShowPhoneVerification(false);
    toast.success("تم التحقق من الرقم — يمكنك الآن حفظ التغييرات");
  };

  /* ── Change password ── */
  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("تم تغيير كلمة المرور بنجاح");
    } catch (err: any) {
      toast.error(err.message || "فشل تغيير كلمة المرور");
    } finally {
      setSavingPassword(false);
    }
  };

  /* ── Upload avatar ── */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار صورة صالحة");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن لا يتجاوز 2 ميغابايت");
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("listings")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("listings").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast.success("تم تحديث الصورة الشخصية");
    } catch (err: any) {
      toast.error(err.message || "فشل رفع الصورة");
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Reset verification when phone input changes
  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setPhoneVerified(false);
    setShowPhoneVerification(false);
  };

  const initials = (profile?.full_name || "U").slice(0, 2);

  return (
    <div className="space-y-6">
      {/* ── Avatar section ── */}
      <div className="rounded-xl border border-border/40 bg-card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Camera size={15} className="text-muted-foreground" />
          الصورة الشخصية
        </h3>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar className="h-16 w-16 border-2 border-border/30">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {uploadingAvatar ? (
                <Loader2 size={18} className="text-white animate-spin" />
              ) : (
                <Camera size={18} className="text-white" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="text-sm font-medium">{profile?.full_name || "المستخدم"}</p>
            <p className="text-[11px] text-muted-foreground">اضغط على الصورة لتغييرها (حد أقصى 2MB)</p>
          </div>
        </div>
      </div>

      {/* ── Personal info ── */}
      <div className="rounded-xl border border-border/40 bg-card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <User size={15} className="text-muted-foreground" />
          المعلومات الشخصية
        </h3>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">الاسم الكامل</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">البريد الإلكتروني</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} className="text-sm" dir="ltr" type="email" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-2">
              <Phone size={12} />
              رقم الجوال
              {phoneChanged && phoneVerified && (
                <span className="flex items-center gap-1 text-[10px] text-success">
                  <CheckCircle size={10} />
                  تم التحقق
                </span>
              )}
              {phoneChanged && !phoneVerified && (
                <span className="text-[10px] text-warning">يتطلب التحقق</span>
              )}
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                value={phone}
                onChange={e => handlePhoneChange(e.target.value)}
                className="text-sm flex-1"
                dir="ltr"
                placeholder="+966..."
              />
              {phoneChanged && !phoneVerified && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px] shrink-0 gap-1"
                  onClick={() => setShowPhoneVerification(true)}
                >
                  <Phone size={12} />
                  تحقق
                </Button>
              )}
            </div>
          </div>

          {/* ── Inline phone verification ── */}
          {showPhoneVerification && phoneChanged && !phoneVerified && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground mb-3">أدخل رقم الجوال الجديد وسنرسل لك رمز تحقق:</p>
              <PhoneVerificationFlow
                initialPhone={phone}
                mode="inline"
                onVerified={handlePhoneVerified}
              />
            </div>
          )}

          <Button size="sm" className="text-xs gap-1.5" onClick={handleSaveProfile} disabled={savingProfile || (phoneChanged && !phoneVerified)}>
            {savingProfile ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            حفظ التغييرات
          </Button>
          {phoneChanged && !phoneVerified && (
            <p className="text-[10px] text-muted-foreground">⚠️ يجب التحقق من الرقم الجديد قبل الحفظ</p>
          )}
        </div>
      </div>

      {/* ── Password change ── */}
      <div className="rounded-xl border border-border/40 bg-card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Eye size={15} className="text-muted-foreground" />
          تغيير كلمة المرور
        </h3>
        <div className="space-y-4">
          <div className="relative">
            <Label className="text-xs text-muted-foreground mb-1.5 block">كلمة المرور الجديدة</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="text-sm pe-10"
              dir="ltr"
              placeholder="8 أحرف على الأقل"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-[30px] text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">تأكيد كلمة المرور</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="text-sm"
              dir="ltr"
              placeholder="أعد كتابة كلمة المرور"
            />
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[11px] text-destructive">كلمتا المرور غير متطابقتين</p>
          )}
          <Button
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword || !confirmPassword}
          >
            {savingPassword ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            تغيير كلمة المرور
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPanel;
