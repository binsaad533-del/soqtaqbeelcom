import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import logoIcon from "@/assets/logo-icon-gold.png";
import { useSEO } from "@/hooks/useSEO";

const sections = [
  { id: "intro", title: "1. مقدمة" },
  { id: "definition", title: "2. تعريف المنصة" },
  { id: "registration", title: "3. التسجيل والحساب" },
  { id: "content", title: "4. الإعلانات والمحتوى" },
  { id: "deals", title: "5. الصفقات والتفاوض" },
  { id: "commission", title: "6. العمولات والرسوم" },
  { id: "ai", title: "7. الذكاء الاصطناعي" },
  { id: "liability", title: "8. المسؤولية والإخلاء" },
  { id: "ip", title: "9. الملكية الفكرية" },
  { id: "suspension", title: "10. التعليق والإنهاء" },
  { id: "ecommerce", title: "11. التجارة الإلكترونية" },
  { id: "dispute", title: "12. حل النزاعات" },
  { id: "changes", title: "13. التعديلات" },
  { id: "law", title: "14. القانون المُطبّق" },
  { id: "contact", title: "15. التواصل" },
];

const TermsPage = () => {
  useSEO({ title: "الشروط والأحكام — سوق تقبيل", description: "شروط وأحكام استخدام منصة سوق تقبيل — متوافقة مع أنظمة المملكة العربية السعودية ونظام التجارة الإلكترونية", canonical: "/terms" });
  return (
    <div className="min-h-screen py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowRight size={14} />
          العودة للرئيسية
        </Link>

        <div className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-soft animate-fade-in">
          <img src={logoIcon} alt="سوق تقبيل" className="w-[4.5rem] h-[4.5rem] object-contain" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">الشروط والأحكام</h1>
        <p className="text-xs text-muted-foreground mb-2">آخر تحديث: مارس 2026</p>
        <p className="text-xs text-muted-foreground mb-8 bg-primary/5 px-3 py-1.5 rounded-lg inline-block">
          شركة عين جساس — سجل تجاري: 7017628152
        </p>

        <nav className="mb-10 p-4 rounded-xl bg-card border border-border/30">
          <p className="text-sm font-semibold text-foreground mb-3">المحتويات</p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {sections.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6 text-sm text-foreground/85 leading-relaxed">
          <Section id="intro" title="1. مقدمة">
            مرحبًا بك في منصة <strong>سوق تقبيل</strong> (المملوكة لشركة عين جساس، سجل تجاري رقم: 7017628152). باستخدامك للمنصة أو التسجيل فيها، فإنك توافق على الالتزام بهذه الشروط والأحكام. يُرجى قراءتها بعناية قبل استخدام أي من خدمات المنصة. تخضع هذه الشروط لأنظمة المملكة العربية السعودية بما فيها نظام التجارة الإلكترونية ونظام حماية البيانات الشخصية.
          </Section>

          <Section id="definition" title="2. تعريف المنصة">
            سوق تقبيل هي منصة إلكترونية وسيطة مرخصة تتيح للمستخدمين عرض المشاريع التجارية والأصول للبيع أو التقبيل، والتفاوض بين الأطراف، وإتمام الصفقات. المنصة <strong>لا تُعد طرفاً</strong> في أي صفقة تتم بين المستخدمين، وإنما تقدم أدوات تقنية لتسهيل التواصل والتفاوض.
          </Section>

          <Section id="registration" title="3. التسجيل والحساب">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>يجب أن يكون عمر المستخدم <strong>18 سنة فأكثر</strong>.</li>
              <li>يجب تقديم معلومات صحيحة ودقيقة عند التسجيل والتحقق منها عبر رقم الجوال.</li>
              <li>يتحمل المستخدم المسؤولية الكاملة عن أمان حسابه وكلمة المرور.</li>
              <li>يحق للمنصة تعليق أو إلغاء أي حساب يُخالف الشروط أو يُقدّم معلومات مضللة.</li>
              <li>يُمنع إنشاء أكثر من حساب واحد لنفس الشخص.</li>
            </ul>
          </Section>

          <Section id="content" title="4. الإعلانات والمحتوى">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>يتحمل المُعلن <strong>المسؤولية الكاملة</strong> عن صحة ودقة المعلومات المنشورة.</li>
              <li>يحق للمنصة مراجعة أو تعديل أو حذف أي إعلان يُخالف السياسات دون إشعار مسبق.</li>
              <li>يُمنع نشر محتوى مضلل أو احتيالي أو مخالف للأنظمة السعودية.</li>
              <li>الصور والمستندات المرفوعة يجب أن تكون حقيقية وتعكس الواقع الفعلي.</li>
              <li>يُمنع نشر إعلانات لأنشطة محظورة أو غير مرخصة في المملكة.</li>
              <li>تحتفظ المنصة بحق إزالة أي محتوى يتعارض مع الآداب العامة أو الأنظمة.</li>
            </ul>
          </Section>

          <Section id="deals" title="5. الصفقات والتفاوض">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>المنصة <strong>وسيط تقني فقط</strong> ولا تتحمل مسؤولية نتائج أي صفقة.</li>
              <li>الاتفاقيات النهائية تكون بين الأطراف مباشرة وتخضع للقوانين السعودية.</li>
              <li>يُنصح بشدة بالتحقق الميداني والقانوني قبل إتمام أي صفقة.</li>
              <li>يجب إتمام جميع التواصلات عبر المنصة — <strong>يُمنع التواصل الخارجي</strong> قبل إتمام الصفقة.</li>
              <li>يلتزم الطرفان بحسن النية والشفافية في التفاوض.</li>
            </ul>
          </Section>

          <Section id="commission" title="6. العمولات والرسوم">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>تستحق المنصة عمولة بنسبة <strong>1%</strong> من قيمة الصفقة المتفق عليها عند إتمامها.</li>
              <li>يتحمل البائع دفع العمولة خلال المدة المحددة بعد إتمام الصفقة.</li>
              <li>التأخر في سداد العمولة يؤثر على نقاط الثقة وظهور الإعلانات.</li>
              <li>جميع الرسوم تشمل ضريبة القيمة المضافة (15%) وفقاً لأنظمة هيئة الزكاة والضريبة والجمارك.</li>
            </ul>
          </Section>

          <Section id="ai" title="7. الذكاء الاصطناعي">
            <p className="mb-2">تستخدم المنصة تقنيات الذكاء الاصطناعي لتحليل البيانات وتقديم التوصيات:</p>
            <ul className="list-disc pr-5 space-y-1">
              <li>جميع مخرجات الذكاء الاصطناعي <strong>استرشادية وغير ملزمة</strong>.</li>
              <li>لا تُغني عن الفحص المستقل والاستشارة القانونية والمالية المتخصصة.</li>
              <li>لا يتم اتخاذ قرارات آلية تؤثر على حقوق المستخدمين.</li>
            </ul>
          </Section>

          <Section id="liability" title="8. المسؤولية والإخلاء">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>المنصة غير مسؤولة عن أي خسائر ناتجة عن صفقات بين المستخدمين.</li>
              <li>المنصة غير مسؤولة عن دقة المعلومات المقدمة من المستخدمين.</li>
              <li>المنصة لا تضمن توفر الخدمة بشكل مستمر دون انقطاع.</li>
              <li>في جميع الأحوال، لا تتجاوز مسؤولية المنصة قيمة العمولة المدفوعة.</li>
            </ul>
          </Section>

          <Section id="ip" title="9. الملكية الفكرية">
            جميع حقوق الملكية الفكرية للمنصة وتصميمها ومحتواها وشعارها وعلامتها التجارية محفوظة لشركة عين جساس. لا يجوز نسخ أو إعادة إنتاج أو استخدام أي جزء من المنصة دون إذن كتابي مسبق.
          </Section>

          <Section id="suspension" title="10. التعليق والإنهاء">
            <p className="mb-2">يحق للمنصة تعليق أو إنهاء حساب المستخدم في الحالات التالية:</p>
            <ul className="list-disc pr-5 space-y-1">
              <li>مخالفة هذه الشروط والأحكام أو سياسات المنصة.</li>
              <li>تقديم معلومات مضللة أو مزورة.</li>
              <li>الاحتيال أو محاولة الاحتيال على مستخدمين آخرين.</li>
              <li>عدم سداد العمولات المستحقة.</li>
              <li>أي سلوك يضر بسمعة المنصة أو مستخدميها.</li>
            </ul>
          </Section>

          <Section id="ecommerce" title="11. التجارة الإلكترونية">
            <p>وفقاً لنظام التجارة الإلكترونية السعودي:</p>
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>المنصة مُسجلة ومرخصة وفقاً للأنظمة المعمول بها.</li>
              <li>يتم عرض جميع الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة.</li>
              <li>يحق للمستخدم الاطلاع على جميع شروط الخدمة قبل إتمام أي معاملة.</li>
              <li>يتم الاحتفاظ بسجلات المعاملات وفقاً للمدد النظامية.</li>
            </ul>
          </Section>

          <Section id="dispute" title="12. حل النزاعات">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>يُفضّل حل النزاعات ودياً من خلال قنوات التواصل في المنصة.</li>
              <li>في حال عدم التوصل لحل ودي، تختص المحاكم المختصة في <strong>محافظة الطائف</strong> بالنظر في النزاع.</li>
              <li>يمكن تقديم شكوى عبر منصة وزارة التجارة أو مركز بلاغات المستهلك.</li>
            </ul>
          </Section>

          <Section id="changes" title="13. التعديلات">
            يحق للمنصة تعديل هذه الشروط في أي وقت. سيتم إشعار المستخدمين بالتعديلات الجوهرية قبل 30 يوماً من سريانها. استمرار استخدام المنصة بعد التعديل يُعد موافقة على الشروط المُحدّثة.
          </Section>

          <Section id="law" title="14. القانون المُطبّق">
            تخضع هذه الشروط لأنظمة المملكة العربية السعودية، بما فيها نظام التجارة الإلكترونية ونظام مكافحة الاحتيال المالي وخيانة الأمانة ونظام حماية البيانات الشخصية. تختص المحاكم المختصة في <strong>محافظة الطائف</strong> بالنظر في أي نزاع ينشأ عن استخدام المنصة.
          </Section>

          <Section id="contact" title="15. التواصل">
            <p>لأي استفسارات حول هذه الشروط:</p>
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li><strong>البريد الإلكتروني:</strong> a.almalki@soqtaqbeel.com</li>
              <li><strong>الهاتف:</strong> 0500668089</li>
              <li><strong>ساعات العمل:</strong> السبت — الخميس، 9 صباحاً — 5 مساءً</li>
              <li><strong>العنوان:</strong> الطائف، المملكة العربية السعودية</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
};

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <div id={id} className="scroll-mt-20">
    <h2 className="text-base font-semibold text-foreground mb-2">{title}</h2>
    <div className="text-muted-foreground">{children}</div>
  </div>
);

export default TermsPage;
