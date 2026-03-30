import { CheckCircle, Percent, Building2, FileText, ShieldCheck, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { COMMISSION_TIERS, BANK_DETAILS, getCommissionRate, calculateCommission } from "@/hooks/useCommissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SarSymbol from "@/components/SarSymbol";
import { useSEO } from "@/hooks/useSEO";
import { useState } from "react";

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
    desc: "تُحتسب العمولة تلقائياً حسب شريحة قيمة الصفقة المتفق عليها (من 2.5% إلى 5%).",
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

  const [calcAmount, setCalcAmount] = useState(500_000);
  const calcRate = getCommissionRate(calcAmount);
  const calcCommission = calculateCommission(calcAmount);

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
            عمولة تتناسب مع حجم صفقتك — كلما زادت القيمة، انخفضت النسبة. تُدفع بعد إتمام الصفقة فقط. بدون رسوم تسجيل أو اشتراكات.
          </p>
        </div>
      </section>

      {/* Tiers table */}
      <section className="container max-w-3xl mx-auto px-4 -mt-8 relative z-10">
        <Card className="border-primary/20 shadow-lg">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-lg font-semibold text-foreground mb-2">جدول نسب العمولة</h2>
            <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              العمولة تُخصم فقط عند إتمام الصفقة بنجاح — لا رسوم على التصفح أو التفاوض أو الإعلان.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">قيمة الصفقة</TableHead>
                  <TableHead className="text-center">نسبة العمولة</TableHead>
                  <TableHead className="text-center">مثال</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMMISSION_TIERS.map((tier, i) => {
                  const example = tier.max === Infinity ? 2_000_000 : Math.round((tier.min + Math.min(tier.max, tier.min + 100_000)) / 2);
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{tier.label}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{tier.rate * 100}%</TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {Math.round(example * tier.rate).toLocaleString("en-US")} <SarSymbol />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Interactive calculator */}
      <section className="container max-w-3xl mx-auto px-4 py-10">
        <Card>
          <CardContent className="p-6 md:p-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">حاسبة العمولة</h2>
            <div className="mb-4">
              <label className="text-sm text-muted-foreground mb-1 block">أدخل قيمة الصفقة (ريال)</label>
              <input
                type="number"
                min={0}
                value={calcAmount}
                onChange={(e) => setCalcAmount(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground text-lg"
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">قيمة الصفقة</p>
                <p className="text-xl font-bold text-foreground">
                  {calcAmount.toLocaleString("en-US")} <SarSymbol />
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">نسبة العمولة</p>
                <p className="text-xl font-bold text-primary">{calcRate * 100}%</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">مبلغ العمولة</p>
                <p className="text-xl font-bold text-primary">
                  {calcCommission.toLocaleString("en-US")} <SarSymbol />
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
