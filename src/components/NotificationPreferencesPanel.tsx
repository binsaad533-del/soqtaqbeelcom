import { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, Mail, Phone, Shield, Loader2, MessageSquare, Megaphone, Handshake, Tag } from "lucide-react";

type Prefs = {
  deals_sms: boolean;
  deals_email: boolean;
  offers_sms: boolean;
  offers_email: boolean;
  messages_sms: boolean;
  messages_email: boolean;
  marketing_sms: boolean;
  marketing_email: boolean;
};

const DEFAULT_PREFS: Prefs = {
  deals_sms: true,
  deals_email: true,
  offers_sms: true,
  offers_email: true,
  messages_sms: false,
  messages_email: true,
  marketing_sms: false,
  marketing_email: true,
};

const MANDATORY_NOTIFICATIONS = [
  { label: "تغيير حالة الصفقة", desc: "عند تأكيد أو إلغاء أو إنهاء الصفقة", icon: Shield },
  { label: "التأكيد القانوني", desc: "طلبات التوقيع والتأكيد على الاتفاقيات", icon: Shield },
  { label: "التنبيهات الأمنية", desc: "محاولات دخول مشبوهة أو تغييرات حساسة", icon: Shield },
  { label: "التحقق من الحساب", desc: "رموز التحقق OTP وتأكيد البريد", icon: Shield },
];

const OPTIONAL_CATEGORIES = [
  {
    key: "deals",
    label: "تحديثات الصفقات",
    desc: "إشعارات عن تقدم الصفقات والمراحل الجديدة",
    icon: Handshake,
  },
  {
    key: "offers",
    label: "العروض والطلبات",
    desc: "عروض شراء جديدة على إعلاناتك أو ردود على عروضك",
    icon: Tag,
  },
  {
    key: "messages",
    label: "رسائل التفاوض",
    desc: "رسائل جديدة في محادثات التفاوض",
    icon: MessageSquare,
  },
  {
    key: "marketing",
    label: "الأخبار والعروض",
    desc: "نصائح، مقالات جديدة، وعروض خاصة من المنصة",
    icon: Megaphone,
  },
];

const NotificationPreferencesPanel = () => {
  const { user } = useAuthContext();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPrefs({
          deals_sms: data.deals_sms,
          deals_email: data.deals_email,
          offers_sms: data.offers_sms,
          offers_email: data.offers_email,
          messages_sms: data.messages_sms,
          messages_email: data.messages_email,
          marketing_sms: data.marketing_sms,
          marketing_email: data.marketing_email,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const updatePref = async (key: keyof Prefs, value: boolean) => {
    if (!user) return;
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    setSaving(true);

    try {
      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("notification_preferences")
          .update({ [key]: value })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id, ...newPrefs });
        if (error) throw error;
      }
      toast.success("تم تحديث تفضيلات الإشعارات");
    } catch (e: any) {
      setPrefs(prefs); // rollback
      toast.error("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Bell size={16} className="text-primary" />
        <h3 className="text-sm font-semibold">تفضيلات الإشعارات</h3>
        {saving && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
      </div>

      {/* Mandatory notifications */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Shield size={13} className="text-destructive" />
          <h4 className="text-xs font-medium text-foreground">إشعارات إلزامية</h4>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">لا يمكن إيقافها</span>
        </div>
        <div className="space-y-2">
          {MANDATORY_NOTIFICATIONS.map((n, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-destructive/5 flex items-center justify-center">
                  <n.icon size={14} className="text-destructive/60" />
                </div>
                <div>
                  <p className="text-xs font-medium">{n.label}</p>
                  <p className="text-[10px] text-muted-foreground">{n.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 opacity-50">
                  <Mail size={11} className="text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">✓</span>
                </div>
                <div className="flex items-center gap-1 opacity-50">
                  <Phone size={11} className="text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">✓</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional notifications */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Bell size={13} className="text-primary" />
          <h4 className="text-xs font-medium text-foreground">إشعارات اختيارية</h4>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">قابلة للتخصيص</span>
        </div>

        {/* Column headers */}
        <div className="flex items-center justify-end gap-6 mb-2 pe-3">
          <div className="flex items-center gap-1">
            <Mail size={11} className="text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">إيميل</span>
          </div>
          <div className="flex items-center gap-1">
            <Phone size={11} className="text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">SMS</span>
          </div>
        </div>

        <div className="space-y-2">
          {OPTIONAL_CATEGORIES.map((cat) => {
            const emailKey = `${cat.key}_email` as keyof Prefs;
            const smsKey = `${cat.key}_sms` as keyof Prefs;
            return (
              <div key={cat.key} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                    <cat.icon size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{cat.label}</p>
                    <p className="text-[10px] text-muted-foreground">{cat.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <Switch
                    checked={prefs[emailKey]}
                    onCheckedChange={(v) => updatePref(emailKey, v)}
                    className="scale-75"
                  />
                  <Switch
                    checked={prefs[smsKey]}
                    onCheckedChange={(v) => updatePref(smsKey, v)}
                    className="scale-75"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        الإشعارات الإلزامية تضمن سلامة حسابك وصفقاتك ولا يمكن إيقافها.
        <br />
        يمكنك تغيير تفضيلاتك في أي وقت.
      </p>
    </div>
  );
};

export default NotificationPreferencesPanel;
