import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AiStar from "@/components/AiStar";
import { Send, MessageSquare, Mail, Phone, MapPin, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const categories = [
  "استفسار عام",
  "مشكلة تقنية",
  "شكوى على إعلان",
  "شكوى على صفقة",
  "اقتراح تحسين",
  "طلب دعم",
  "أخرى",
];

const ContactPage = () => {
  const { user, profile } = useAuthContext();
  const [name, setName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [category, setCategory] = useState(categories[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }
    setLoading(true);

    // Store as notification for platform owner to see
    if (user) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: `رسالة دعم: ${category}`,
        body: `${subject}\n\n${message}\n\nمن: ${name} - ${phone || email}`,
        type: "support",
        reference_type: "contact",
      });
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
          <p className="text-sm text-muted-foreground">نحن هنا لمساعدتك. أرسل لنا استفسارك أو شكواك وسنرد عليك بأسرع وقت.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-5 shadow-soft space-y-4">
              <h3 className="text-sm font-medium mb-3">معلومات التواصل</h3>
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-primary mt-0.5 shrink-0" strokeWidth={1.3} />
                <div>
                  <div className="text-xs font-medium">البريد الإلكتروني</div>
                  <div className="text-xs text-muted-foreground">support@souqtaqbeel.app</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={16} className="text-primary mt-0.5 shrink-0" strokeWidth={1.3} />
                <div>
                  <div className="text-xs font-medium">الهاتف</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">+966 XX XXX XXXX</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-primary mt-0.5 shrink-0" strokeWidth={1.3} />
                <div>
                  <div className="text-xs font-medium">الموقع</div>
                  <div className="text-xs text-muted-foreground">المملكة العربية السعودية</div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-soft">
              <h3 className="text-sm font-medium mb-2">ساعات العمل</h3>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>الأحد - الخميس: 9:00 ص - 5:00 م</div>
                <div>الجمعة - السبت: مغلق</div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 shadow-soft space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">الاسم</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none"
                    placeholder="اسمك الكامل"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">رقم الجوال</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none"
                    placeholder="05XXXXXXXX"
                    dir="ltr"
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
                <label className="text-xs font-medium mb-1.5 block">نوع الرسالة</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
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

              <div>
                <label className="text-xs font-medium mb-1.5 block">الرسالة *</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2.5 bg-muted/50 rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none resize-none"
                  placeholder="اكتب رسالتك بالتفصيل..."
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
                    إرسال الرسالة
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
