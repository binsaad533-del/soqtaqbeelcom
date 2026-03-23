import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowRight size={14} />
          العودة للرئيسية
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-2">سياسة الخصوصية</h1>
        <p className="text-xs text-muted-foreground mb-8">آخر تحديث: مارس ٢٠٢٦</p>

        <div className="space-y-6 text-sm text-foreground/85 leading-relaxed">
          <Section title="١. مقدمة">
            نحن في <strong>سوق تقبيل</strong> نلتزم بحماية خصوصيتك وبياناتك الشخصية وفقًا لنظام حماية البيانات الشخصية في المملكة العربية السعودية. توضح هذه السياسة كيفية جمع واستخدام وحماية بياناتك.
          </Section>

          <Section title="٢. البيانات التي نجمعها">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li><strong>بيانات التسجيل:</strong> الاسم، رقم الجوال، البريد الإلكتروني (اختياري).</li>
              <li><strong>بيانات الملف الشخصي:</strong> المدينة، الصورة الشخصية، معلومات التحقق.</li>
              <li><strong>بيانات الإعلانات:</strong> تفاصيل المشاريع، الصور، المستندات المرفوعة.</li>
              <li><strong>بيانات الاستخدام:</strong> سجل التصفح داخل المنصة، التفاعلات، الإجراءات.</li>
              <li><strong>بيانات الصفقات:</strong> تفاصيل التفاوض، الاتفاقيات، سجل المعاملات.</li>
            </ul>
          </Section>

          <Section title="٣. كيف نستخدم بياناتك">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>تقديم خدمات المنصة وتحسينها.</li>
              <li>التحقق من الهوية والحسابات.</li>
              <li>تقديم توصيات ذكية عبر الذكاء الاصطناعي.</li>
              <li>تحليل الصفقات وتقديم تقارير الجدوى.</li>
              <li>التواصل معك بشأن حسابك وصفقاتك.</li>
              <li>ضمان أمان المنصة ومنع الاحتيال.</li>
              <li>الامتثال للمتطلبات القانونية والتنظيمية.</li>
            </ul>
          </Section>

          <Section title="٤. الذكاء الاصطناعي والبيانات">
            تستخدم المنصة تقنيات الذكاء الاصطناعي لتحليل البيانات المُدخلة والمستندات والصور. يتم معالجة هذه البيانات لتقديم خدمات ذكية مثل تحليل الصفقات والتقييم والتوصيات. لا يتم مشاركة بياناتك الشخصية مع أطراف خارجية لأغراض تسويقية.
          </Section>

          <Section title="٥. حماية البيانات">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>نستخدم تشفير البيانات أثناء النقل والتخزين.</li>
              <li>الوصول إلى البيانات مقيّد بصلاحيات محددة.</li>
              <li>نُجري مراجعات أمنية دورية.</li>
              <li>نلتزم بأفضل الممارسات الأمنية لحماية بياناتك.</li>
            </ul>
          </Section>

          <Section title="٦. مشاركة البيانات">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>لا نبيع بياناتك الشخصية لأي طرف ثالث.</li>
              <li>قد نشارك بيانات محدودة مع الطرف الآخر في الصفقة لإتمامها.</li>
              <li>قد نُفصح عن بيانات عند الطلب القانوني من الجهات المختصة.</li>
            </ul>
          </Section>

          <Section title="٧. حقوقك">
            بموجب نظام حماية البيانات الشخصية السعودي، لديك الحق في:
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>الاطلاع على بياناتك الشخصية المُخزّنة.</li>
              <li>طلب تصحيح البيانات غير الدقيقة.</li>
              <li>طلب حذف بياناتك (مع مراعاة الالتزامات القانونية).</li>
              <li>الاعتراض على معالجة بياناتك لأغراض معينة.</li>
            </ul>
          </Section>

          <Section title="٨. ملفات الارتباط (Cookies)">
            قد نستخدم ملفات الارتباط لتحسين تجربة الاستخدام وتحليل أداء المنصة. يمكنك التحكم في إعدادات ملفات الارتباط من خلال متصفحك.
          </Section>

          <Section title="٩. الاحتفاظ بالبيانات">
            نحتفظ ببياناتك طوال فترة نشاط حسابك وللمدة اللازمة قانونيًا بعد إغلاقه. بيانات الصفقات والاتفاقيات تُحفظ بشكل دائم كسجلات قانونية.
          </Section>

          <Section title="١٠. التعديلات">
            قد نُحدّث هذه السياسة من وقت لآخر. سنُخطرك بأي تغييرات جوهرية عبر إشعارات المنصة.
          </Section>

          <Section title="١١. التواصل">
            لأي استفسارات حول خصوصية بياناتك، يمكنك التواصل معنا عبر قسم الدعم في المنصة.
          </Section>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h2 className="text-base font-semibold text-foreground mb-2">{title}</h2>
    <div className="text-muted-foreground">{children}</div>
  </div>
);

export default PrivacyPage;
