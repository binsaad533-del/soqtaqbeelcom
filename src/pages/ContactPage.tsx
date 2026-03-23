import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AiStar from "@/components/AiStar";
import SocialIcons from "@/components/SocialIcons";
import { Send, Mail, Phone, MapPin, CheckCircle, Briefcase, AlertTriangle, Handshake } from "lucide-react";
import { toast } from "sonner";

const ContactPage = () => {
  const { user, profile } = useAuthContext();
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !subject.trim()) {
      toast.error("الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }
    setLoading(true);

    // Create CRM lead
    const { error } = await supabase.from("crm_leads").insert({
      full_name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      subject: subject.trim(),
      source: "contact_form",
      status: "new",
    } as any);

    if (error) {
      toast.error("حدث خطأ أثناء الإرسال، حاول مرة أخرى");
      setLoading(false);
      return;
    }

    // Notify platform owner and supervisors
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["platform_owner", "supervisor"]);

    if (adminRoles) {
      const notifications = adminRoles.map((r: any) => ({
        user_id: r.user_id,
        title: "عميل محتمل جديد",
        body: `${name} — ${subject}`,
        type: "crm_lead",
        reference_type: "crm",
      }));
      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }
    }

    setLoading(false);
    setSent(true);
    toast.success("تم إرسال رسالتك بنجاح");
  };

  if (sent) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-success" strokeWidth={1.3} />
          </div>
          <h2 className="text-xl font-medium mb-2">تم إرسال رسالتك بنجاح</h2>
          <p className="text-sm text-muted-foreground mb-6">سنتواصل معك في أقرب وقت ممكن. شكراً لتواصلك معنا.</p>
          <Link to="/" className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4">
      <div className="container max-w-4xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-3">
            <AiStar size={32} />
          </div>
          <h1 className="text-2xl font-medium mb-2">تواصل معنا</h1>
          <p className="text-sm text-muted-foreground">نحن هنا لمساعدتك. اختر طريقة التواصل المناسبة لك.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Info + Emails */}
          <div className="space-y-4">
            {/* Direct Emails by Context */}
            <div className="bg-card rounded-2xl p-5 shadow-soft space-y-3">
              <h3 className="text-sm font-medium mb-2">تواصل عبر البريد مباشرة</h3>
              
              <div className="flex items-start gap-3">
                <Mail size={14} className="text-primary mt-0.5 shrink-0" strokeWidth={1.3} />
                <div>
                  <div className="text-[11px] font-medium">الدعم والمساعدة</div>
                  <a href="mailto:support@soqtaqbeel.com" className="text-[11px] text-muted-foreground hover:text-primary transition-colors" dir="ltr">support@soqtaqbeel.com</a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail size={14} className="text-primary mt-0.5 shrink-0" strokeWidth={1.3} />
                <div>
                  <div className="text-[11px] font-medium">استفسارات عامة</div>
                  <a href="mailto:info@soqtaqbeel.com" className="text-[11px] text-muted-foreground hover:text-primary transition-colors" dir="ltr">info@soqtaqbeel.com</a>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-soft space-y-3">
              <h3 className="text-sm font-medium mb-2">معلومات إضافية</h3>
              <div className="flex items-start gap-3">
                <MapPin size={14} className="text-primary mt-0.5 shrink-0" strokeWidth={1.3} />
                <div>
                  <div className="text-[11px] font-medium">الموقع</div>
                  <div className="text-[11px] text-muted-foreground">المملكة العربية السعودية</div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-soft">
              <h3 className="text-sm font-medium mb-2">ساعات العمل</h3>
              <div className="text-[11px] text-muted-foreground space-y-1">
                <div>الأحد - الخميس: 9:00 ص - 5:00 م</div>
                <div>الجمعة - السبت: مغلق</div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-soft">
              <h3 className="text-sm font-medium mb-3">تابعنا</h3>
              <SocialIcons size="md" />
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 shadow-soft space-y-4">
              <h3 className="text-sm font-medium">نموذج التواصل السريع</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">الاسم الكامل *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none"
                    placeholder="اسمك الكامل"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">رقم الجوال *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none"
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none"
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">الموضوع *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none"
                  placeholder="موضوع رسالتك"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-primary-foreground gradient-primary transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={14} strokeWidth={1.3} />
                    إرسال
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
