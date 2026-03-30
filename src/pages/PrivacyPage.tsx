import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import logoIcon from "@/assets/logo-icon-gold.png";
import { useSEO } from "@/hooks/useSEO";

const sections = [
  { id: "intro", title: "1. مقدمة" },
  { id: "pdpl", title: "2. الإطار القانوني (PDPL)" },
  { id: "data-collected", title: "3. البيانات التي نجمعها" },
  { id: "legal-basis", title: "4. الأساس القانوني للمعالجة" },
  { id: "data-usage", title: "5. كيف نستخدم بياناتك" },
  { id: "ai-data", title: "6. الذكاء الاصطناعي والبيانات" },
  { id: "data-protection", title: "7. حماية البيانات" },
  { id: "data-sharing", title: "8. مشاركة البيانات" },
  { id: "cross-border", title: "9. نقل البيانات عبر الحدود" },
  { id: "rights", title: "10. حقوقك بموجب PDPL" },
  { id: "cookies", title: "11. ملفات الارتباط" },
  { id: "retention", title: "12. الاحتفاظ بالبيانات" },
  { id: "children", title: "13. بيانات الأطفال" },
  { id: "breach", title: "14. إخطار الاختراق" },
  { id: "changes", title: "15. التعديلات" },
  { id: "contact", title: "16. التواصل" },
];

const PrivacyPage = () => {
  useSEO({ title: "سياسة الخصوصية", description: "سياسة الخصوصية وحماية البيانات في منصة سوق تقبيل — متوافقة مع نظام حماية البيانات الشخصية (PDPL)", canonical: "/privacy" });
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

        <h1 className="text-2xl font-bold text-foreground mb-2">سياسة الخصوصية وحماية البيانات الشخصية</h1>
        <p className="text-xs text-muted-foreground mb-2">آخر تحديث: مارس 2026</p>
        <p className="text-xs text-muted-foreground mb-8 bg-primary/5 px-3 py-1.5 rounded-lg inline-block">
          متوافقة مع نظام حماية البيانات الشخصية (PDPL) — المملكة العربية السعودية
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
            نحن في <strong>سوق تقبيل</strong> (المملوكة لشركة عين جساس، سجل تجاري رقم: 7017628152، المقر: الطائف، المملكة العربية السعودية) نلتزم بحماية خصوصيتك وبياناتك الشخصية وفقاً لنظام حماية البيانات الشخصية (PDPL) الصادر بالمرسوم الملكي رقم (م/19) وتاريخ 9/2/1443هـ ولائحته التنفيذية.
          </Section>

          <Section id="pdpl" title="2. الإطار القانوني (PDPL)">
            <p className="mb-2">تخضع معالجة بياناتك الشخصية لأحكام نظام حماية البيانات الشخصية السعودي (PDPL) ولائحته التنفيذية. نلتزم بما يلي:</p>
            <ul className="list-disc pr-5 space-y-1">
              <li>عدم جمع بيانات شخصية إلا لأغراض مشروعة ومحددة.</li>
              <li>الحصول على موافقتك الصريحة قبل معالجة البيانات الحساسة.</li>
              <li>تمكينك من ممارسة حقوقك كاملة بموجب النظام.</li>
              <li>الإبلاغ عن أي اختراق للبيانات خلال 72 ساعة.</li>
              <li>تعيين مسؤول حماية بيانات شخصية.</li>
            </ul>
          </Section>

          <Section id="data-collected" title="3. البيانات التي نجمعها">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li><strong>بيانات التسجيل:</strong> الاسم الكامل، رقم الجوال (+966)، البريد الإلكتروني.</li>
              <li><strong>بيانات التحقق:</strong> رقم الهوية/الإقامة، السجل التجاري (اختياري).</li>
              <li><strong>بيانات الملف الشخصي:</strong> المدينة، الصورة الشخصية.</li>
              <li><strong>بيانات الإعلانات:</strong> تفاصيل المشاريع، الصور، المستندات المرفوعة.</li>
              <li><strong>بيانات الاستخدام:</strong> سجل التصفح، التفاعلات، عنوان IP، نوع المتصفح.</li>
              <li><strong>بيانات الصفقات:</strong> تفاصيل التفاوض، الاتفاقيات، سجل المعاملات المالية.</li>
              <li><strong>بيانات الموقع:</strong> الموقع الجغرافي (بموافقتك) لخدمة "بالقرب مني".</li>
            </ul>
          </Section>

          <Section id="legal-basis" title="4. الأساس القانوني للمعالجة">
            نعالج بياناتك الشخصية استناداً إلى:
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li><strong>الموافقة:</strong> موافقتك الصريحة عند التسجيل واستخدام الخدمات.</li>
              <li><strong>تنفيذ العقد:</strong> لتقديم خدمات المنصة المتفق عليها.</li>
              <li><strong>المصلحة المشروعة:</strong> لتحسين الخدمات ومنع الاحتيال وضمان الأمان.</li>
              <li><strong>الالتزام القانوني:</strong> للامتثال للأنظمة واللوائح المعمول بها.</li>
            </ul>
          </Section>

          <Section id="data-usage" title="5. كيف نستخدم بياناتك">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>تقديم خدمات المنصة وتشغيلها وتحسينها.</li>
              <li>التحقق من هوية المستخدمين والحسابات.</li>
              <li>تقديم توصيات ذكية وتحليل الصفقات عبر الذكاء الاصطناعي.</li>
              <li>التواصل معك بشأن حسابك وصفقاتك وإشعاراتك.</li>
              <li>ضمان أمان المنصة والكشف عن الاحتيال.</li>
              <li>الامتثال للمتطلبات القانونية والتنظيمية.</li>
              <li>إرسال إشعارات تسويقية (بموافقتك المسبقة فقط).</li>
            </ul>
          </Section>

          <Section id="ai-data" title="6. الذكاء الاصطناعي والبيانات">
            <p className="mb-2">تستخدم المنصة تقنيات الذكاء الاصطناعي للأغراض التالية:</p>
            <ul className="list-disc pr-5 space-y-1">
              <li>تحليل بيانات الإعلانات وتقييم الصفقات.</li>
              <li>تقديم توصيات وتحليلات استرشادية.</li>
              <li>الكشف عن الأنشطة المشبوهة والاحتيال.</li>
            </ul>
            <p className="mt-2 text-xs bg-muted/30 p-2 rounded-lg">⚠️ لا يتم اتخاذ قرارات آلية تؤثر على حقوقك دون مراجعة بشرية. لا يتم مشاركة بياناتك مع أطراف خارجية لأغراض تدريب نماذج الذكاء الاصطناعي.</p>
          </Section>

          <Section id="data-protection" title="7. حماية البيانات">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>تشفير البيانات أثناء النقل (TLS 1.3) والتخزين (AES-256).</li>
              <li>الوصول مقيّد بصلاحيات محددة وفق مبدأ الحد الأدنى.</li>
              <li>مراجعات أمنية دورية واختبارات اختراق.</li>
              <li>سجلات تدقيق لجميع عمليات الوصول والتعديل.</li>
              <li>نسخ احتياطية مشفرة بشكل منتظم.</li>
            </ul>
          </Section>

          <Section id="data-sharing" title="8. مشاركة البيانات">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li><strong>لا نبيع</strong> بياناتك الشخصية لأي طرف ثالث مطلقاً.</li>
              <li>نشارك بيانات محدودة مع الطرف الآخر في الصفقة لإتمامها (الاسم، رقم التواصل).</li>
              <li>قد نُفصح عن بيانات عند الطلب القانوني من الجهات المختصة السعودية.</li>
              <li>نستخدم مزودي خدمات تقنية (استضافة، بريد، رسائل) ملتزمين بمعايير حماية البيانات.</li>
            </ul>
          </Section>

          <Section id="cross-border" title="9. نقل البيانات عبر الحدود">
            <p>قد يتم معالجة بعض البيانات خارج المملكة العربية السعودية (مثل خدمات الاستضافة السحابية). في هذه الحالات:</p>
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>نتأكد من توفر مستوى حماية كافٍ وفقاً لمتطلبات PDPL.</li>
              <li>نُبرم اتفاقيات حماية بيانات مع مزودي الخدمة.</li>
              <li>نلتزم بالحصول على الموافقات اللازمة من الجهات المختصة.</li>
            </ul>
          </Section>

          <Section id="rights" title="10. حقوقك بموجب PDPL">
            <p className="mb-2">بموجب نظام حماية البيانات الشخصية السعودي، تتمتع بالحقوق التالية:</p>
            <ul className="list-disc pr-5 space-y-1">
              <li><strong>حق الإعلام:</strong> معرفة ما إذا كانت بياناتك تُعالَج والغرض من ذلك.</li>
              <li><strong>حق الوصول:</strong> الاطلاع على بياناتك الشخصية المُخزّنة والحصول على نسخة منها.</li>
              <li><strong>حق التصحيح:</strong> طلب تصحيح البيانات غير الدقيقة أو غير المكتملة.</li>
              <li><strong>حق الحذف:</strong> طلب حذف بياناتك (مع مراعاة الالتزامات القانونية).</li>
              <li><strong>حق سحب الموافقة:</strong> سحب موافقتك على معالجة البيانات في أي وقت.</li>
              <li><strong>حق الاعتراض:</strong> الاعتراض على معالجة بياناتك لأغراض معينة.</li>
              <li><strong>حق نقل البيانات:</strong> طلب نقل بياناتك إلى جهة أخرى بصيغة قابلة للقراءة.</li>
              <li><strong>حق الشكوى:</strong> تقديم شكوى إلى الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا).</li>
            </ul>
            <p className="mt-2 text-xs bg-muted/30 p-2 rounded-lg">لممارسة أي من حقوقك، تواصل معنا عبر: a.almalki@soqtaqbeel.com أو من خلال قسم الدعم. سنستجيب خلال 30 يوماً كحد أقصى.</p>
          </Section>

          <Section id="cookies" title="11. ملفات الارتباط (Cookies)">
            <p className="mb-2">نستخدم ملفات الارتباط للأغراض التالية:</p>
            <ul className="list-disc pr-5 space-y-1">
              <li><strong>ضرورية:</strong> لتشغيل المنصة وتسجيل الدخول وحماية الأمان.</li>
              <li><strong>تحليلية:</strong> لفهم كيفية استخدام المنصة وتحسين الأداء.</li>
              <li><strong>وظيفية:</strong> لتذكّر تفضيلاتك (اللغة، العملة، الوضع الليلي).</li>
            </ul>
            <p className="mt-2">يمكنك التحكم في ملفات الارتباط من خلال بانر الموافقة عند زيارتك الأولى أو من إعدادات متصفحك. رفض ملفات الارتباط غير الضرورية لن يؤثر على الوظائف الأساسية.</p>
          </Section>

          <Section id="retention" title="12. الاحتفاظ بالبيانات">
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>بيانات الحساب: طوال فترة نشاط الحساب + 30 يوماً بعد الحذف.</li>
              <li>بيانات الصفقات والاتفاقيات: 10 سنوات (التزام قانوني تجاري).</li>
              <li>سجلات التدقيق: 30 يوماً للسجلات العادية، دائمة للسجلات الحرجة.</li>
              <li>الإشعارات المقروءة: 30 يوماً ثم يتم حذفها تلقائياً.</li>
              <li>بيانات الجلسات: 7 أيام.</li>
            </ul>
          </Section>

          <Section id="children" title="13. بيانات الأطفال">
            المنصة غير موجهة لمن هم أقل من 18 عاماً. لا نجمع بيانات شخصية من أطفال عمداً. إذا علمنا بجمع بيانات طفل، سنحذفها فوراً.
          </Section>

          <Section id="breach" title="14. إخطار الاختراق">
            في حال حدوث اختراق للبيانات الشخصية يُحتمل أن يؤثر على حقوقك:
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li>سنُخطر الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا) خلال 72 ساعة.</li>
              <li>سنُخطرك مباشرة إذا كان الاختراق يشكل خطراً عالياً على حقوقك.</li>
              <li>سنتخذ الإجراءات التصحيحية اللازمة فوراً.</li>
            </ul>
          </Section>

          <Section id="changes" title="15. التعديلات">
            قد نُحدّث هذه السياسة من وقت لآخر. سنُخطرك بأي تغييرات جوهرية عبر إشعارات المنصة والبريد الإلكتروني قبل 30 يوماً من سريانها. استمرار استخدامك للمنصة بعد التحديث يعني موافقتك على السياسة المُحدّثة.
          </Section>

          <Section id="contact" title="16. التواصل">
            <p>لأي استفسارات حول خصوصية بياناتك أو لممارسة حقوقك:</p>
            <ul className="list-disc pr-5 space-y-1 mt-1">
              <li><strong>مسؤول حماية البيانات:</strong> a.almalki@soqtaqbeel.com</li>
              <li><strong>الهاتف:</strong> 0500668089</li>
              <li><strong>العنوان:</strong> الطائف، المملكة العربية السعودية</li>
              <li><strong>الجهة الرقابية:</strong> الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا) — <a href="https://sdaia.gov.sa" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">sdaia.gov.sa</a></li>
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

export default PrivacyPage;
