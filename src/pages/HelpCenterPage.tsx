import { useState, useMemo } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Search, HelpCircle, Store, Shield, FileText, MessageCircle, Settings } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqCategory {
  id: string;
  label: string;
  icon: typeof HelpCircle;
  items: FaqItem[];
}

const categories: FaqCategory[] = [
  {
    id: "general",
    label: "عام",
    icon: HelpCircle,
    items: [
      { q: "ما هي منصة سوق تقبيل؟", a: "سوق تقبيل هي منصة سعودية متخصصة في عرض وتحليل فرص تقبيل المحلات والمشاريع التجارية. تساعد البائعين على عرض مشاريعهم والمشترين على اكتشاف الفرص المناسبة." },
      { q: "هل المنصة مجانية؟", a: "نعم، التسجيل ونشر الإعلانات مجاني بالكامل. يتم تحصيل عمولة بسيطة فقط عند إتمام الصفقة بنجاح." },
      { q: "كيف أسجل حساب جديد؟", a: "اضغط على 'تسجيل الدخول' في أعلى الصفحة، ثم اختر 'إنشاء حساب'. أدخل بريدك الإلكتروني وكلمة المرور واسمك الكامل." },
      { q: "هل المنصة متاحة على الجوال؟", a: "نعم، يمكنك تثبيت المنصة كتطبيق على جوالك عبر صفحة 'تثبيت التطبيق' من الفوتر. التطبيق يعمل على أجهزة Android وiOS." },
      { q: "ما هي العمولة التي تأخذها المنصة؟", a: "تأخذ المنصة عمولة 1% من قيمة الصفقة المكتملة فقط. لا توجد رسوم مخفية أو اشتراكات شهرية." },
      { q: "هل يمكنني استخدام المنصة من خارج السعودية؟", a: "المنصة متاحة للجميع، لكنها مصممة خصيصاً لسوق المشاريع التجارية في المملكة العربية السعودية." },
    ],
  },
  {
    id: "listings",
    label: "الإعلانات",
    icon: Store,
    items: [
      { q: "كيف أنشئ إعلان جديد؟", a: "سجل دخولك ثم اضغط 'أضف فرصة' من القائمة العلوية. املأ تفاصيل المشروع مثل نوع الصفقة والسعر والموقع والصور." },
      { q: "ما هو مؤشر الشفافية؟", a: "مؤشر الشفافية يقيس مدى اكتمال بيانات الإعلان من 0 إلى 100. كلما أضاف صاحب الإعلان تفاصيل أكثر (صور، مستندات، بيانات مالية) ارتفعت النسبة وزادت ثقة المشتري." },
      { q: "هل يمكنني تعديل إعلاني بعد النشر؟", a: "نعم، يمكنك تعديل إعلانك في أي وقت من لوحة التحكم الخاصة بك. التغييرات تظهر فوراً بعد الحفظ." },
      { q: "كيف أرفع صوراً لإعلاني؟", a: "أثناء إنشاء الإعلان، ستجد قسم الصور حيث يمكنك رفع صور المحل أو المشروع. يُنصح برفع 3 صور على الأقل لزيادة مؤشر الشفافية." },
      { q: "ما هي أنواع التقبيل المتاحة؟", a: "تدعم المنصة عدة أنواع: تقبيل كامل (بسجل تجاري)، تقبيل بدون التزامات سابقة، تقبيل أصول فقط، وتقبيل أصول + تجهيز تشغيلي (بدون سجل تجاري)." },
      { q: "كيف يتم تصنيف إعلاني في نتائج البحث؟", a: "يعتمد الترتيب على عدة عوامل: مؤشر الشفافية، مؤشر ثقة البائع، حداثة الإعلان، واكتمال البيانات. الإعلانات الموثوقة تظهر أولاً." },
      { q: "هل يمكنني حذف إعلاني؟", a: "نعم، يمكنك حذف إعلانك من لوحة التحكم. إذا كانت هناك صفقات نشطة مرتبطة بالإعلان، سيتم إشعارك قبل الحذف." },
    ],
  },
  {
    id: "deals",
    label: "الصفقات",
    icon: FileText,
    items: [
      { q: "كيف أقدم عرض شراء؟", a: "من صفحة تفاصيل الإعلان، اضغط 'تقديم عرض'، حدد السعر المقترح وأضف رسالة اختيارية. سيتم إشعار البائع فوراً." },
      { q: "ماذا يحدث بعد قبول العرض؟", a: "بعد قبول البائع لعرضك، يتم إنشاء صفحة تفاوض خاصة بينكما حيث يمكنكما الاتفاق على التفاصيل النهائية وتوقيع الاتفاقية." },
      { q: "هل يمكنني إلغاء عرضي؟", a: "نعم، يمكنك سحب عرضك في أي وقت قبل قبول البائع من خلال لوحة التحكم الخاصة بك." },
      { q: "كيف يتم إتمام الصفقة؟", a: "بعد الاتفاق على جميع البنود، يقوم الطرفان بالتوقيع الرقمي على الاتفاقية. يتم توثيق كل شيء في المنصة مع إصدار PDF للاتفاقية." },
      { q: "ماذا لو لم يلتزم الطرف الآخر؟", a: "المنصة توفر نظام تقييمات وسجل شفافية لكل مستخدم. أي خلاف يُسجّل في ملف المستخدم ويؤثر على مؤشر الثقة الخاص به." },
      { q: "هل يمكنني تقديم أكثر من عرض على نفس الإعلان؟", a: "لا، يمكنك تقديم عرض واحد فقط على كل إعلان. يمكنك تعديل عرضك أو سحبه وتقديم عرض جديد." },
    ],
  },
  {
    id: "negotiation",
    label: "التفاوض",
    icon: MessageCircle,
    items: [
      { q: "كيف يعمل نظام التفاوض؟", a: "بعد إنشاء الصفقة، يتوفر لكما محادثة خاصة آمنة مع مساعد ذكي يقترح حلول وبنود عادلة لكلا الطرفين." },
      { q: "هل يمكنني إرفاق مستندات في المحادثة؟", a: "نعم، يمكنك إرفاق صور ومستندات داخل محادثة التفاوض لمشاركة معلومات إضافية مع الطرف الآخر." },
      { q: "ما هي الاتفاقية الرقمية؟", a: "هي وثيقة رسمية يتم إنشاؤها تلقائياً بناءً على بنود التفاوض المتفق عليها. يوقّعها الطرفان رقمياً لتوثيق الاتفاق." },
      { q: "ما دور المساعد الذكي في التفاوض؟", a: "المساعد الذكي يقدم اقتراحات بناءً على بيانات الصفقة، مثل تقييم السعر العادل، اقتراح بنود الاتفاقية، وتنبيهك لأي مخاطر محتملة." },
      { q: "هل المحادثات سرية؟", a: "نعم، جميع المحادثات بين الأطراف مشفرة ولا يطّلع عليها أي طرف ثالث. يتم حفظها كسجل مرجعي للصفقة فقط." },
    ],
  },
  {
    id: "trust",
    label: "الثقة والأمان",
    icon: Shield,
    items: [
      { q: "ما هو مؤشر الثقة (Trust Score)؟", a: "هو تقييم ديناميكي من 0 إلى 100 يُحسب بناءً على عدة عوامل: الصفقات المكتملة، التزام السداد، توثيق الحساب، تقييمات المشترين، وعمر الحساب." },
      { q: "كيف أوثّق حسابي؟", a: "يمكنك توثيق حسابك عبر التحقق من رقم الجوال (OTP) من لوحة التحكم. التوثيق يرفع مؤشر الثقة ويظهر شارة 'موثق' على ملفك." },
      { q: "ما هي شارات البائع؟", a: "شارات تُمنح تلقائياً بناءً على أدائك: 'بائع موثوق' (ثقة 70+)، 'ملتزم بالسداد' (عمولات مدفوعة)، 'بيانات مكتملة' (توثيق كامل)، 'صفقات ناجحة' (3+ صفقات)." },
      { q: "كيف أبلّغ عن إعلان مخالف؟", a: "من صفحة تفاصيل الإعلان، اضغط على أيقونة التبليغ واختر سبب البلاغ. فريقنا سيراجع البلاغ خلال 24 ساعة." },
      { q: "هل بياناتي آمنة في المنصة؟", a: "نعم، نستخدم تشفير البيانات ومعايير أمان متقدمة. لمزيد من التفاصيل، اطّلع على سياسة الخصوصية الخاصة بنا." },
      { q: "ما هو فحص الصفقة (Deal Check)؟", a: "هو تحليل آلي بالذكاء الاصطناعي يفحص بيانات الإعلان ويقدم تقييماً شاملاً للمخاطر والفرص قبل اتخاذ قرار الشراء." },
    ],
  },
  {
    id: "account",
    label: "الحساب",
    icon: Settings,
    items: [
      { q: "كيف أغيّر كلمة المرور؟", a: "اذهب إلى صفحة تسجيل الدخول واضغط 'نسيت كلمة المرور'. سيُرسل رابط إعادة التعيين إلى بريدك الإلكتروني." },
      { q: "كيف أتواصل مع الدعم؟", a: "يمكنك التواصل معنا عبر صفحة 'تواصل معنا' أو من خلال المساعد الذكي الموجود في أسفل الصفحة." },
      { q: "كيف أعدّل بياناتي الشخصية؟", a: "من لوحة التحكم، يمكنك تعديل اسمك، رقم جوالك، مدينتك، وصورتك الشخصية في أي وقت." },
      { q: "هل يمكنني حذف حسابي؟", a: "نعم، يمكنك طلب حذف حسابك من إعدادات الأمان في لوحة التحكم. سيتم حذف بياناتك الشخصية مع الاحتفاظ بسجلات الصفقات المكتملة كمتطلب قانوني." },
      { q: "كيف أفعّل الإشعارات؟", a: "الإشعارات مفعّلة تلقائياً عند إنشاء حسابك. يمكنك رؤية جميع الإشعارات من أيقونة الجرس في أعلى الصفحة." },
    ],
  },
];

const HelpCenterPage = () => {
  useSEO({ title: "مركز المساعدة", description: "إجابات على الأسئلة الشائعة حول منصة سوق تقبيل", canonical: "/help" });

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("general");

  const filtered = useMemo(() => {
    if (!search.trim()) return categories.find(c => c.id === activeCategory)?.items || [];
    const q = search.toLowerCase();
    const results: FaqItem[] = [];
    categories.forEach(cat => {
      cat.items.forEach(item => {
        if (item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)) {
          results.push(item);
        }
      });
    });
    return results;
  }, [search, activeCategory]);

  return (
    <div className="container max-w-4xl py-10 space-y-8" dir="rtl">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold text-foreground">مركز المساعدة</h1>
        <p className="text-sm text-muted-foreground">ابحث عن إجابات لأسئلتك أو تصفح الأقسام</p>
      </div>

      {/* Search */}
      <div className="relative max-w-lg mx-auto">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="ابحث في الأسئلة الشائعة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-border/50 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Category chips */}
      {!search.trim() && (
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <cat.icon size={13} />
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* FAQ items */}
      <Accordion type="single" collapsible className="space-y-2">
        {filtered.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border border-border/30 rounded-xl px-4 overflow-hidden bg-card">
            <AccordionTrigger className="text-sm text-foreground hover:no-underline py-3.5">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">لم يتم العثور على نتائج لبحثك</p>
        )}
      </Accordion>

      {/* Contact CTA */}
      <div className="text-center bg-muted/30 rounded-2xl p-6 border border-border/20">
        <p className="text-sm text-muted-foreground mb-3">لم تجد إجابة لسؤالك؟</p>
        <a
          href="/contact"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <MessageCircle size={14} />
          تواصل معنا
        </a>
      </div>
    </div>
  );
};

export default HelpCenterPage;
