import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const sections = [
  { id: "intro", title: "١. مقدمة" },
  { id: "definition", title: "٢. تعريف المنصة" },
  { id: "registration", title: "٣. التسجيل والحساب" },
  { id: "content", title: "٤. الإعلانات والمحتوى" },
  { id: "deals", title: "٥. الصفقات والتفاوض" },
  { id: "ai", title: "٦. الذكاء الاصطناعي" },
  { id: "liability", title: "٧. المسؤولية والإخلاء" },
  { id: "ip", title: "٨. الملكية الفكرية" },
  { id: "changes", title: "٩. التعديلات" },
  { id: "law", title: "١٠. القانون المُطبّق" },
  { id: "contact", title: "١١. التواصل" },
];

const TermsPage = () => {
  return (
    <div className="min-h-screen py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowRight size={14} />
          العودة للرئيسية
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-2">الشروط والأحكام</h1>
        <p className="text-xs text-muted-foreground mb-8">آخر تحديث: مارس ٢٠٢٦</p>

        {/* Table of Contents */}
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
          <Section id="intro" title="١. مقدمة">
            مرحبًا بك في منصة <strong>سوق تقبيل</strong>. باستخدامك للمنصة أو التسجيل فيها، فإنك توافق على الالتزام بهذه الشروط والأحكام. يُرجى قراءتها بعناية قبل استخدام أي من خدمات المنصة.
          </Section>

          <Section id="definition" title="٢. تعريف المنصة">
            سوق تقبيل هي منصة إلكترونية وسيطة تتيح للمستخدمين عرض المشاريع التجارية والأصول للبيع أو التقبيل، والتفاوض بين الأطراف، وإتمام الصفقات. المنصة لا تُعد طرفًا في أي صفقة تتم بين المستخدمين.
          </Section>

          <Section id="registration" title="٣. التسجيل والحساب">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>يجب أن تكون المعلومات المقدمة عند التسجيل صحيحة ودقيقة.</li>
              <li>يتحمل المستخدم مسؤولية الحفاظ على سرية بيانات حسابه.</li>
              <li>يحق للمنصة تعليق أو إلغاء أي حساب يُخالف الشروط أو يُقدّم معلومات مضللة.</li>
              <li>يجب أن يكون عمر المستخدم 18 سنة فأكثر.</li>
            </ul>
          </Section>

          <Section id="content" title="٤. الإعلانات والمحتوى">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>يتحمل المُعلن المسؤولية الكاملة عن صحة ودقة المعلومات المنشورة.</li>
              <li>يحق للمنصة مراجعة أو تعديل أو حذف أي إعلان يُخالف السياسات.</li>
              <li>يُمنع نشر محتوى مضلل أو احتيالي أو مخالف للأنظمة السعودية.</li>
              <li>الصور والمستندات المرفوعة يجب أن تكون حقيقية وتعكس الواقع الفعلي.</li>
            </ul>
          </Section>

          <Section id="deals" title="٥. الصفقات والتفاوض">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>المنصة وسيط تقني فقط ولا تتحمل مسؤولية نتائج أي صفقة.</li>
              <li>الاتفاقيات النهائية تكون بين الأطراف مباشرة.</li>
              <li>يُنصح بالتحقق الميداني والقانوني قبل إتمام أي صفقة.</li>
              <li>خدمات الذكاء الاصطناعي استرشادية ولا تُعد استشارة قانونية أو مالية ملزمة.</li>
            </ul>
          </Section>

          <Section id="ai" title="٦. الذكاء الاصطناعي">
            تستخدم المنصة تقنيات الذكاء الاصطناعي لتحليل البيانات وتقديم التوصيات. جميع مخرجات الذكاء الاصطناعي استرشادية وغير ملزمة، ولا تُغني عن الفحص المستقل والاستشارة المتخصصة.
          </Section>

          <Section id="liability" title="٧. المسؤولية والإخلاء">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>المنصة غير مسؤولة عن أي خسائر ناتجة عن صفقات بين المستخدمين.</li>
              <li>المنصة غير مسؤولة عن دقة المعلومات المقدمة من المستخدمين.</li>
              <li>المنصة لا تضمن توفر الخدمة بشكل مستمر دون انقطاع.</li>
            </ul>
          </Section>

          <Section id="ip" title="٨. الملكية الفكرية">
            جميع حقوق الملكية الفكرية للمنصة وتصميمها ومحتواها محفوظة لسوق تقبيل. لا يجوز نسخ أو إعادة إنتاج أي جزء من المنصة دون إذن كتابي مسبق.
          </Section>

          <Section id="changes" title="٩. التعديلات">
            يحق للمنصة تعديل هذه الشروط في أي وقت. سيتم إشعار المستخدمين بالتعديلات الجوهرية، ويُعد استمرار استخدام المنصة موافقة على الشروط المُحدّثة.
          </Section>

          <Section id="law" title="١٠. القانون المُطبّق">
            تخضع هذه الشروط لأنظمة المملكة العربية السعودية، ويختص القضاء السعودي بالنظر في أي نزاع ينشأ عن استخدام المنصة.
          </Section>

          <Section id="contact" title="١١. التواصل">
            لأي استفسارات حول هذه الشروط، يمكنك التواصل معنا عبر قسم الدعم في المنصة.
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
