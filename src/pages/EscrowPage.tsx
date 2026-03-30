import { Shield, Lock, CheckCircle, ArrowDown, FileText, Banknote, AlertTriangle, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/hooks/useSEO";

const steps = [
  {
    icon: FileText,
    title: "١. إنشاء الصفقة",
    desc: "يتفق البائع والمشتري على تفاصيل الصفقة عبر المنصة ويتم توثيق جميع الشروط.",
  },
  {
    icon: Lock,
    title: "٢. تأمين المبلغ",
    desc: "يتم تجميد مبلغ الصفقة في حساب ضمان المنصة حتى اكتمال جميع الشروط.",
  },
  {
    icon: CheckCircle,
    title: "٣. التحقق والتنفيذ",
    desc: "يتم التحقق من استيفاء جميع شروط الصفقة ونقل الملكية أو تسليم النشاط.",
  },
  {
    icon: Banknote,
    title: "٤. تحرير المبلغ",
    desc: "بعد تأكيد الطرفين على إتمام الصفقة بنجاح، يُحرَّر المبلغ للبائع.",
  },
];

const guarantees = [
  { icon: Shield, title: "حماية المشتري", desc: "لا يُحرَّر المبلغ حتى تأكيد استلام النشاط بالكامل." },
  { icon: Lock, title: "حماية البائع", desc: "المبلغ مؤمّن ومضمون — لا يمكن للمشتري التراجع بعد التأكيد." },
  { icon: AlertTriangle, title: "حل النزاعات", desc: "في حال وجود خلاف، يتدخل فريق المنصة للوساطة وحل النزاع بعدالة." },
];

const faqs = [
  { q: "هل يمكنني استرداد المبلغ إذا لم تكتمل الصفقة؟", a: "نعم، إذا لم يتم استيفاء شروط الصفقة يُعاد المبلغ كاملاً للمشتري." },
  { q: "كم يستغرق تحرير المبلغ بعد إتمام الصفقة؟", a: "يتم تحرير المبلغ خلال ١-٣ أيام عمل بعد تأكيد الطرفين." },
  { q: "هل هناك رسوم إضافية على نظام الضمان؟", a: "لا توجد رسوم إضافية — خدمة الضمان مشمولة ضمن عمولة المنصة." },
  { q: "ماذا يحدث في حال نزاع بين الطرفين؟", a: "يتدخل فريق المنصة المتخصص لمراجعة الأدلة والوساطة للوصول لحل عادل." },
];

export default function EscrowPage() {
  useSEO({
    title: "نظام ضمان الصفقات | سوق تقبيل",
    description: "تعرّف على نظام ضمان الصفقات في سوق تقبيل — حماية كاملة للبائع والمشتري حتى إتمام الصفقة بنجاح.",
    canonical: "/escrow",
  });

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Hero */}
      <section className="relative py-16 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">نظام ضمان الصفقات</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            نحمي أموالك حتى تتأكد من إتمام الصفقة بنجاح — لا يُحرَّر المبلغ إلا بموافقة الطرفين.
          </p>
          <Badge variant="secondary" className="text-sm px-4 py-1">
            خدمة مجانية مشمولة مع كل صفقة
          </Badge>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-3xl mx-auto px-4 pb-12 space-y-4">
        <h2 className="text-xl font-bold text-foreground text-center mb-6">كيف يعمل نظام الضمان؟</h2>
        {steps.map((step, i) => (
          <div key={i}>
            <Card className="border-border/60">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </CardContent>
            </Card>
            {i < steps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="w-4 h-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Guarantees */}
      <section className="max-w-3xl mx-auto px-4 pb-12">
        <h2 className="text-xl font-bold text-foreground text-center mb-6">ماذا يضمن لك النظام؟</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {guarantees.map((g, i) => (
            <Card key={i} className="border-border/60 text-center">
              <CardContent className="p-5 space-y-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mx-auto">
                  <g.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{g.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{g.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-12">
        <h2 className="text-xl font-bold text-foreground text-center mb-6">أسئلة شائعة</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm mb-1">{faq.q}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-16 text-center">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-8 space-y-4">
            <h2 className="text-lg font-bold text-foreground">جاهز لبدء صفقة آمنة؟</h2>
            <p className="text-sm text-muted-foreground">تصفّح الفرص المتاحة أو أضف فرصتك الآن — كل صفقة محمية تلقائياً.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/marketplace">تصفّح الفرص</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/create-listing">أضف فرصة</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
