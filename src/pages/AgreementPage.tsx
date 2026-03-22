import { useParams, Link } from "react-router-dom";
import { Check, Download, ArrowRight, FileText } from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";

const AgreementPage = () => {
  const { id } = useParams();

  return (
    <div className="py-8">
      <div className="container max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to={`/negotiate/${id}`} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowRight size={14} strokeWidth={1.3} />
            العودة للتفاوض
          </Link>
        </div>

        <div className="bg-card rounded-2xl shadow-soft p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <AiStar size={28} />
            <div>
              <h1 className="text-xl font-medium">ملخص الاتفاق</h1>
              <p className="text-xs text-muted-foreground">مطعم شاورما مجهّز بالكامل — حي النسيم، الرياض</p>
            </div>
          </div>

          <div className="space-y-6">
            <Section title="هيكل الصفقة">
              <InfoRow label="نوع التقبّل" value="تقبّل كامل" />
              <InfoRow label="السعر المتفق عليه" value="165,000 ر.س" />
              <InfoRow label="فترة انتقالية" value="شهر واحد مع تدريب" />
            </Section>

            <Section title="الأصول المشمولة">
              <ul className="space-y-1.5">
                {["شواية صناعية (2)", "ثلاجة عرض (3)", "طاولة طعام مع كراسي (8)", "مقلاة صناعية (1)", "جهاز كاشير (1)", "لوحة إعلانية خارجية (1)", "مكيف سبليت (2)"].map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-success/60 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="المستثنى من الصفقة">
              <ul className="space-y-1.5">
                {["المخزون الغذائي الحالي", "حسابات التواصل الاجتماعي"].map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-warning/60 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="تفاصيل الإيجار">
              <InfoRow label="الإيجار السنوي" value="45,000 ر.س" />
              <InfoRow label="المتبقي من العقد" value="1.5 سنة" />
              <InfoRow label="ملاحظة" value="يُنصح بالتفاوض على تجديد العقد" />
            </Section>

            <Section title="الالتزامات المفصح عنها">
              <InfoRow label="التزامات مالية" value="لا توجد" />
              <InfoRow label="رواتب متأخرة" value="لا يوجد" />
              <InfoRow label="إيجار متأخر" value="لا يوجد" />
            </Section>

            <Section title="حالة التراخيص">
              <InfoRow label="رخصة البلدية" value="سارية" />
              <InfoRow label="الدفاع المدني" value="سارية" />
              <InfoRow label="كاميرات المراقبة" value="متوفرة ومطابقة" />
            </Section>

            <Section title="المستندات الداعمة">
              <div className="space-y-1.5">
                {["عقد الإيجار", "السجل التجاري", "رخصة البلدية", "رخصة الدفاع المدني"].map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText size={14} strokeWidth={1.3} />
                    {doc}
                    <span className="text-xs bg-success/10 text-success px-1.5 py-0.5 rounded mr-auto">مرفق</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="ملاحظات مهمة">
              <ul className="space-y-1.5">
                {[
                  "يُنصح بتجديد عقد الإيجار قبل إتمام نقل الملكية",
                  "فواتير شراء المعدات لم تُرفق — يُفضل طلبها",
                  "بعض الأثاث بحالة متوسطة — تم احتسابه في التسعير",
                ].map((note, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                    {note}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <div className="mt-8 pt-6 border-t border-border/30 flex gap-3">
            <Button className="flex-1 gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]">
              <Check size={16} strokeWidth={1.5} />
              تأكيد الاتفاق
            </Button>
            <Button variant="outline" className="rounded-xl active:scale-[0.98]">
              <Download size={16} strokeWidth={1.5} />
              تنزيل
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="font-medium text-sm mb-3">{title}</h3>
    {children}
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm py-1">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

export default AgreementPage;
