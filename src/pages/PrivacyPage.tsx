import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import logoIcon from "@/assets/logo-icon-gold.png";

const sections = [
  { id: "intro", title: "1. مقدمة" },
  { id: "data-collected", title: "2. البيانات التي نجمعها" },
  { id: "data-usage", title: "3. كيف نستخدم بياناتك" },
  { id: "ai-data", title: "4. الذكاء الاصطناعي والبيانات" },
  { id: "data-protection", title: "5. حماية البيانات" },
  { id: "data-sharing", title: "6. مشاركة البيانات" },
  { id: "rights", title: "7. حقوقك" },
  { id: "cookies", title: "8. ملفات الارتباط" },
  { id: "retention", title: "9. الاحتفاظ بالبيانات" },
  { id: "changes", title: "10. التعديلات" },
  { id: "contact", title: "11. التواصل" },
];

const PrivacyPage = () => {
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

        <h1 className="text-2xl font-bold text-foreground mb-2">سياسة الخصوصية</h1>
        <p className="text-xs text-muted-foreground mb-8">آخر تحديث: مارس 2026</p>

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
          <Section id="intro" title="1. مقدمة">
            نحن في <strong>سوق تقبيل</strong> نلتزم بحماية خصوصيتك وبياناتك الشخصية وفقًا لنظام حماية البيانات الشخصية في المملكة العربية السعودية. توضح هذه السياسة كيفية جمع واستخدام وحماية بياناتك.
          </Section>

          <Section id="data-collected" title="2. البيانات التي نجمعها">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li><strong>بيانات التسجيل:</strong> الاسم، رقم الجوال، البريد الإلكتروني (اختياري).</li>
              <li><strong>بيانات الملف الشخصي:</strong> المدينة، الصورة الشخصية، معلومات التحقق.</li>
              <li><strong>بيانات الإعلانات:</strong> تفاصيل المشاريع، الصور، المستندات المرفوعة.</li>
              <li><strong>بيانات الاستخدام:</strong> سجل التصفح داخل المنصة، التفاعلات، الإجراءات.</li>
              <li><strong>بيانات الصفقات:</strong> تفاصيل التفاوض، الاتفاقيات، سجل المعاملات.</li>
            </ul>
          </Section>

          <Section id="data-usage" title="3. كيف نستخدم بياناتك">
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

          <Section id="ai-data" title="4. الذكاء الاصطناعي والبيانات">
            تستخدم المنصة تقنيات الذكاء الاصطناعي لتحليل البيانات المُدخلة والمستندات والصور. يتم معالجة هذه البيانات لتقديم خدمات ذكية مثل تحليل الصفقات والتقييم والتوصيات. لا يتم مشاركة بياناتك الشخصية مع أطراف خارجية لأغراض تسويقية.
          </Section>

          <Section id="data-protection" title="5. حماية البيانات">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>نستخدم تشفير البيانات أثناء النقل والتخزين.</li>
              <li>الوصول إلى البيانات مقيّد بصلاحيات محددة.</li>
              <li>نُجري مراجعات أمنية دورية.</li>
              <li>نلتزم بأفضل الممارسات الأمنية لحماية بياناتك.</li>
            </ul>
          </Section>

          <Section id="data-sharing" title="6. مشاركة البيانات">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>لا نبيع بياناتك الشخصية لأي طرف ثالث.</li>
              <li>قد نشارك بيانات محدودة مع الطرف الآخر في الصفقة لإتمامها.</li>
              <li>قد نُفصح عن بيانات عند الطلب القانوني من الجهات المختصة.</li>
            </ul>
          </Section>

          <Section id="rights" title="7. حقوقك">
            بموجب نظام حماية البيانات الشخصية السعودي، لديك الحق في:
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>الاطلاع على بياناتك الشخصية المُخزّنة.</li>
              <li>طلب تصحيح البيانات غير الدقيقة.</li>
              <li>طلب حذف بياناتك (مع مراعاة الالتزامات القانونية).</li>
              <li>الاعتراض على معالجة بياناتك لأغراض معينة.</li>
            </ul>
          </Section>

          <Section id="cookies" title="8. ملفات الارتباط (Cookies)">
            قد نستخدم ملفات الارتباط لتحسين تجربة الاستخدام وتحليل أداء المنصة. يمكنك التحكم في إعدادات ملفات الارتباط من خلال متصفحك.
          </Section>

          <Section id="retention" title="9. الاحتفاظ بالبيانات">
            نحتفظ ببياناتك طوال فترة نشاط حسابك وللمدة اللازمة قانونيًا بعد إغلاقه. بيانات الصفقات والاتفاقيات تُحفظ بشكل دائم كسجلات قانونية.
          </Section>

          <Section id="changes" title="10. التعديلات">
            قد نُحدّث هذه السياسة من وقت لآخر. سنُخطرك بأي تغييرات جوهرية عبر إشعارات المنصة.
          </Section>

          <Section id="contact" title="11. التواصل">
            لأي استفسارات حول خصوصية بياناتك، يمكنك التواصل معنا عبر قسم الدعم في المنصة.
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

export default PrivacyPage;
