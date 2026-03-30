import { CheckCircle, Percent, Building2, FileText, ShieldCheck, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { COMMISSION_RATE, BANK_DETAILS } from "@/hooks/useCommissions";
import SarSymbol from "@/components/SarSymbol";
import { useSEO } from "@/hooks/useSEO";

const steps = [
  {
    icon: FileText,
    title: "١. اتفاق الطرفين",
    desc: "يتفق البائع والمشتري على تفاصيل الصفقة عبر المنصة ويوقّعان الاتفاقية الإلكترونية.",
  },
  {
    icon: CheckCircle,
    title: "٢. إتمام الصفقة",
    desc: "بعد توقيع الطرفين، تُعتبر الصفقة مكتملة وتبدأ مرحلة تسوية العمولة.",
  },
  {
    icon: Percent,
    title: "٣. احتساب العمولة",
    desc: `تُحتسب العمولة تلقائياً بنسبة ${COMMISSION_RATE * 100}% من قيمة الصفقة المتفق عليها.`,
  },
  {
    icon: Building2,
    title: "٤. تحويل المبلغ",
    desc: "يقوم البائع بتحويل مبلغ العمولة إلى الحساب البنكي الموضح أدناه.",
  },
  {
    icon: ShieldCheck,
    title: "٥. تأكيد الاستلام",
    desc: "يتم التحقق من الإيصال وتحديث حالة العمولة إلى «تم التحقق».",
  },
];

const faqs = [
  {
    q: "من يدفع العمولة؟",
    a: "البائع هو المسؤول عن دفع عمولة المنصة بعد إتمام الصفقة بنجاح.",
  },
  {
    q: "متى يجب دفع العمولة؟",
    a: "يُفضّل دفع العمولة خلال ٧ أيام من إتمام الصفقة. يتم إرسال تذكيرات ودّية في حال التأخر.",
  },
  {
    q: "ماذا لو لم تتم الصفقة؟",
    a: "لا تُستحق أي عمولة إلا بعد إتمام الصفقة وتوقيع الطرفين على الاتفاقية.",
  },
  {
    q: "هل العمولة تشمل ضريبة القيمة المضافة؟",
    a: "مبلغ العمولة المعروض لا يشمل ضريبة القيمة المضافة. يتحمل البائع أي ضرائب مطبقة حسب الأنظمة.",
  },
  {
    q: "كيف أرفع إثبات الدفع؟",
    a: "من لوحة التحكم الخاصة بك، انتقل إلى قسم العمولات واختر «رفع إيصال» لإرفاق صورة التحويل.",
  },
];

export default function CommissionPage() {
  useSEO({
    title: "كيف تعمل عمولة سوق تقبيل | نموذج التسعير",
    description:
      "تعرّف على نموذج عمولة منصة سوق تقبيل: نسبة 1% فقط من قيمة الصفقة بعد إتمامها بنجاح. بدون رسوم مسبقة أو اشتراكات.",
  });

  const exampleAmount = 500_000;
  const exampleCommission = exampleAmount * COMMISSION_RATE;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-16 md:py-24">
        <div className="container max-w-3xl mx-auto text-center px-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Percent className="w-4 h-4" />
            <span>نموذج تسعير بسيط وشفاف</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            كيف تعمل عمولة سوق تقبيل
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            نسبة <span className="font-bold text-primary">{COMMISSION_RATE * 100}%</span> فقط
            من قيمة الصفقة — تُدفع بعد إتمامها بنجاح. بدون رسوم تسجيل أو اشتراكات شهرية.
          </p>
        </div>
      </section>

      {/* Example calculator */}
      <section className="container max-w-3xl mx-auto px-4 -mt-8 relative z-10">
        <Card className="border-primary/20 shadow-lg">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">مثال توضيحي</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">قيمة الصفقة</p>
                <p className="text-xl font-bold text-foreground">
                  {exampleAmount.toLocaleString("en-US")} <SarSymbol />
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">نسبة العمولة</p>
                <p className="text-xl font-bold text-primary">{COMMISSION_RATE * 100}%</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">مبلغ العمولة</p>
                <p className="text-xl font-bold text-primary">
                  {exampleCommission.toLocaleString("en-US")} <SarSymbol />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Steps */}
      <section className="container max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-10">
          خطوات العمولة
        </h2>
        <div className="space-y-6">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bank details */}
      <section className="container max-w-3xl mx-auto px-4 pb-16">
        <Card>
          <CardContent className="p-6 md:p-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              بيانات الحساب البنكي
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <BankRow label="المستفيد" value={BANK_DETAILS.beneficiary} />
              <BankRow label="البنك" value={BANK_DETAILS.bank} />
              <BankRow label="رقم الحساب" value={BANK_DETAILS.accountNumber} />
              <BankRow label="الآيبان (IBAN)" value={BANK_DETAILS.iban} />
              <BankRow label="الهوية الوطنية" value={BANK_DETAILS.nationalId} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 py-16">
        <div className="container max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8 flex items-center justify-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" />
            أسئلة شائعة
          </h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-md p-3">
      <span className="text-muted-foreground text-xs block mb-0.5">{label}</span>
      <span className="font-medium text-foreground select-all" dir="ltr">
        {value}
      </span>
    </div>
  );
}
